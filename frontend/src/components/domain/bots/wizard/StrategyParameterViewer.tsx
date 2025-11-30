"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { LogicBlock, Strategy, IndicatorValue } from "@/types/strategy";
import { IndicatorMetadata } from "@/types/indicator";
import { useIndicatorStore } from "@/store/indicatorStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MoveUp, MoveDown } from "lucide-react";

type TFunction = ReturnType<typeof useTranslations>;

interface StrategyParameterViewerProps {
  strategy: Strategy;
  singleColumn?: boolean;
}

interface RuleDisplayProps {
  block: LogicBlock;
  definitions: Record<string, IndicatorMetadata>;
  pathPrefix: string;
  t: TFunction;
  tRule: TFunction;
}

// --- Helper Functions ---
const formatOperand = (
  operand: any,
  definitions: Record<string, IndicatorMetadata>
): string => {
  if (typeof operand !== "object" || operand === null) return String(operand);
  if (operand.indicatorKey) {
    const def = definitions[operand.indicatorKey];
    const params = Object.values(operand.values).join(", ");
    return `${def?.label || operand.indicatorKey}(${params})`;
  }
  return "?";
};

const formatRuleTitle = (
  block: LogicBlock,
  definitions: Record<string, IndicatorMetadata>,
  t: TFunction,
  tRule: TFunction
): string => {
  try {
    const format = (op: any) => formatOperand(op, definitions);

    switch (block.type) {
      case "comparison":
        return t("ruleTitles.comparison", {
          operandA: format(block.operandA),
          operator: block.operator,
          operandB: format(block.operandB),
        });
      case "crossover":
        const crossDirectionText =
          block.crossDirection === "above"
            ? tRule("crossesAbove")
            : tRule("crossesBelow");
        return t("ruleTitles.crossover", {
          mainLine: format(block.mainLine),
          signalLine: format(block.signalLine),
          crossDirection: crossDirectionText,
        });
      case "state":
        return t("ruleTitles.state", {
          indicator: format(block.indicator),
          lowerBound: format(block.lowerBound),
          upperBound: format(block.upperBound),
        });
      default:
        return t("ruleTitles.default", { type: block.type });
    }
  } catch (e) {
    return t("ruleParseError");
  }
};

const ParameterLineItem = React.memo(
  ({ label, value }: { label: string; value: any }) => {
    return (
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">{label}</span>
        <Badge variant="secondary">{String(value)}</Badge>
      </div>
    );
  }
);
ParameterLineItem.displayName = "ParameterLineItem";

const ReadOnlyLogicDisplay = React.memo(
  ({ label, value }: { label: string; value: string }) => {
    return (
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">{label}</span>
        <Badge variant="secondary" className="text-xs">
          {value}
        </Badge>
      </div>
    );
  }
);
ReadOnlyLogicDisplay.displayName = "ReadOnlyLogicDisplay";

