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
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
    "operand_a" in block &&
    typeof block.operand_a === "object" &&
    block.operand_a !== null
  )
    return block.operand_a;
  if (
    "main_line" in block &&
    typeof (block as any).main_line === "object" &&
    (block as any).main_line !== null
  )
    return (block as any).main_line;
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

  // 현재 규칙 블록에서 사용 중인 지표 정보를 바탕으로 지원되는 로직 목록을 계산
  const supportedLogics = useMemo(() => {
    const currentIndicator = getCurrentIndicator(item);
    // 'pattern' 로직은 지표가 없으므로 항상 선택 가능하도록 예외 처리
    if (item.type === "pattern") {
      const patternMeta = Object.keys(LOGIC_TYPE_METADATA).find(
        (k) => k === "pattern"
      );
      return patternMeta ? [patternMeta] : [];
    }
    if (!currentIndicator) {
      // 지표가 아직 설정되지 않았다면 모든 로직을 보여줌
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
          operand_a: oldIndicator,
          operator: ">",
          operand_b: 0,
        };
        break;
      case "crossover":
        newBlock = {
          ...baseProps,
          type: "crossover",
          main_line: oldIndicator,
          signal_line: 0,
          cross_direction: "above",
        };
        break;
      case "state":
        newBlock = {
          ...baseProps,
          type: "state",
          indicator: oldIndicator,
          lower_bound: 30,
          upper_bound: 70,
          state_action: "within",
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
          channel_zone: "upper",
          action: "enter",
        };
        break;
      case "divergence":
        newBlock = {
          ...baseProps,
          type: "divergence",
          indicator: oldIndicator,
          divergence_type: "bullish",
        };
        break;
      case "pattern":
        newBlock = {
          ...baseProps,
          type: "pattern",
          pattern_key: "doji",
          direction: "any",
        };
        break;
      default:
        newBlock = {
          ...baseProps,
          type: "comparison",
          operand_a: oldIndicator,
          operator: ">",
          operand_b: 0,
        };
    }
    onUpdate(item.id, newBlock);
  };

  // --- 각 로직 타입별 렌더링 함수 ---
  const renderComparisonLogic = (logic: ComparisonLogic) => (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <OperandSlot
        value={logic.operand_a}
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "operand_a")}
        onConvertToValue={() => handleUpdateField("operand_a", 0)}
        onConvertToIndicator={() => handleUpdateField("operand_a", null)}
        onValueChange={(val) => handleUpdateField("operand_a", val)}
      />
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
      <OperandSlot
        value={logic.operand_b}
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "operand_b")}
        onConvertToValue={() => handleUpdateField("operand_b", 0)}
        onConvertToIndicator={() => handleUpdateField("operand_b", null)}
        onValueChange={(val) => handleUpdateField("operand_b", val)}
      />
    </div>
  );

  const renderCrossoverLogic = (logic: CrossoverLogic) => (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <OperandSlot
        value={logic.main_line}
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "main_line")}
        onConvertToValue={() => handleUpdateField("main_line", 0)}
        onConvertToIndicator={() => handleUpdateField("main_line", null)}
        onValueChange={(val) => handleUpdateField("main_line", val)}
      />
      <Select
        value={logic.cross_direction}
        onValueChange={(val) => handleUpdateField("cross_direction", val)}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="above">{t("crossesAbove")}</SelectItem>
          <SelectItem value="below">{t("crossesBelow")}</SelectItem>
        </SelectContent>
      </Select>
      <OperandSlot
        value={logic.signal_line}
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "signal_line")}
        onConvertToValue={() => handleUpdateField("signal_line", 0)}
        onConvertToIndicator={() => handleUpdateField("signal_line", null)}
        onValueChange={(val) => handleUpdateField("signal_line", val)}
      />
    </div>
  );

  const renderStateLogic = (logic: StateLogic) => (
    <div className="space-y-3">
      <OperandSlot
        value={logic.indicator}
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "indicator")}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={() => {}}
      />
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">
          {t("range")}
        </Label>
        <Input
          type="number"
          placeholder={t("min")}
          value={logic.lower_bound ?? ""}
          onChange={(e) =>
            handleUpdateField(
              "lower_bound",
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
          className="h-8 text-center"
        />
        <span className="text-muted-foreground">~</span>
        <Input
          type="number"
          placeholder={t("max")}
          value={logic.upper_bound ?? ""}
          onChange={(e) =>
            handleUpdateField(
              "upper_bound",
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
          className="h-8 text-center"
        />
        <Select
          value={logic.state_action}
          onValueChange={(val) => handleUpdateField("state_action", val)}
        >
          <SelectTrigger className="h-8 w-32">
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
  );

  const renderTrendSignalLogic = (logic: TrendSignalLogic) => (
    <div className="grid grid-cols-[2fr_1fr] items-center gap-2">
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
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
      <OperandSlot
        value={logic.indicator}
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "indicator")}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={() => {}}
      />
      <Select
        value={logic.channel_zone}
        onValueChange={(val) => handleUpdateField("channel_zone", val)}
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
    <div className="grid grid-cols-[1fr_1fr] items-center gap-2">
      <OperandSlot
        value={logic.indicator}
        onSelectIndicator={() => onTriggerOperandHub(logic.id, "indicator")}
        onConvertToValue={() => {}}
        onConvertToIndicator={() => {}}
        onValueChange={() => {}}
      />
      <Select
        value={logic.divergence_type}
        onValueChange={(val) => handleUpdateField("divergence_type", val)}
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
    <div className="grid grid-cols-[2fr_1fr] items-center gap-2">
      <Select
        value={logic.pattern_key}
        onValueChange={(val) => handleUpdateField("pattern_key", val)}
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
    <Card className="p-3 transition-shadow hover:shadow-lg bg-card">
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
            <DropdownMenuItem onClick={() => onTriggerAddRule(item.id, "OR")}>
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>{t("addOrCondition")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTriggerAddRule(item.id, "AND")}>
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
    </Card>
  );
}
