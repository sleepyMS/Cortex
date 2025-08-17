"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  LogicBlock,
  LogicOperator,
  ComparisonLogic,
  CrossoverLogic,
  StateLogic,
  TrendSignalLogic,
  ChannelLogic,
  DivergenceLogic,
  PatternLogic,
  IndicatorValue,
} from "@/types/strategy";
import { INDICATOR_METADATA } from "@/lib/indicators";
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
  ArrowDown,
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
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { OperandSlot } from "./OperandSlot";

// --- 타입 정의 ---
interface RuleBlockProps {
  item: LogicBlock;
  onUpdate: (id: string, newBlock: LogicBlock) => void;
  onDelete: (id: string) => void;
  onTriggerAddRule: (parentId: string, as: LogicOperator) => void;
  onTriggerOperandHub: (blockId: string, operandKey: string) => void;
}

// 각 로직 타입에 대한 메타데이터 (아이콘, 레이블 키)
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
};

// 헬퍼 함수: 규칙 블록에서 현재 사용 중인 지표 객체를 추출
const getCurrentIndicator = (block: LogicBlock): IndicatorValue | null => {
  if (
    "indicator" in block &&
    typeof (block as any).indicator === "object" &&
    (block as any).indicator !== null
  )
    return (block as any).indicator;
  if (
    "operandA" in block &&
    typeof block.operandA === "object" &&
    block.operandA !== null
  )
    return block.operandA;
  if (
    "mainLine" in block &&
    typeof (block as any).mainLine === "object" &&
    (block as any).mainLine !== null
  )
    return (block as any).mainLine;
  return null;
};

export function RuleBlock({
  item,
  onUpdate,
  onDelete,
  onTriggerAddRule,
  onTriggerOperandHub,
}: RuleBlockProps) {
  const t = useTranslations("RuleBlock");
  const tLogic = useTranslations("StrategyBuilder.logic");

  const CurrentLogicIcon =
    LOGIC_TYPE_METADATA[item.type]?.icon || GitCompareArrows;

  const supportedLogics = useMemo(() => {
    const currentIndicator = getCurrentIndicator(item);
    if (item.type === "pattern") {
      const patternMeta = Object.keys(LOGIC_TYPE_METADATA).find(
        (k) => k === "pattern"
      );
      return patternMeta ? [patternMeta] : [];
    }
    if (!currentIndicator) {
      return Object.keys(LOGIC_TYPE_METADATA);
    }
    const metadata = INDICATOR_METADATA.find(
      (ind) => ind.key === currentIndicator.indicatorKey
    );
    return metadata ? metadata.supported_logics : [];
  }, [item]);

  const handleUpdateField = (
    field: keyof LogicBlock | keyof typeof item,
    value: any
  ) => {
    onUpdate(item.id, { ...item, [field]: value });
  };

  const handleLogicTypeChange = (newType: LogicBlock["type"]) => {
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
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "operandA")}
        onConvertToValue={() => handleUpdateField("operandA", 0)}
        onConvertToIndicator={() => handleUpdateField("operandA", null)}
        onValueChange={(val) => handleUpdateField("operandA", val)}
      />

      <div className="flex justify-center items-center md:hidden">
        <ArrowDown className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="hidden md:flex justify-center">
        <Select
          value={logic.operator}
          onValueChange={(val) => handleUpdateField("operator", val)}
        >
          <SelectTrigger className="w-20">
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

      <div className="flex justify-center items-center md:hidden">
        <ArrowDown className="w-4 h-4 text-muted-foreground" />
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
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "mainLine")}
        onConvertToValue={() => handleUpdateField("mainLine", 0)}
        onConvertToIndicator={() => handleUpdateField("mainLine", null)}
        onValueChange={(val) => handleUpdateField("mainLine", val)}
      />
      <Select
        value={logic.crossDirection}
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
      {/* 지표 선택 슬롯은 그대로 유지 */}
      <OperandSlot
        value={logic.indicator}
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "indicator")}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={() => {}}
      />
      {/* 🔽 핵심 수정 영역: flex-wrap을 사용한 유연한 컨테이너 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* '범위' 그룹: 이 그룹은 한 단위로 움직입니다. */}
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
            className="h-8 text-center flex-1" // 👈 너비를 유연하게 조절
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
            className="h-8 text-center flex-1" // 👈 너비를 유연하게 조절
          />
        </div>

        {/* '동작' 그룹: 이 그룹도 공간이 부족하면 아래로 내려갑니다. */}
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
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "indicator")}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={() => {}}
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
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "indicator")}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={() => {}}
      />
      <Select
        value={logic.channelZone}
        onValueChange={(val) => handleUpdateField("channelZone", val)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("selectChannelZone")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="upper">{t("upperChannel")}</SelectItem>
          <SelectItem value="middle">{t("middleChannel")}</SelectItem>
          <SelectItem value="lower">{t("lowerChannel")}</SelectItem>
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
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "indicator")}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={() => {}}
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
      default:
        return (
          <div className="text-sm text-destructive">
            {t("unknownLogicType")}
          </div>
        );
    }
  };

  return (
    <Card className="p-3 transition-shadow shadow-md hover:shadow-lg border-l-4 border-primary/70">
      <ScrollArea className="w-full">
        <div className="min-w-[380px]">
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

            <DropdownMenu>
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
                <DropdownMenuItem
                  onClick={() => onTriggerAddRule(item.id, "OR")}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  <span>{t("addOrCondition")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onTriggerAddRule(item.id, "AND")}
                >
                  <CornerDownRight className="mr-2 h-4 w-4" />
                  <span>{t("addAndCondition")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>{t("delete")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-2">{renderLogic(item)}</div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
