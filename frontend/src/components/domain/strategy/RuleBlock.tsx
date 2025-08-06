// file: frontend/src/components/domain/strategy/RuleBlock.tsx

"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/Popover";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Plus,
  MoreVertical,
  Trash2,
  CornerDownRight,
  ArrowRight,
} from "lucide-react";
import { ParameterPopover } from "./ParameterPopover";
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
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { INDICATOR_METADATA } from "@/lib/indicators";
import { Label } from "@/components/ui/Label";
import { nanoid } from "nanoid";

// --- 타입 정의 ---
interface RuleBlockProps {
  item: LogicBlock;
  depth: number;
  onAddRule: (newBlock: LogicBlock, parentId: string, as: "AND" | "OR") => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newBlock: LogicBlock) => void;
  onSlotClick: (
    blockId: string,
    logicType: LogicBlock["type"],
    slotKey: string
  ) => void;
  ruleType: StrategyType;
}

// --- 내부 컴포넌트: 로직 슬롯 (지표 또는 값) ---
interface LogicSlotProps {
  value: IndicatorValue | number | null;
  onSelect: () => void;
  onUpdate: (newValue: IndicatorValue | number) => void;
}

function LogicSlot({ value, onSelect, onUpdate }: LogicSlotProps) {
  const t = useTranslations("RuleBlock");

  if (value === null) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-full w-full border-dashed transition-colors hover:bg-muted/50 hover:border-primary-foreground/30 flex items-center justify-center text-muted-foreground"
        onClick={onSelect}
      >
        <Plus className="h-4 w-4 mr-1" /> {t("addIndicatorOrValue")}
      </Button>
    );
  }

  // 지표 값일 경우
  if (typeof value === "object" && "indicatorKey" in value) {
    const metadata = INDICATOR_METADATA.find(
      (m) => m.key === value.indicatorKey
    );
    const outputLabel =
      metadata?.outputs.find((o) => o.key === value.outputs[0])?.label ||
      value.outputs[0];

    return (
      <ParameterPopover
        indicatorValue={value}
        onUpdate={onUpdate}
        onIndicatorChange={onSelect}
      >
        <Button
          type="button"
          variant="outline"
          className="h-full w-full justify-start text-left truncate bg-card hover:bg-secondary/40 border-border hover:border-primary transition-colors group"
        >
          <span className="font-bold shrink truncate text-foreground group-hover:text-primary transition-colors">
            {metadata?.label || value.indicatorKey} ({outputLabel})
          </span>
          <span className="text-xs text-muted-foreground ml-1 shrink-0">
            ({Object.values(value.values).join(",")}
            {value.timeframe ? `, ${value.timeframe}` : ""})
          </span>
        </Button>
      </ParameterPopover>
    );
  }

  // 숫자 값일 경우
  return (
    <Input
      type="number"
      className="h-full w-full text-center bg-background border-input focus-visible:ring-ring"
      value={value}
      onChange={(e) => onUpdate(Number(e.target.value))}
    />
  );
}

