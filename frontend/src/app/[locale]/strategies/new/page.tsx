// file: frontend/src/app/[locale]/strategies/new/page.tsx

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { IndicatorHub } from "@/components/domain/strategy/IndicatorHub";
import { StrategyBuilderCanvas } from "@/components/domain/strategy/StrategyBuilderCanvas";
import { IndicatorMetadata, INDICATOR_METADATA } from "@/lib/indicators";
import { useStrategyState } from "@/hooks/useStrategyState";
import {
  StrategyType,
  LogicBlock,
  ComparisonLogic,
  CrossoverLogic,
  StateLogic,
  TrendSignalLogic,
  ChannelLogic,
  DivergenceLogic,
  PatternLogic,
  TpslLogic,
  TargetCoin,
  PositionRules,
  TargetSlot,
  IndicatorValue,
} from "@/types/strategy";
import { nanoid } from "nanoid";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/Separator";
import { TpslForm } from "@/components/domain/strategy/TpslForm";
import { TargetCoinForm } from "@/components/domain/strategy/TargetCoinForm";

// --- 폼 스키마 정의 (Zod) ---
const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: "전략 이름은 최소 3글자 이상이어야 합니다." })
    .max(100, { message: "전략 이름은 100자 이내여야 합니다." }),
  description: z
    .string()
    .max(500, { message: "설명은 500자 이내여야 합니다." })
    .optional(),
});

type StrategyFormValues = z.infer<typeof formSchema>;

interface StrategyCreatePayload extends StrategyFormValues {
  long_entry_rules?: PositionRules;
  long_exit_rules?: PositionRules;
  short_entry_rules?: PositionRules;
  short_exit_rules?: PositionRules;
  tpsl_logic?: TpslLogic;
  target_coins?: TargetCoin[];
  is_public: boolean;
}

interface StrategyResponse {
  id: number;
  author_id: number;
  name: string;
  description?: string | null;
  long_entry_rules?: PositionRules;
  long_exit_rules?: PositionRules;
  short_entry_rules?: PositionRules;
  short_exit_rules?: PositionRules;
  tpsl_logic?: TpslLogic;
  target_coins?: TargetCoin[];
  is_public: boolean;
  paid_feature_level: "basic" | "trader" | "pro";
  created_at: string;
  updated_at?: string | null;
}

// --- 새로운 LogicBlock을 생성하는 헬퍼 함수 ---
const createLogicBlock = (
  indicator: IndicatorMetadata,
  logicType: string
): LogicBlock => {
  const baseIndicatorValue: IndicatorValue = {
    indicatorKey: indicator.key,
    outputs: indicator.outputs.map((o) => o.key),
    values: indicator.parameters.reduce((acc, param) => {
      acc[param.key] = param.default;
      return acc;
    }, {} as Record<string, any>),
    timeframe: indicator.supportedTimeframes[0],
  };

  const newBlockId = nanoid();

  switch (logicType) {
    case "comparison":
      return {
        id: newBlockId,
        type: "comparison",
        operand_a: baseIndicatorValue,
        operator: "==",
        operand_b: 0,
      } as ComparisonLogic;
    case "crossover":
      return {
        id: newBlockId,
        type: "crossover",
        main_line: baseIndicatorValue,
        cross_direction: "above",
        signal_line: baseIndicatorValue, // 초기값으로 지표A와 동일하게 설정
      } as CrossoverLogic;
    case "state":
      return {
        id: newBlockId,
        type: "state",
        indicator: baseIndicatorValue,
        lower_bound: 30, // 예시 초기값
        upper_bound: 70, // 예시 초기값
        state_action: "within",
      } as StateLogic;
    case "trend_signal":
      return {
        id: newBlockId,
        type: "trend_signal",
        indicator: baseIndicatorValue,
        signal: "buy",
      } as TrendSignalLogic;
    case "channel":
      return {
        id: newBlockId,
        type: "channel",
        indicator: baseIndicatorValue,
        channel_zone: "upper",
        action: "enter",
      } as ChannelLogic;
    case "divergence":
      return {
        id: newBlockId,
        type: "divergence",
        indicator: baseIndicatorValue,
        divergence_type: "bullish",
      } as DivergenceLogic;
    case "pattern":
      return {
        id: newBlockId,
        type: "pattern",
        pattern_key: "doji",
        direction: "bullish",
      } as PatternLogic;
    default:
      throw new Error(`Unsupported logic type: ${logicType}`);
  }
};

