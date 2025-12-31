// file: frontend/src/components/domain/strategy/RuleBlock.tsx

"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LogicBlock,
  AllLogicBlockKeys,
  RuleBlockProps,
  ComparisonLogic,
  CrossoverLogic,
  StateLogic,
  TrendSignalLogic,
  ChannelLogic,
  DivergenceLogic,
  PatternLogic,
  AISignalLogic,
  IndicatorValue,
} from "@/types/strategy";
import {
  ArrowRight,
  MoreVertical,
  Trash2,
  CornerDownRight,
  GitCompareArrows,
  TrendingUp,
  BarChart,
  Shuffle,
  Waves,
  CandlestickChart,
  Brain,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScrollArea, ScrollBar } from "@/components/ui/ScrollArea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { OperandSlot } from "./OperandSlot";

import { useIndicatorStore } from "@/store/indicatorStore";
import { IndicatorMetadata } from "@/types/indicator";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";

const LOGIC_TYPE_METADATA: {
  [key in LogicBlock["type"]]: { icon: React.ElementType; labelKey: string };
} = {
  comparison: { icon: GitCompareArrows, labelKey: "comparison" },
  crossover: { icon: TrendingUp, labelKey: "crossover" },
  state: { icon: BarChart, labelKey: "state" },
  trend_signal: { icon: Shuffle, labelKey: "trend_signal" },
  channel: { icon: Waves, labelKey: "channel" },
  divergence: { icon: GitCompareArrows, labelKey: "divergence" },
  pattern: { icon: CandlestickChart, labelKey: "pattern" },
  ai_signal: { icon: Brain, labelKey: "ai_signal" },
};

// 헬퍼 함수: 규칙 블록에서 현재 사용 중인 지표 객체를 추출
const getCurrentIndicator = (block: LogicBlock): IndicatorValue | null => {
  const possibleIndicatorKeys = ["indicator", "operandA", "mainLine"];
  for (const key of possibleIndicatorKeys) {
    const value = (block as any)[key];
    if (value && typeof value === "object" && "indicatorKey" in value) {
      return value;
    }
  }
  return null;
};

