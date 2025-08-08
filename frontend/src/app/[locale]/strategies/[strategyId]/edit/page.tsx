"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Loader2, Save, ArrowLeft } from "lucide-react";

import { useStrategyState } from "@/hooks/useStrategyState";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import {
  Strategy,
  TargetSlot,
  TpslLogic,
  TargetCoin,
  PositionRules,
  LogicBlock,
  IndicatorMetadata,
  IndicatorValue,
  LogicOperator,
  StrategyType,
} from "@/types/strategy";
import apiClient from "@/lib/apiClient";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { IndicatorHub } from "@/components/domain/strategy/IndicatorHub";
import { StrategyBuilderCanvas } from "@/components/domain/strategy/StrategyBuilderCanvas";
import { TpslForm } from "@/components/domain/strategy/TpslForm";
import { TargetCoinForm } from "@/components/domain/strategy/TargetCoinForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Separator } from "@/components/ui/Separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

// Zod 스키마, API 페이로드, createLogicBlock 헬퍼는 변경 없음
const formSchema = z.object({
  name: z
    .string()
    .min(3, "전략 이름은 최소 3글자 이상")
    .max(100, "전략 이름은 100자 이내"),
  description: z.string().max(500, "설명은 500자 이내").optional().nullable(),
  takeProfitPctEnabled: z.boolean().default(false),
  takeProfitPct: z.number().min(0.1).optional().nullable(),
  stopLossPctEnabled: z.boolean().default(false),
  stopLossPct: z.number().min(0.1).optional().nullable(),
  atrEnabled: z.boolean().default(false),
  atrStopLossMultiplier: z.number().min(0.1).optional().nullable(),
  atrTakeProfitMultiplier: z.number().min(0.1).optional().nullable(),
  atrPeriod: z.number().int().min(1).optional().nullable(),
});
type StrategyFormValues = z.infer<typeof formSchema>;
interface StrategyUpdatePayload {
  name: string;
  description: string | null | undefined;
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  tpslLogic: TpslLogic | null;
  targetCoins: TargetCoin[];
}
const createLogicBlock = (
  indicator: IndicatorMetadata,
  logicType: string,
  allowedTimeframes: string[]
): LogicBlock => {
  const availableTimeframes = indicator.supportedTimeframes.filter((tf) =>
    allowedTimeframes.includes(tf)
  );
  const baseIndicatorValue: IndicatorValue = {
    indicatorKey: indicator.key,
    outputs: [indicator.outputs[0].key],
    values: indicator.parameters.reduce(
      (acc, param) => ({ ...acc, [param.key]: param.default }),
      {}
    ),
    timeframe: availableTimeframes.length > 0 ? availableTimeframes[0] : "1h",
  };
  const newBlockId = nanoid();
  switch (logicType) {
    case "comparison":
      return {
        id: newBlockId,
        type: "comparison",
        operandA: baseIndicatorValue,
        operator: ">",
        operandB: 0,
      };
    case "crossover":
      return {
        id: newBlockId,
        type: "crossover",
        mainLine: baseIndicatorValue,
        signalLine: 0,
        crossDirection: "above",
      };
    case "state":
      return {
        id: newBlockId,
        type: "state",
        indicator: baseIndicatorValue,
        lowerBound: 30,
        upperBound: 70,
        stateAction: "within",
      };
    case "trend_signal":
      return {
        id: newBlockId,
        type: "trend_signal",
        indicator: baseIndicatorValue,
        signal: "buy",
      };
    case "channel":
      return {
        id: newBlockId,
        type: "channel",
        indicator: baseIndicatorValue,
        channelZone: "upper",
        action: "enter",
      };
    case "divergence":
      return {
        id: newBlockId,
        type: "divergence",
        indicator: baseIndicatorValue,
        divergenceType: "bullish",
      };
    case "pattern":
      return {
        id: newBlockId,
        type: "pattern",
        patternKey: "doji",
        direction: "any",
      };
    default:
      return {
        id: newBlockId,
        type: "comparison",
        operandA: baseIndicatorValue,
        operator: ">",
        operandB: 0,
      };
  }
};