export default function NewStrategyPage() {
  const t = useTranslations("StrategyBuilder");
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    longEntryRules,
    longExitRules,
    shortEntryRules,
    shortExitRules,
    tpslLogic,
    targetCoins,
    addRule,
    deleteRule,
    updateRule,
    updateRuleLogic,
    setTpslLogic,
    setTargetCoins,
  } = useStrategyState();

  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot | null>(null);

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleAddTopLevelRuleClick = (ruleType: StrategyType) => {
    setCurrentTarget({
      ruleType,
      blockId: nanoid(),
      logicType: "comparison",
      slotKey: "top-level",
    });
    setIsHubOpen(true);
  };

  const handleSlotClick = (
    ruleType: StrategyType,
    blockId: string,
    logicType: LogicBlock["type"],
    slotKey: string
  ) => {
    setCurrentTarget({ ruleType, blockId, logicType, slotKey });
    setIsHubOpen(true);
  };

  const handleIndicatorSelect = (
    indicator: IndicatorMetadata,
    logicType: string
  ) => {
    if (!currentTarget) return;

    const newBlock = createLogicBlock(indicator, logicType);

    if (currentTarget.slotKey === "top-level") {
      addRule(currentTarget.ruleType, newBlock, null, "OR");
    } else {
      updateRuleLogic(
        currentTarget.ruleType,
        currentTarget.blockId,
        currentTarget.slotKey,
        newBlock
      );
    }

    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  const createStrategyMutation = useMutation<
    StrategyResponse,
    Error,
    StrategyFormValues
  >({
    mutationFn: async (values) => {
      const payload: StrategyCreatePayload = {
        name: values.name,
        description: values.description,
        long_entry_rules: longEntryRules || undefined,
        long_exit_rules: longExitRules || undefined,
        short_entry_rules: shortEntryRules || undefined,
        short_exit_rules: shortExitRules || undefined,
        tpsl_logic: tpslLogic || undefined,
        target_coins: targetCoins || undefined,
        is_public: false,
      };
      const { data } = await apiClient.post("/strategies", payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(t("form.saveSuccess", { strategyName: data.name }));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
      form.reset();
      router.push("/strategies");
    },
    onError: (error) => {
      let displayMessage = t("form.saveFailedGeneric");
      const apiError = error as any;

      if (
        apiError.response &&
        apiError.response.data &&
        apiError.response.data.detail
      ) {
        if (Array.isArray(apiError.response.data.detail)) {
          const validationErrors = apiError.response.data.detail
            .map((err: any) => {
              const field =
                err.loc && err.loc.length > 1 ? err.loc[1] : "unknown field";
              return `${field}: ${err.msg}`;
            })
            .join(", ");
          displayMessage = `${t(
            "form.validationErrorPrefix"
          )}: ${validationErrors}`;
        } else if (typeof apiError.response.data.detail === "string") {
          displayMessage = apiMessage(apiError.response.data.detail);
        }
      } else {
        displayMessage = error.message;
      }

      toast.error(t("form.saveError", { error: displayMessage }));
      console.error("Strategy save failed:", displayMessage, error);
    },
  });

  const onSubmit = (values: StrategyFormValues) => {
    if (
      !longEntryRules &&
      !longExitRules &&
      !shortEntryRules &&
      !shortExitRules
    ) {
      toast.error(t("form.rulesRequired"));
      return;
    }
    createStrategyMutation.mutate(values);
  };

  return (
    <AuthGuard>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
      />
      <div className="p-4"></div>
      <div className="container mx-auto max-w-3xl p-4">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="h-10"
            disabled={createStrategyMutation.isPending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("form.goBackButton")}
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <div className="w-10"></div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 전략 이름 입력 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {t("form.nameLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("form.namePlaceholder")}
                      {...field}
                      className="h-10 rounded-md"
                      disabled={createStrategyMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* 전략 설명 입력 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {t("form.descriptionLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("form.descriptionPlaceholder")}
                      {...field}
                      className="h-10 rounded-md"
                      disabled={createStrategyMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 전략 빌더 캔버스 (규칙 시각화 및 편집) */}
            <div className="mt-6">
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {t("rulesTitle")}
              </h3>
              <StrategyBuilderCanvas
                longEntryRules={longEntryRules}
                longExitRules={longExitRules}
                shortEntryRules={shortEntryRules}
                shortExitRules={shortExitRules}
                onAddRule={addRule}
                onDeleteRule={deleteRule}
                onUpdateRule={updateRule}
                onUpdateRuleLogic={updateRuleLogic}
                onSlotClick={handleSlotClick}
                onAddTopLevelRuleClick={handleAddTopLevelRuleClick}
              />
            </div>

            <Separator className="my-8" />

            {/* TP/SL 설정 폼 */}
            <TpslForm tpslLogic={tpslLogic} setTpslLogic={setTpslLogic} />

            <Separator className="my-8" />

            {/* 타겟 코인 설정 폼 */}
            <TargetCoinForm
              targetCoins={targetCoins}
              setTargetCoins={setTargetCoins}
            />

            {/* 저장 버튼 */}
            <Button
              type="submit"
              className="w-fit h-10 px-6 rounded-md"
              disabled={createStrategyMutation.isPending}
            >
              {createStrategyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("form.savingStrategy")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("form.saveButton")}
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </AuthGuard>
  );
}

function apiMessage(message: string): string {
  if (message.includes("Strategy with this name already exists")) {
    return "이미 같은 이름의 전략이 존재합니다. 다른 이름을 사용해주세요.";
  }
  return message;
}
