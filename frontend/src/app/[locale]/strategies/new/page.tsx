"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";

// --- 커스텀 훅 및 타입 임포트 ---
import { useStrategyState } from "@/hooks/useStrategyState";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { IndicatorMetadata } from "@/lib/indicators";
import {
  StrategyType,
  LogicBlock,
  TpslLogic,
  TargetCoin,
  PositionRules,
  TargetSlot,
  IndicatorValue,
  LogicOperator,
} from "@/types/strategy";
import apiClient from "@/lib/apiClient";

// --- UI 및 도메인 컴포넌트 임포트 ---
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

// --- Zod 폼 스키마 정의 ---
const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: "전략 이름은 최소 3글자 이상이어야 합니다." })
    .max(100, { message: "전략 이름은 100자 이내여야 합니다." }),
  description: z
    .string()
    .max(500, { message: "설명은 500자 이내여야 합니다." })
    .optional()
    .nullable(),
});

type StrategyFormValues = z.infer<typeof formSchema>;

// --- API 페이로드 타입 정의 ---
interface StrategyCreatePayload extends StrategyFormValues {
  long_entry_rules: PositionRules | null;
  long_exit_rules: PositionRules | null;
  short_entry_rules: PositionRules | null;
  short_exit_rules: PositionRules | null;
  tpsl_logic: TpslLogic | null;
  target_coins: TargetCoin[];
  is_public: boolean;
}

// --- 헬퍼 함수: 새로운 LogicBlock 생성 ---
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
        operand_a: baseIndicatorValue,
        operator: ">",
        operand_b: 0,
      };
    case "crossover":
      return {
        id: newBlockId,
        type: "crossover",
        main_line: baseIndicatorValue,
        signal_line: 0,
        cross_direction: "above",
      };
    case "state":
      return {
        id: newBlockId,
        type: "state",
        indicator: baseIndicatorValue,
        lower_bound: 30,
        upper_bound: 70,
        state_action: "within",
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
        channel_zone: "upper",
        action: "enter",
      };
    case "divergence":
      return {
        id: newBlockId,
        type: "divergence",
        indicator: baseIndicatorValue,
        divergence_type: "bullish",
      };
    case "pattern":
      return {
        id: newBlockId,
        type: "pattern",
        pattern_key: "doji",
        direction: "any",
      };
    default:
      return {
        id: newBlockId,
        type: "comparison",
        operand_a: baseIndicatorValue,
        operator: ">",
        operand_b: 0,
      };
  }
};

// --- 메인 페이지 컴포넌트 ---
export default function NewStrategyPage() {
  const t = useTranslations("StrategyBuilder");
  const router = useRouter();
  const queryClient = useQueryClient();

  const strategyState = useStrategyState();
  const { allowedTimeframes } = useUserSubscription();
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot>(null);
  const [hubSelectionMode, setHubSelectionMode] = useState<
    "full" | "indicatorOnly"
  >("full");

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  // --- 이벤트 핸들러 ---
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
      const availableTimeframes = indicator.supportedTimeframes.filter((tf) =>
        allowedTimeframes.includes(tf)
      );
      const newIndicatorValue: IndicatorValue = {
        indicatorKey: indicator.key,
        outputs: [indicator.outputs[0].key],
        values: indicator.parameters.reduce(
          (acc, param) => ({ ...acc, [param.key]: param.default }),
          {}
        ),
        timeframe:
          availableTimeframes.length > 0 ? availableTimeframes[0] : "1h",
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

  // --- API Mutation ---
  const createStrategyMutation = useMutation({
    mutationFn: async (values: StrategyFormValues) => {
      const payload: StrategyCreatePayload = {
        ...values,
        ...strategyState,
        is_public: false,
      };
      const { data } = await apiClient.post("/strategies", payload);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(t("form.saveSuccess", { strategyName: data.name }));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
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
    if (!strategyState.longEntryRules && !strategyState.shortEntryRules) {
      return toast.error(t("form.rulesRequired"));
    }
    if (strategyState.targetCoins.length === 0) {
      return toast.error(t("targetCoinForm.noTickerError"));
    }
    createStrategyMutation.mutate(values);
  };

  return (
    <AuthGuard>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
        selectionMode={hubSelectionMode}
      />
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={createStrategyMutation.isPending}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("form.goBackButton")}
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center">
                {t("title")}
              </h1>
              <Button
                type="submit"
                disabled={createStrategyMutation.isPending}
                className="min-w-[120px]"
              >
                {createStrategyMutation.isPending ? (
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
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.nameLabel")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("form.namePlaceholder")}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.descriptionLabel")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("form.descriptionPlaceholder")}
                              {...field}
                              value={field.value ?? ""}
                            />
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
                <TpslForm
                  tpslLogic={strategyState.tpslLogic}
                  setTpslLogic={strategyState.setTpslLogic}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                {t("rulesTitle")}
              </h2>
              <StrategyBuilderCanvas
                {...strategyState}
                onAddTopLevelRule={handleAddTopLevelRule}
                onTriggerNestedAddRule={handleTriggerNestedAddRule}
                onTriggerOperandHub={handleTriggerOperandHub}
                onUpdateRule={strategyState.updateRule}
                onDeleteRule={strategyState.deleteRule}
              />
            </div>
          </form>
        </Form>
      </div>
    </AuthGuard>
  );
}
