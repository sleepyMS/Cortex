"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  LogicBlock,
  StrategyType,
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

  const handleUpdateField = (field: keyof LogicBlock, value: any) => {
    onUpdate(item.id, { ...item, [field]: value });
  };

  const handleLogicTypeChange = (newType: LogicBlock["type"]) => {
    let oldIndicator: IndicatorValue | null = null;
    if ("indicator" in item) oldIndicator = item.indicator as IndicatorValue;
    if ("operand_a" in item && typeof item.operand_a === "object")
      oldIndicator = item.operand_a;
    if ("main_line" in item) oldIndicator = item.main_line as IndicatorValue;

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
          <SelectItem value=">">&gt; (크다)</SelectItem>
          <SelectItem value="<">&lt; (작다)</SelectItem>
          <SelectItem value="==">= (같다)</SelectItem>
          <SelectItem value="!=">≠ (다르다)</SelectItem>
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
        onConvertToValue={() => {
          /* State 로직은 값을 가질 수 없으므로 비워둠 */
        }}
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

  // ... 다른 로직 렌더링 함수들 ...
  // Pattern, TrendSignal, Channel, Divergence 등도 위와 같은 방식으로 상세히 구현

  const renderLogic = (logic: LogicBlock) => {
    switch (logic.type) {
      case "comparison":
        return renderComparisonLogic(logic);
      case "crossover":
        return renderCrossoverLogic(logic);
      case "state":
        return renderStateLogic(logic);
      // ... 다른 케이스들
      default:
        return <div>{t("unknownLogicType")}</div>;
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
            >
              <CurrentLogicIcon className="h-4 w-4 text-primary" />
              {tLogic(LOGIC_TYPE_METADATA[item.type].labelKey as any)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {Object.entries(LOGIC_TYPE_METADATA).map(
              ([type, { icon: Icon, labelKey }]) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() =>
                    handleLogicTypeChange(type as LogicBlock["type"])
                  }
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{tLogic(labelKey as any)}</span>
                </DropdownMenuItem>
              )
            )}
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