const OperandDisplayGroup = React.memo(
  ({
    operand,
    operandKey,
    title,
    currentBlockPath,
    definitions,
    t,
  }: {
    operand: IndicatorValue | number | null;
    operandKey: string;
    title: string;
    currentBlockPath: string;
    definitions: Record<string, IndicatorMetadata>;
    t: TFunction;
  }) => {
    const operandPathPrefix = `${currentBlockPath}.${operandKey}`;

    if (typeof operand !== "object" || operand === null) {
      return (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg h-full flex flex-col justify-center">
          <ParameterLineItem label={t(title)} value={operand} />
        </div>
      );
    }

    const operandTitle = formatOperand(operand, definitions);
    const displayTitle = `${t(title)} - ${operandTitle}`;

    const indicatorParamPaths = Object.keys(operand.values || {}).map(
      (paramKey) => ({
        key: paramKey,
        path: `${operandPathPrefix}.values.${paramKey}`,
        value: (operand.values as any)[paramKey],
      })
    );

    return (
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg h-full flex flex-col min-w-0">
        <h5 className="text-xs font-semibold text-muted-foreground truncate">
          {displayTitle}
        </h5>
        <div className="flex-grow pt-2 space-y-1.5">
          {indicatorParamPaths.length > 0 ? (
            indicatorParamPaths.map((param) => {
              const def = definitions[operand.indicatorKey];
              const paramDef = def?.parameters[param.key];
              const label = paramDef?.label || param.key;

              return (
                <ParameterLineItem
                  key={param.path}
                  label={label}
                  value={param.value}
                />
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground text-center pt-4">
                {t("noIndicatorParams")}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);
OperandDisplayGroup.displayName = "OperandDisplayGroup";

const RuleDisplay = React.memo(
  ({ block, definitions, pathPrefix, t, tRule }: RuleDisplayProps) => {
    const currentBlockPath = pathPrefix;

    const renderRuleBody = () => {
      switch (block.type) {
        case "comparison":
        case "crossover": {
          const isComparison = block.type === "comparison";
          const leftKey = isComparison ? "operandA" : "mainLine";
          const rightKey = isComparison ? "operandB" : "signalLine";
          const leftTitle = isComparison
            ? "operandTitles.baseA"
            : "operandTitles.mainLine";
          const rightTitle = isComparison
            ? "operandTitles.compareToB"
            : "operandTitles.signalLine";
          const operator = isComparison ? (
            block.operator
          ) : block.crossDirection === "above" ? (
            <MoveUp className="h-5 w-5 text-green-500" />
          ) : (
            <MoveDown className="h-5 w-5 text-red-500" />
          );

          return (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-4">
              <OperandDisplayGroup
                operand={(block as any)[leftKey]}
                operandKey={leftKey}
                title={leftTitle}
                currentBlockPath={currentBlockPath}
                definitions={definitions}
                t={t}
              />
              <div className="flex items-center justify-center">
                <span className="font-bold text-lg text-primary">
                  {operator}
                </span>
              </div>
              <OperandDisplayGroup
                operand={(block as any)[rightKey]}
                operandKey={rightKey}
                title={rightTitle}
                currentBlockPath={currentBlockPath}
                definitions={definitions}
                t={t}
              />
            </div>
          );
        }

        case "state": {
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-4">
              <OperandDisplayGroup
                operand={block.indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                currentBlockPath={currentBlockPath}
                definitions={definitions}
                t={t}
              />
              <OperandDisplayGroup
                operand={block.lowerBound}
                operandKey="lowerBound"
                title="operandTitles.min"
                currentBlockPath={currentBlockPath}
                definitions={definitions}
                t={t}
              />
              <OperandDisplayGroup
                operand={block.upperBound}
                operandKey="upperBound"
                title="operandTitles.max"
                currentBlockPath={currentBlockPath}
                definitions={definitions}
                t={t}
              />
            </div>
          );
        }

        case "channel": {
          const channelZoneMap: Record<string, string> = {
            upper: "upperChannel",
            middle: "middleChannel",
            lower: "lowerChannel",
            kumo: "kumoCloud",
          };
          const actionMap: Record<string, string> = {
            enter: "enterChannel",
            exit: "exitChannel",
            within: "withinChannel",
          };

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 items-stretch gap-4">
              <OperandDisplayGroup
                operand={(block as any).indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                currentBlockPath={currentBlockPath}
                definitions={definitions}
                t={t}
              />
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg h-full flex flex-col justify-center">
                <ReadOnlyLogicDisplay
                  label={tRule("channelZoneLabel")}
                  value={tRule(
                    channelZoneMap[block.channelZone] || block.channelZone
                  )}
                />
                <ReadOnlyLogicDisplay
                  label={tRule("actionLabel")}
                  value={tRule(actionMap[block.action] || block.action)}
                />
              </div>
            </div>
          );
        }

        case "trend_signal": {
          const signalMap: Record<string, string> = {
            buy: "buySignal",
            sell: "sellSignal",
            none: "noneSignal",
          };
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 items-stretch gap-4">
              <OperandDisplayGroup
                operand={(block as any).indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                currentBlockPath={currentBlockPath}
                definitions={definitions}
                t={t}
              />
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg h-full flex flex-col justify-center">
                <ReadOnlyLogicDisplay
                  label={tRule("signalLabel")}
                  value={tRule(signalMap[block.signal] || block.signal)}
                />
              </div>
            </div>
          );
        }

        case "divergence": {
          const divTypeMap: Record<string, string> = {
            bullish: "bullishDivergence",
            bearish: "bearishDivergence",
            hidden_bullish: "hiddenBullish",
            hidden_bearish: "hiddenBearish",
          };
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 items-stretch gap-4">
              <OperandDisplayGroup
                operand={(block as any).indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                currentBlockPath={currentBlockPath}
                definitions={definitions}
                t={t}
              />
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg h-full flex flex-col justify-center">
                <ReadOnlyLogicDisplay
                  label={tRule("divergenceTypeLabel")}
                  value={tRule(
                    divTypeMap[block.divergenceType] || block.divergenceType
                  )}
                />
              </div>
            </div>
          );
        }

        case "pattern": {
          const dirMap: Record<string, string> = {
            bullish: "bullish",
            bearish: "bearish",
            any: "any",
          };
          return (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg h-full flex flex-col justify-center">
              <ReadOnlyLogicDisplay
                label={tRule("patternKeyLabel")}
                value={block.patternKey}
              />
              <ReadOnlyLogicDisplay
                label={tRule("directionLabel")}
                value={tRule(dirMap[block.direction] || block.direction)}
              />
            </div>
          );
        }

        default:
          return (
            <p className="text-sm text-muted-foreground p-4 text-center">
              {t("unknownRuleType")}
            </p>
          );
      }
    };

    return (
      <div className="p-3 rounded-md border bg-card">
        <p className="text-sm font-semibold text-primary mb-3">
          {formatRuleTitle(block, definitions, t, tRule)}
        </p>

        {renderRuleBody()}

        {block.children && block.children.length > 0 && (
          <div className="mt-4 pl-4 border-l-2 border-amber-500/50 relative">
            <span className="absolute -left-px top-2 -translate-x-1/2 bg-card text-xs font-semibold text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-500/50">
              {t("andOperator")}
            </span>
            <div className="pt-4 space-y-3">
              {block.children.map(
                (childBlock: LogicBlock, childIndex: number) => (
                  <RuleDisplay
                    key={childBlock.id}
                    block={childBlock}
                    definitions={definitions}
                    pathPrefix={`${currentBlockPath}.children.blocks.${childIndex}`}
                    t={t}
                    tRule={tRule}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
RuleDisplay.displayName = "RuleDisplay";

const RuleSection = ({
  title,
  rules,
  definitions,
  pathPrefix,
  t,
  tRule,
}: {
  title: string;
  rules: { blocks: LogicBlock[] } | null | undefined;
  definitions: Record<string, IndicatorMetadata>;
  pathPrefix: string;
  t: TFunction;
  tRule: TFunction;
}) => {
  if (!rules || rules.blocks.length === 0) {
    return (
      <div className="space-y-3">
        <h4 className="text-base font-semibold mb-3">{title}</h4>
        <div className="p-4 text-center border rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">{t("noRules")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-base font-semibold mb-3">{title}</h4>
      {rules.blocks.map((block: LogicBlock, index: number) => (
        <React.Fragment key={block.id}>
          <RuleDisplay
            block={block}
            definitions={definitions}
            pathPrefix={`${pathPrefix}.blocks.${index}`}
            t={t}
            tRule={tRule}
          />
          {index < rules.blocks.length - 1 && (
            <div className="flex items-center gap-2">
              <div className="flex-grow border-t border-dashed"></div>
              <span className="text-xs font-semibold text-muted-foreground">
                {t("orOperator")}
              </span>
              <div className="flex-grow border-t border-dashed"></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export function StrategyParameterViewer({
  strategy,
  singleColumn = false,
}: StrategyParameterViewerProps) {
  const t = useTranslations("BacktestDetailPage.Parameters");
  const tRule = useTranslations("RuleBlock");
  const { metadata } = useIndicatorStore();

  const indicatorDefinitions = useMemo(
    () =>
      metadata.reduce((acc, meta) => {
        acc[meta.key] = meta;
        return acc;
      }, {} as Record<string, IndicatorMetadata>),
    [metadata]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`grid grid-cols-1 ${
            singleColumn ? "" : "lg:grid-cols-2"
          } gap-x-6 gap-y-8 pt-4 border-t`}
        >
          <RuleSection
            title={t("longEntry")}
            rules={strategy.longEntryRules}
            definitions={indicatorDefinitions}
            pathPrefix="longEntryRules"
            t={t}
            tRule={tRule}
          />
          <RuleSection
            title={t("longExit")}
            rules={strategy.longExitRules}
            definitions={indicatorDefinitions}
            pathPrefix="longExitRules"
            t={t}
            tRule={tRule}
          />
          <RuleSection
            title={t("shortEntry")}
            rules={strategy.shortEntryRules}
            definitions={indicatorDefinitions}
            pathPrefix="shortEntryRules"
            t={t}
            tRule={tRule}
          />
          <RuleSection
            title={t("shortExit")}
            rules={strategy.shortExitRules}
            definitions={indicatorDefinitions}
            pathPrefix="shortExitRules"
            t={t}
            tRule={tRule}
          />
        </div>
      </CardContent>
    </Card>
  );
}