// -----------------------------------------------------------------------------
// ✨ 1. 실제 폼 UI와 로직을 담당할 내부 컴포넌트 분리
// -----------------------------------------------------------------------------
function StrategyEditForm({ initialStrategy }: { initialStrategy: Strategy }) {
  const t = useTranslations("StrategyBuilder");
  const router = useRouter();
  const queryClient = useQueryClient();
  const strategyId = initialStrategy.id;

  const strategyState = useStrategyState();
  const { setStrategy } = strategyState;
  const { allowedTimeframes } = useUserSubscription();

  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot>(null);
  const [hubSelectionMode, setHubSelectionMode] = useState<
    "full" | "indicatorOnly"
  >("full");

  const formMethods = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    values: {
      name: initialStrategy.name,
      description: initialStrategy.description,
      takeProfitPctEnabled: !!initialStrategy.tpslLogic?.takeProfitPct,
      takeProfitPct: initialStrategy.tpslLogic?.takeProfitPct,
      stopLossPctEnabled: !!initialStrategy.tpslLogic?.stopLossPct,
      stopLossPct: initialStrategy.tpslLogic?.stopLossPct,
      atrEnabled: !!initialStrategy.tpslLogic?.atrPeriod,
      atrStopLossMultiplier: initialStrategy.tpslLogic?.atrStopLossMultiplier,
      atrTakeProfitMultiplier:
        initialStrategy.tpslLogic?.atrTakeProfitMultiplier,
      atrPeriod: initialStrategy.tpslLogic?.atrPeriod,
    },
  });

  useEffect(() => {
    setStrategy({
      longEntryRules: initialStrategy.longEntryRules,
      longExitRules: initialStrategy.longExitRules,
      shortEntryRules: initialStrategy.shortEntryRules,
      shortExitRules: initialStrategy.shortExitRules,
      targetCoins: initialStrategy.targetCoins,
    });
  }, [initialStrategy, setStrategy]);

  const updateStrategyMutation = useMutation({
    mutationFn: async (values: StrategyFormValues) => {
      const tpslLogic: TpslLogic | null =
        values.takeProfitPctEnabled ||
        values.stopLossPctEnabled ||
        values.atrEnabled
          ? {
              takeProfitPct: values.takeProfitPctEnabled
                ? values.takeProfitPct
                : null,
              stopLossPct: values.stopLossPctEnabled
                ? values.stopLossPct
                : null,
              atrStopLossMultiplier: values.atrEnabled
                ? values.atrStopLossMultiplier
                : null,
              atrTakeProfitMultiplier: values.atrEnabled
                ? values.atrTakeProfitMultiplier
                : null,
              atrPeriod: values.atrEnabled ? values.atrPeriod : null,
            }
          : null;
      const payload: Partial<StrategyUpdatePayload> = {
        name: values.name,
        description: values.description,
        longEntryRules: strategyState.longEntryRules,
        longExitRules: strategyState.longExitRules,
        shortEntryRules: strategyState.shortEntryRules,
        shortExitRules: strategyState.shortExitRules,
        tpslLogic: tpslLogic,
        targetCoins: strategyState.targetCoins,
      };
      const { data } = await apiClient.put(
        `/strategies/${strategyId}`,
        payload
      );
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(t("form.saveSuccess", { strategyName: data.name }));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy", strategyId] });
      router.push("/strategies");
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      toast.error(
        t("form.saveError", {
          error:
            typeof detail === "string" ? detail : t("form.saveFailedGeneric"),
        })
      );
    },
  });

  const onSubmit = (values: StrategyFormValues) => {
    updateStrategyMutation.mutate(values);
  };

  const handleAddTopLevelRule = (ruleType: StrategyType) => {
    setCurrentTarget({ type: "top-level", ruleType });
    setHubSelectionMode("full");
    setIsHubOpen(true);
  };
  const handleTriggerNestedAddRule = (
    ruleType: StrategyType,
    parentId: string,
    as: LogicOperator
  ) => {
    setCurrentTarget({ type: "nested-add", ruleType, parentId, as });
    setHubSelectionMode("full");
    setIsHubOpen(true);
  };
  const handleTriggerOperandHub = (
    ruleType: StrategyType,
    blockId: string,
    operandKey: string
  ) => {
    setCurrentTarget({ type: "operand", ruleType, blockId, operandKey });
    setHubSelectionMode("indicatorOnly");
    setIsHubOpen(true);
  };
  const handleIndicatorSelect = (
    indicator: IndicatorMetadata,
    logicType: string
  ) => {
    if (!currentTarget) return;
    if (currentTarget.type === "operand") {
      const newIndicatorValue: IndicatorValue = {
        indicatorKey: indicator.key,
        outputs: [indicator.outputs[0].key],
        values: indicator.parameters.reduce(
          (acc, param) => ({ ...acc, [param.key]: param.default }),
          {}
        ),
        timeframe: allowedTimeframes[0],
      };
      strategyState.updateRuleLogic(
        currentTarget.ruleType,
        currentTarget.blockId,
        currentTarget.operandKey,
        newIndicatorValue
      );
    } else {
      const newBlock = createLogicBlock(
        indicator,
        logicType,
        allowedTimeframes
      );
      if (currentTarget.type === "top-level") {
        strategyState.addRule(currentTarget.ruleType, newBlock, null);
      } else if (currentTarget.type === "nested-add") {
        strategyState.addRule(
          currentTarget.ruleType,
          newBlock,
          currentTarget.parentId,
          currentTarget.as
        );
      }
    }
    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  return (
    <>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
        selectionMode={hubSelectionMode}
      />
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <FormProvider {...formMethods}>
          <form
            onSubmit={formMethods.handleSubmit(onSubmit)}
            className="space-y-8"
          >
            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/strategies")}
                disabled={updateStrategyMutation.isPending}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("form.goBackButton")}
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center">
                전략 수정
              </h1>
              <Button
                type="submit"
                disabled={updateStrategyMutation.isPending}
                className="min-w-[120px]"
              >
                {updateStrategyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("form.saveButton")}
                  </>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
              <div className="flex flex-col gap-8 lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("form.basicInfoTitle")}</CardTitle>
                    <CardDescription>
                      {t("form.basicInfoDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={formMethods.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.nameLabel")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={formMethods.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.descriptionLabel")}</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-col gap-8 lg:col-span-2">
                <TargetCoinForm
                  targetCoins={strategyState.targetCoins}
                  setTargetCoins={strategyState.setTargetCoins}
                />
                <TpslForm form={formMethods} />
              </div>
            </div>
            <Separator />
            <div>
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                {t("rulesTitle")}
              </h2>
              <StrategyBuilderCanvas
                longEntryRules={strategyState.longEntryRules}
                longExitRules={strategyState.longExitRules}
                shortEntryRules={strategyState.shortEntryRules}
                shortExitRules={strategyState.shortExitRules}
                onAddTopLevelRule={handleAddTopLevelRule}
                onTriggerNestedAddRule={handleTriggerNestedAddRule}
                onTriggerOperandHub={handleTriggerOperandHub}
                onUpdateRule={strategyState.updateRule}
                onDeleteRule={strategyState.deleteRule}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// ✨ 2. 페이지의 최상위 컴포넌트: 데이터 로딩만 책임
// -----------------------------------------------------------------------------
export default function EditStrategyPage({
  params,
}: {
  params: { strategyId: string };
}) {
  const strategyId = params.strategyId;

  const {
    data: initialStrategy,
    isLoading,
    isError,
    status, // useQuery의 현재 상태를 더 자세히 보기 위해 status를 추가합니다.
  } = useQuery<Strategy, Error>({
    queryKey: ["strategy", strategyId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/strategies/${strategyId}`);
      return data;
    },
    enabled: !!strategyId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl p-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !initialStrategy) {
    return (
      <div className="container mx-auto p-8 text-center text-destructive">
        전략을 불러오는 데 실패했습니다.
      </div>
    );
  }

  return (
    <AuthGuard>
      <StrategyEditForm initialStrategy={initialStrategy} />
    </AuthGuard>
  );
}