export function RuleBlock({
  item,
  onUpdate,
  onDelete,
  onTriggerAddRule,
  onTriggerOperandHub,
  onTriggerReplaceBlock,
}: RuleBlockProps) {
  const t = useTranslations("RuleBlock");
  const tLogic = useTranslations("StrategyBuilder.logic");

  // 전역 스토어에서 최신 지표 메타데이터를 가져옵니다.
  const indicatorMetadata = useIndicatorStore((state) => state.metadata);

  const [isMenuOpen, setMenuOpen] = useState(false);

  const CurrentLogicIcon =
    LOGIC_TYPE_METADATA[item.type]?.icon || GitCompareArrows;

  const supportedLogics = useMemo(() => {
    const currentIndicator = getCurrentIndicator(item);
    if (item.type === "pattern") return ["pattern"];
    if (item.type === "ai_signal") return ["ai_signal"]; // AI 모델은 ai_signal만 지원
    if (!currentIndicator) return Object.keys(LOGIC_TYPE_METADATA);

    // 전역 스토어의 메타데이터를 사용합니다.
    const metadata = indicatorMetadata.find(
      (ind) => ind.key === currentIndicator.indicatorKey
    );

    return metadata ? metadata.supportedLogics : [];
  }, [item, indicatorMetadata]);

  const handleUpdateField = (field: AllLogicBlockKeys, value: any) => {
    onUpdate(item.id, { ...item, [field as any]: value });
  };

  const handleLogicTypeChange = (newType: LogicBlock["type"]) => {
    // 현재 로직과 동일한 로직을 선택하면 아무 동작 없음
    if (newType === item.type) return;

    let oldIndicator: IndicatorValue | null = getCurrentIndicator(item);
    let newBlock: LogicBlock;
    const baseProps = { id: item.id };

    switch (newType) {
      case "comparison":
        newBlock = {
          ...baseProps,
          type: "comparison",
          operandA: oldIndicator,
          operator: ">",
          operandB: 0,
        };
        break;
      case "crossover":
        newBlock = {
          ...baseProps,
          type: "crossover",
          mainLine: oldIndicator,
          signalLine: 0,
          crossDirection: "above",
        };
        break;
      case "state":
        newBlock = {
          ...baseProps,
          type: "state",
          indicator: oldIndicator,
          lowerBound: 30,
          upperBound: 70,
          stateAction: "within",
        };
        break;
      case "trend_signal":
        newBlock = {
          ...baseProps,
          type: "trend_signal",
          indicator: oldIndicator,
          signal: "buy",
        };
        break;
      case "channel":
        newBlock = {
          ...baseProps,
          type: "channel",
          indicator: oldIndicator,
          channelZone: "upper",
          action: "enter",
        };
        break;
      case "divergence":
        newBlock = {
          ...baseProps,
          type: "divergence",
          indicator: oldIndicator,
          divergenceType: "bullish",
        };
        break;
      case "pattern":
        newBlock = {
          ...baseProps,
          type: "pattern",
          patternKey: "doji",
          direction: "any",
        };
        break;
      default:
        newBlock = {
          ...baseProps,
          type: "comparison",
          operandA: oldIndicator,
          operator: ">",
          operandB: 0,
        };
    }
    if (item.children && item.children.length > 0) {
      newBlock.children = item.children;
    }

    onUpdate(item.id, newBlock);
  };

  // --- 각 로직 타입별 렌더링 함수 ---
  const renderComparisonLogic = (logic: ComparisonLogic) => (
    <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
      <OperandSlot
        value={logic.operandA}
        onSelectIndicator={() => onTriggerReplaceBlock(logic.id)}
        onConvertToValue={() => handleUpdateField("operandA", 0)}
        onConvertToIndicator={() => handleUpdateField("operandA", null)}
        onValueChange={(val) => handleUpdateField("operandA", val)}
      />

      <div className="flex justify-center">
        <Select
          value={logic.operator}
          onValueChange={(val) => handleUpdateField("operator", val)}
        >
          <SelectTrigger className="h-10 w-full md:w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=">">&gt;</SelectItem>
            <SelectItem value="<">&lt;</SelectItem>
            <SelectItem value="==">=</SelectItem>
            <SelectItem value="!=">≠</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <OperandSlot
        value={logic.operandB}
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "operandB")}
        onConvertToValue={() => handleUpdateField("operandB", 0)}
        onConvertToIndicator={() => handleUpdateField("operandB", null)}
        onValueChange={(val) => handleUpdateField("operandB", val)}
      />
    </div>
  );

  const renderCrossoverLogic = (logic: CrossoverLogic) => (
    <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
      <OperandSlot
        value={logic.mainLine}
        onSelectIndicator={() => onTriggerReplaceBlock(logic.id)}
        onConvertToValue={() => handleUpdateField("mainLine", 0)}
        onConvertToIndicator={() => handleUpdateField("mainLine", null)}
        onValueChange={(val) => handleUpdateField("mainLine", val)}
      />
      <Select
        value={logic.crossDirection || "above"}
        onValueChange={(val) => handleUpdateField("crossDirection", val)}
      >
        <SelectTrigger className="w-full md:w-28 mx-auto">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="above">{t("crossesAbove")}</SelectItem>
          <SelectItem value="below">{t("crossesBelow")}</SelectItem>
        </SelectContent>
      </Select>
      <OperandSlot
        value={logic.signalLine}
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "signalLine")}
        onConvertToValue={() => handleUpdateField("signalLine", 0)}
        onConvertToIndicator={() => handleUpdateField("signalLine", null)}
        onValueChange={(val) => handleUpdateField("signalLine", val)}
      />
    </div>
  );

  const renderStateLogic = (logic: StateLogic) => (
    <div className="flex flex-col gap-3">
      <OperandSlot
        value={logic.indicator}
        onSelectIndicator={() => onTriggerReplaceBlock(logic.id)}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={(newValue) => handleUpdateField("indicator", newValue)}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-grow items-center gap-2 min-w-[200px]">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            {t("range")}
          </Label>
          <Input
            type="number"
            placeholder={t("min")}
            value={logic.lowerBound ?? ""}
            onChange={(e) =>
              handleUpdateField(
                "lowerBound",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="h-8 text-center flex-1"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="number"
            placeholder={t("max")}
            value={logic.upperBound ?? ""}
            onChange={(e) =>
              handleUpdateField(
                "upperBound",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="h-8 text-center flex-1"
          />
        </div>

        <div className="flex flex-grow items-center gap-2 min-w-[150px]">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            {t("action")}
          </Label>
          <Select
            value={logic.stateAction}
            onValueChange={(val) => handleUpdateField("stateAction", val)}
          >
            <SelectTrigger className="h-8 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enter">{t("enterState")}</SelectItem>
              <SelectItem value="exit">{t("exitState")}</SelectItem>
              <SelectItem value="within">{t("withinState")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderTrendSignalLogic = (logic: TrendSignalLogic) => (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] items-center gap-2">
      <OperandSlot
        value={logic.indicator}
        onSelectIndicator={() => onTriggerReplaceBlock(logic.id)}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={(newValue) => handleUpdateField("indicator", newValue)}
      />
      <Select
        value={logic.signal}
        onValueChange={(val) => handleUpdateField("signal", val)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("selectSignal")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="buy">{t("buySignal")}</SelectItem>
          <SelectItem value="sell">{t("sellSignal")}</SelectItem>
          <SelectItem value="none">{t("noneSignal")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderChannelLogic = (logic: ChannelLogic) => (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center gap-2">
      <OperandSlot
        value={logic.indicator}
        onSelectIndicator={() => onTriggerReplaceBlock(logic.id)}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={(newValue) => handleUpdateField("indicator", newValue)}
      />
      <Select
        value={logic.channelZone}
        onValueChange={(val) => handleUpdateField("channelZone", val)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("selectChannelZone")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="upper">
            {logic.indicator?.indicatorKey === "Ichimoku"
              ? t("cloudTop")
              : t("upperChannel")}
          </SelectItem>
          <SelectItem value="lower">
            {logic.indicator?.indicatorKey === "Ichimoku"
              ? t("cloudBottom")
              : t("lowerChannel")}
          </SelectItem>
          <SelectItem value="kumo">{t("kumoCloud")}</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={logic.action}
        onValueChange={(val) => handleUpdateField("action", val)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("selectAction")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="enter">{t("enterChannel")}</SelectItem>
          <SelectItem value="exit">{t("exitChannel")}</SelectItem>
          <SelectItem value="within">{t("withinChannel")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderDivergenceLogic = (logic: DivergenceLogic) => (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] items-center gap-2">
      <OperandSlot
        value={logic.indicator}
        onSelectIndicator={() => onTriggerReplaceBlock(logic.id)}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={(newValue) => handleUpdateField("indicator", newValue)}
      />
      <Select
        value={logic.divergenceType}
        onValueChange={(val) => handleUpdateField("divergenceType", val)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("selectDivergenceType")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bullish">{t("bullishDivergence")}</SelectItem>
          <SelectItem value="bearish">{t("bearishDivergence")}</SelectItem>
          <SelectItem value="hidden_bullish">{t("hiddenBullish")}</SelectItem>
          <SelectItem value="hidden_bearish">{t("hiddenBearish")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderPatternLogic = (logic: PatternLogic) => (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] items-center gap-2">
      <Select
        value={logic.patternKey}
        onValueChange={(val) => handleUpdateField("patternKey", val)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("selectPattern")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="doji">Doji</SelectItem>
          <SelectItem value="engulfing">Engulfing</SelectItem>
          <SelectItem value="hammer">Hammer</SelectItem>
          <SelectItem value="harami">Harami</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={logic.direction}
        onValueChange={(val) => handleUpdateField("direction", val)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("direction")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bullish">{t("bullish")}</SelectItem>
          <SelectItem value="bearish">{t("bearish")}</SelectItem>
          <SelectItem value="any">{t("any")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderAISignalLogic = (logic: AISignalLogic) => {
    const isRegression = logic.taskType === "regression";

    // Handler for regression evaluation mode changes with default values
    const handleRegressionModeChange = (newMode: string) => {
      const updates: Partial<AISignalLogic> = {
        evaluationMode: newMode as AISignalLogic["evaluationMode"],
      };

      // Set default values based on the selected mode
      if (newMode === "threshold") {
        // Set defaults for threshold mode if not already set
        if (logic.threshold === undefined) updates.threshold = 0;
        if (!logic.conditionOperator) updates.conditionOperator = ">";
      } else if (newMode === "direction" || newMode === "confidence") {
        // Set default direction if not already set
        if (!logic.directionSignal) updates.directionSignal = "positive";
      }

      onUpdate(item.id, { ...logic, ...updates } as AISignalLogic);
    };

    // 분류 모델: 신호 타입별 설정
    const signalConfig = {
      buy: {
        color: "emerald",
        label: "BUY",
        labelKey: "buySignal" as const,
        bgClass:
          "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20",
        textClass: "text-emerald-500",
      },
      sell: {
        color: "rose",
        label: "SELL",
        labelKey: "sellSignal" as const,
        bgClass: "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20",
        textClass: "text-rose-500",
      },
      hold: {
        color: "amber",
        label: "HOLD",
        labelKey: "holdSignal" as const,
        bgClass: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20",
        textClass: "text-amber-500",
      },
    };

    // 회귀 모델: 방향별 설정
    const directionConfig = {
      positive: {
        label: t("aiSignal.positiveDirection"),
        bgClass: "bg-emerald-500/10 border-emerald-500/30",
        textClass: "text-emerald-500",
      },
      negative: {
        label: t("aiSignal.negativeDirection"),
        bgClass: "bg-rose-500/10 border-rose-500/30",
        textClass: "text-rose-500",
      },
    };

    // 조건 연산자 설정
    const operatorConfig = {
      ">": ">",
      "<": "<",
      ">=": "≥",
      "<=": "≤",
    };

    const currentSignal =
      signalConfig[logic.signalType || "buy"] || signalConfig.buy;
    const currentDirection =
      directionConfig[logic.directionSignal || "positive"] ||
      directionConfig.positive;

    // 회귀 모델 UI
    if (isRegression) {
      return (
        <div className="space-y-4 min-w-[450px] shrink-0">
          {/* 헤더: 모델 정보 + 뱃지 */}
          <div className="flex items-center gap-2.5 p-2.5 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-lg border border-teal-500/20">
            <div className="p-1.5 bg-teal-500/20 rounded-md">
              <Brain className="h-4 w-4 text-teal-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">
                {logic.modelName || t("aiSignal.defaultModelName")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t("aiSignal.regressionSubtitle")}
                {logic.predictionTarget && (
                  <span className="ml-1 opacity-70">
                    ({logic.predictionTarget})
                  </span>
                )}
              </span>
            </div>
            <div className="ml-auto px-2 py-1 rounded-md bg-teal-500/20 text-teal-500 text-xs font-bold">
              {t("aiSignal.regressionBadge")}
            </div>
          </div>

          {/* 평가 모드 선택 */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div
              className={`
              flex-1 p-3 rounded-lg border transition-all
              ${
                logic.evaluationMode === "direction"
                  ? "bg-teal-500/5 border-teal-500/30"
                  : "bg-muted/30 border-border/50"
              }
            `}
            >
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">
                  {t("aiSignal.evaluationModeLabel")}
                </Label>
              </div>
              <Select
                value={logic.evaluationMode}
                onValueChange={handleRegressionModeChange}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue>
                    {logic.evaluationMode === "direction"
                      ? t("aiSignal.directionBased")
                      : logic.evaluationMode === "confidence"
                      ? t("aiSignal.confidenceBased")
                      : t("aiSignal.thresholdBased")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direction">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {t("aiSignal.directionBased")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t("aiSignal.directionBasedDesc")}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="threshold">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {t("aiSignal.thresholdBased")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t("aiSignal.thresholdBasedDesc")}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="confidence">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {t("aiSignal.confidenceBased")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t("aiSignal.confidenceBasedDesc")}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Direction 모드: 방향 선택 */}
            {logic.evaluationMode === "direction" && (
              <div className="flex-1 p-3 rounded-lg border bg-muted/30 border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">
                    {t("aiSignal.directionLabel")}
                  </Label>
                </div>
                <div className="flex rounded-lg border border-border/50 overflow-hidden">
                  {(["positive", "negative"] as const).map((dir) => {
                    const config = directionConfig[dir];
                    const isActive = logic.directionSignal === dir;
                    return (
                      <button
                        key={dir}
                        type="button"
                        onClick={() =>
                          handleUpdateField("directionSignal", dir)
                        }
                        className={`
                          flex-1 px-3 py-2 text-xs font-medium transition-all duration-200
                          ${
                            isActive
                              ? `${config.bgClass} ${config.textClass}`
                              : "bg-background hover:bg-accent text-muted-foreground"
                          }
                        `}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Threshold 모드: 연산자 + 임계값 */}
            {logic.evaluationMode === "threshold" && (
              <>
                <div className="w-24 p-3 rounded-lg border bg-muted/30 border-border/50">
                  <Label className="text-xs font-medium mb-2 block">
                    {t("aiSignal.conditionOperatorLabel")}
                  </Label>
                  <Select
                    value={logic.conditionOperator || ">"}
                    onValueChange={(val) =>
                      handleUpdateField("conditionOperator", val)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue>
                        {
                          operatorConfig[
                            (logic.conditionOperator as keyof typeof operatorConfig) ||
                              ">"
                          ]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=">">&gt;</SelectItem>
                      <SelectItem value="<">&lt;</SelectItem>
                      <SelectItem value=">=">≥</SelectItem>
                      <SelectItem value="<=">≤</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 p-3 rounded-lg border bg-teal-500/5 border-teal-500/20">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs font-medium">
                      {t("aiSignal.thresholdLabel")}
                    </Label>
                    <span className="text-sm font-bold text-teal-500">
                      {logic.threshold || 0}%
                    </span>
                  </div>
                  <Slider
                    value={[logic.threshold || 0]}
                    onValueChange={(val) =>
                      handleUpdateField("threshold", val[0])
                    }
                    min={-10}
                    max={10}
                    step={0.5}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {t("aiSignal.thresholdDesc")}
                  </p>
                </div>
              </>
            )}

            {/* Confidence 모드: MC Dropout 설정 */}
            {logic.evaluationMode === "confidence" && (
              <>
                <div className="flex-1 p-3 rounded-lg border bg-muted/30 border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-medium">
                      {t("aiSignal.directionLabel")}
                    </Label>
                  </div>
                  <div className="flex rounded-lg border border-border/50 overflow-hidden">
                    {(["positive", "negative"] as const).map((dir) => {
                      const config = directionConfig[dir];
                      const isActive = logic.directionSignal === dir;
                      return (
                        <button
                          key={dir}
                          type="button"
                          onClick={() =>
                            handleUpdateField("directionSignal", dir)
                          }
                          className={`
                            flex-1 px-3 py-2 text-xs font-medium transition-all duration-200
                            ${
                              isActive
                                ? `${config.bgClass} ${config.textClass}`
                                : "bg-background hover:bg-accent text-muted-foreground"
                            }
                          `}
                        >
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex-1 p-3 rounded-lg border bg-purple-500/5 border-purple-500/20">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs font-medium">
                      {t("aiSignal.mcDropoutSamplesLabel")}
                    </Label>
                    <span className="text-sm font-bold text-purple-500">
                      {logic.mcDropoutSamples || 10}
                    </span>
                  </div>
                  <Slider
                    value={[logic.mcDropoutSamples || 10]}
                    onValueChange={(val) =>
                      handleUpdateField("mcDropoutSamples", val[0])
                    }
                    min={5}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {t("aiSignal.mcDropoutSamplesDesc")}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* 현재 조건 요약 */}
          <div
            className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-xs
            ${currentDirection.bgClass} border
          `}
          >
            <span className="text-muted-foreground">
              {t("aiSignal.conditionLabel")}
            </span>
            <span className={`font-semibold ${currentDirection.textClass}`}>
              {logic.modelName || t("aiSignal.defaultModelName")}
            </span>
            <span className="text-muted-foreground">
              {logic.evaluationMode === "direction"
                ? t("aiSignal.directionSuffix", {
                    direction: currentDirection.label,
                  })
                : logic.evaluationMode === "confidence"
                ? t("aiSignal.confidenceSuffix", {
                    direction: currentDirection.label,
                    samples: logic.mcDropoutSamples || 10,
                  })
                : t("aiSignal.regressionConditionSuffix", {
                    operator:
                      operatorConfig[
                        (logic.conditionOperator as keyof typeof operatorConfig) ||
                          ">"
                      ],
                    threshold: `${logic.threshold || 0}%`,
                  })}
            </span>
          </div>
        </div>
      );
    }

    // 분류 모델 UI (기존 코드)
    return (
      <div className="space-y-4 min-w-[450px] shrink-0">
        {/* 헤더: 모델 정보 + 신호 타입 선택 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* 모델 정보 */}
          <div className="flex items-center gap-2.5 flex-1 p-2.5 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-lg border border-violet-500/20">
            <div className="p-1.5 bg-violet-500/20 rounded-md">
              <Brain className="h-4 w-4 text-violet-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">
                {logic.modelName || t("aiSignal.defaultModelName")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t("aiSignal.modelSubtitle")}
              </span>
            </div>
            <div className="ml-auto px-2 py-1 rounded-md bg-violet-500/20 text-violet-500 text-xs font-bold">
              {t("aiSignal.classificationBadge")}
            </div>
          </div>

          {/* 신호 타입 버튼 그룹 */}
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            {(["buy", "sell", "hold"] as const).map((type) => {
              const config = signalConfig[type];
              const isActive = logic.signalType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleUpdateField("signalType", type)}
                  className={`
                    px-3 py-2 text-xs font-bold transition-all duration-200
                    ${
                      isActive
                        ? `${config.bgClass} ${config.textClass} border-0`
                        : "bg-background hover:bg-accent text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 설정 영역 */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          {/* 평가 모드 카드 */}
          <div
            className={`
            flex-1 p-3 rounded-lg border transition-all
            ${
              logic.evaluationMode === "highest"
                ? "bg-primary/5 border-primary/30"
                : "bg-muted/30 border-border/50"
            }
          `}
          >
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">
                {t("aiSignal.evaluationModeLabel")}
              </Label>
            </div>
            <Select
              value={logic.evaluationMode}
              onValueChange={(val) => handleUpdateField("evaluationMode", val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue>
                  {logic.evaluationMode === "highest"
                    ? t("aiSignal.highestProbability")
                    : t("aiSignal.thresholdBased")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="highest">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {t("aiSignal.highestProbability")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {t("aiSignal.highestProbabilityDesc")}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="threshold">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {t("aiSignal.thresholdBased")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {t("aiSignal.thresholdBasedDesc")}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 신뢰도 설정 (threshold 모드일 때만) */}
          {logic.evaluationMode === "threshold" && (
            <div className="flex-1 p-3 rounded-lg border bg-violet-500/5 border-violet-500/20">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-medium">
                  {t("aiSignal.minConfidenceLabel")}
                </Label>
                <span className="text-sm font-bold text-violet-500">
                  {Math.round((logic.minConfidence || 0.5) * 100)}%
                </span>
              </div>
              <Slider
                value={[logic.minConfidence || 0.5]}
                onValueChange={(val) =>
                  handleUpdateField("minConfidence", val[0])
                }
                min={0.1}
                max={0.99}
                step={0.05}
                className="w-full"
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                {t("aiSignal.minConfidenceDesc")}
              </p>
            </div>
          )}
        </div>

        {/* 현재 조건 요약 */}
        <div
          className={`
          flex items-center gap-2 px-3 py-2 rounded-md text-xs
          ${currentSignal.bgClass} border
        `}
        >
          <span className="text-muted-foreground">
            {t("aiSignal.conditionLabel")}
          </span>
          <span className={`font-semibold ${currentSignal.textClass}`}>
            {logic.modelName || t("aiSignal.defaultModelName")}
          </span>
          <span className="text-muted-foreground">
            {t("aiSignal.modelSuffix")}
          </span>
          <span className={`font-bold ${currentSignal.textClass}`}>
            {currentSignal.label}
          </span>
          <span className="text-muted-foreground">
            {logic.evaluationMode === "highest"
              ? t("aiSignal.highestProbabilitySuffix")
              : t("aiSignal.thresholdSuffix", {
                  confidence: Math.round((logic.minConfidence || 0.5) * 100),
                })}
          </span>
        </div>
      </div>
    );
  };

  const renderLogic = (logic: LogicBlock) => {
    switch (logic.type) {
      case "comparison":
        return renderComparisonLogic(logic);
      case "crossover":
        return renderCrossoverLogic(logic);
      case "state":
        return renderStateLogic(logic);
      case "trend_signal":
        return renderTrendSignalLogic(logic);
      case "channel":
        return renderChannelLogic(logic);
      case "divergence":
        return renderDivergenceLogic(logic);
      case "pattern":
        return renderPatternLogic(logic);
      case "ai_signal":
        return renderAISignalLogic(logic);
      default:
        return (
          <div className="text-sm text-destructive">
            {t("unknownLogicType")}
          </div>
        );
    }
  };

  const handleAddRuleAndClose = (as: "OR" | "AND") => {
    onTriggerAddRule(item.id, as);
    setMenuOpen(false);
  };

  const handleDeleteAndClose = () => {
    onDelete(item.id);
    setMenuOpen(false);
  };

  return (
    <Card className="p-3 transition-shadow shadow-md hover:shadow-lg border-l-4 border-primary/70">
      <div className="flex items-center justify-between mb-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
              disabled={item.type === "pattern"}
            >
              <CurrentLogicIcon className="h-4 w-4 text-primary" />
              {tLogic(LOGIC_TYPE_METADATA[item.type].labelKey as any)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {Object.entries(LOGIC_TYPE_METADATA)
              .filter(([type]) =>
                supportedLogics.includes(type as LogicBlock["type"])
              )
              .map(([type, { icon: Icon, labelKey }]) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() =>
                    handleLogicTypeChange(type as LogicBlock["type"])
                  }
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{tLogic(labelKey as any)}</span>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu open={isMenuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handleAddRuleAndClose("OR")}>
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>{t("addOrCondition")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAddRuleAndClose("AND")}>
              <CornerDownRight className="mr-2 h-4 w-4" />
              <span>{t("addAndCondition")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(item.id)}
              className="text-[hsl(var(--destructive))] focus:bg-[hsl(var(--destructive))]/10 focus:text-[hsl(var(--destructive))]"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>{t("delete")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* --- 2. 스크롤이 필요한 콘텐츠 영역 --- */}
      <ScrollArea className="w-full">
        <div className="min-w-[380px] pt-1 pb-3">{renderLogic(item)}</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
