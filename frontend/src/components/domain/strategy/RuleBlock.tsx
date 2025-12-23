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

  const renderAISignalLogic = (logic: AISignalLogic) => (
    <div className="flex flex-col gap-3">
      {/* 모델 이름 표시 */}
      <div className="flex items-center gap-2 p-2 bg-violet-500/10 rounded-lg border border-violet-500/30">
        <Brain className="h-4 w-4 text-violet-500" />
        <span className="font-medium text-sm">
          {logic.modelName || "AI 모델"}
        </span>
      </div>

      {/* 설정 컨트롤 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 신호 타입 */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">신호 타입</Label>
          <Select
            value={logic.signalType}
            onValueChange={(val) => handleUpdateField("signalType", val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">BUY (매수)</SelectItem>
              <SelectItem value="sell">SELL (매도)</SelectItem>
              <SelectItem value="hold">HOLD (관망)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 평가 모드 */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">평가 방식</Label>
          <Select
            value={logic.evaluationMode}
            onValueChange={(val) => handleUpdateField("evaluationMode", val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="highest">최고 확률</SelectItem>
              <SelectItem value="threshold">임계값</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 최소 신뢰도 (threshold 모드일 때만) */}
        {logic.evaluationMode === "threshold" && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">
                최소 신뢰도
              </Label>
              <span className="text-xs font-medium text-violet-500">
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
          </div>
        )}
      </div>
    </div>
  );

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