// --- 메인 컴포넌트: 규칙 블록 ---
export function RuleBlock({
  item,
  depth,
  onAddRule,
  onDelete,
  onUpdate,
  onSlotClick,
  ruleType,
}: RuleBlockProps) {
  const t = useTranslations("RuleBlock");

  // 로직 블록 업데이트 핸들러
  const handleUpdateLogicBlock = (newBlock: LogicBlock) => {
    onUpdate(item.id, newBlock);
  };

  // 팝오버를 위한 지표 변경 핸들러
  const handleSlotClick = (slotKey: string) => {
    onSlotClick(item.id, item.type, slotKey);
  };

  // 새로운 규칙 추가 핸들러
  const handleAddNewRule = (as: LogicOperator) => {
    const newBlock: ComparisonLogic = {
      id: nanoid(),
      type: "comparison",
      operand_a: null,
      operator: ">",
      operand_b: null,
      children: [],
    };
    onAddRule(newBlock, item.id, as);
  };

  const depthStyles = clsx({
    "bg-card": depth === 0,
    "bg-background/70 border-l-2 border-primary/20": depth === 1,
    "bg-secondary/20 border-l-2 border-primary/30": depth === 2,
    "bg-muted/10 border-l-2 border-primary/40": depth >= 3,
  });

  const renderMoreDropdown = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1 bg-popover border-border shadow-lg">
        <div className="flex flex-col">
          <>
            <Button
              type="button"
              variant="ghost"
              className="justify-start text-xs text-foreground hover:bg-accent hover:text-primary"
              onClick={() => handleAddNewRule("OR")}
            >
              <ArrowRight className="h-3 w-3 mr-2 text-primary" />{" "}
              {t("addOrCondition")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="justify-start text-xs text-foreground hover:bg-accent hover:text-primary"
              onClick={() => handleAddNewRule("AND")}
            >
              <CornerDownRight className="h-3 w-3 mr-2 text-primary" />{" "}
              {t("addAndCondition")}
            </Button>
          </>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive justify-start text-xs hover:bg-destructive/10"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3 w-3 mr-2" /> {t("delete")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderComparisonLogic = (logic: ComparisonLogic) => (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 col-span-3">
      <LogicSlot
        value={logic.operand_a}
        onSelect={() => handleSlotClick("operand_a")}
        onUpdate={(newValue) =>
          handleUpdateLogicBlock({ ...logic, operand_a: newValue })
        }
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="px-3 text-base font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            {logic.operator}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1 bg-popover border-border shadow-lg">
          <div className="flex flex-col">
            {[">", "<", "==", "!="].map((op) => (
              <Button
                key={op}
                variant="ghost"
                className="justify-start text-foreground hover:bg-accent hover:text-primary"
                onClick={() =>
                  handleUpdateLogicBlock({
                    ...logic,
                    operator: op as ComparisonLogic["operator"],
                  })
                }
              >
                {op}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <LogicSlot
        value={logic.operand_b}
        onSelect={() => handleSlotClick("operand_b")}
        onUpdate={(newValue) =>
          handleUpdateLogicBlock({ ...logic, operand_b: newValue })
        }
      />
    </div>
  );

  const renderCrossoverLogic = (logic: CrossoverLogic) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 col-span-3">
      <LogicSlot
        value={logic.main_line}
        onSelect={() => handleSlotClick("main_line")}
        onUpdate={(newValue) =>
          handleUpdateLogicBlock({ ...logic, main_line: newValue })
        }
      />
      <div className="text-center text-muted-foreground text-sm">
        <Select
          value={logic.cross_direction}
          onValueChange={(value) =>
            handleUpdateLogicBlock({
              ...logic,
              cross_direction: value as CrossoverLogic["cross_direction"],
            })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder={t("selectDirection")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="above">{t("crossesAbove")}</SelectItem>
            <SelectItem value="below">{t("crossesBelow")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <LogicSlot
        value={logic.signal_line}
        onSelect={() => handleSlotClick("signal_line")}
        onUpdate={(newValue) =>
          handleUpdateLogicBlock({ ...logic, signal_line: newValue })
        }
      />
    </div>
  );

  const renderStateLogic = (logic: StateLogic) => (
    <div className="col-span-3">
      <LogicSlot
        value={logic.indicator}
        onSelect={() => handleSlotClick("indicator")}
        onUpdate={(newValue) =>
          handleUpdateLogicBlock({ ...logic, indicator: newValue })
        }
      />
      <div className="flex flex-col space-y-1 col-span-2 mt-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t("range")}</Label>
          <Input
            type="number"
            placeholder={t("min")}
            value={logic.lower_bound ?? ""}
            onChange={(e) =>
              handleUpdateLogicBlock({
                ...logic,
                lower_bound: Number(e.target.value),
              })
            }
            className="h-8 text-center"
          />
          <span>~</span>
          <Input
            type="number"
            placeholder={t("max")}
            value={logic.upper_bound ?? ""}
            onChange={(e) =>
              handleUpdateLogicBlock({
                ...logic,
                upper_bound: Number(e.target.value),
              })
            }
            className="h-8 text-center"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t("action")}</Label>
          <Select
            value={logic.state_action}
            onValueChange={(value) =>
              handleUpdateLogicBlock({
                ...logic,
                state_action: value as StateLogic["state_action"],
              })
            }
          >
            <SelectTrigger className="h-8">
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
    <div className="grid grid-cols-[1fr_2fr] items-center gap-2 col-span-3">
      <LogicSlot
        value={logic.indicator}
        onSelect={() => handleSlotClick("indicator")}
        onUpdate={(newValue) =>
          handleUpdateLogicBlock({ ...logic, indicator: newValue })
        }
      />
      <Select
        value={logic.signal}
        onValueChange={(value) =>
          handleUpdateLogicBlock({
            ...logic,
            signal: value as TrendSignalLogic["signal"],
          })
        }
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder={t("selectSignal")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="buy">{t("buySignal")}</SelectItem>
          <SelectItem value="sell">{t("sellSignal")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderChannelLogic = (logic: ChannelLogic) => (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 col-span-3">
      <LogicSlot
        value={logic.indicator}
        onSelect={() => handleSlotClick("indicator")}
        onUpdate={(newValue) =>
          handleUpdateLogicBlock({ ...logic, indicator: newValue })
        }
      />
      <Select
        value={logic.channel_zone}
        onValueChange={(value) =>
          handleUpdateLogicBlock({
            ...logic,
            channel_zone: value as ChannelLogic["channel_zone"],
          })
        }
        className="col-span-1 h-8"
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
        onValueChange={(value) =>
          handleUpdateLogicBlock({
            ...logic,
            action: value as ChannelLogic["action"],
          })
        }
        className="col-span-1 h-8"
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
    <div className="grid grid-cols-[1fr_2fr] items-center gap-2 col-span-3">
      <LogicSlot
        value={logic.indicator}
        onSelect={() => handleSlotClick("indicator")}
        onUpdate={(newValue) =>
          handleUpdateLogicBlock({ ...logic, indicator: newValue })
        }
      />
      <Select
        value={logic.divergence_type}
        onValueChange={(value) =>
          handleUpdateLogicBlock({
            ...logic,
            divergence_type: value as DivergenceLogic["divergence_type"],
          })
        }
        className="col-span-2 h-8"
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
    <div className="grid grid-cols-[2fr_1fr] items-center gap-2 col-span-3">
      <Select
        value={logic.pattern_key}
        onValueChange={(value) =>
          handleUpdateLogicBlock({
            ...logic,
            pattern_key: value as PatternLogic["pattern_key"],
          })
        }
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder={t("selectPattern")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="doji">{t("doji")}</SelectItem>
          <SelectItem value="engulfing">{t("engulfing")}</SelectItem>
          <SelectItem value="hammer">{t("hammer")}</SelectItem>
          <SelectItem value="harami">{t("harami")}</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={logic.direction}
        onValueChange={(value) =>
          handleUpdateLogicBlock({
            ...logic,
            direction: value as PatternLogic["direction"],
          })
        }
        className="h-8"
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

  const renderLogic = (item: LogicBlock) => {
    switch (item.type) {
      case "comparison":
        return renderComparisonLogic(item as ComparisonLogic);
      case "crossover":
        return renderCrossoverLogic(item as CrossoverLogic);
      case "state":
        return renderStateLogic(item as StateLogic);
      case "trend_signal":
        return renderTrendSignalLogic(item as TrendSignalLogic);
      case "channel":
        return renderChannelLogic(item as ChannelLogic);
      case "divergence":
        return renderDivergenceLogic(item as DivergenceLogic);
      case "pattern":
        return renderPatternLogic(item as PatternLogic);
      default:
        return <div>{t("unknownLogicType")}</div>;
    }
  };

  return (
    <div className="relative group">
      <Card
        className={clsx(
          "p-3 rounded-lg shadow-sm transition-all min-w-max",
          depthStyles
        )}
      >
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
          {renderLogic(item)}
          {renderMoreDropdown()}
        </div>
      </Card>
    </div>
  );
}
