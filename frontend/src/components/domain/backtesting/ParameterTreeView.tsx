// file: frontend/src/components/domain/backtesting/ParameterTreeView.tsx

"use client";

import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { LogicBlock, Strategy, IndicatorValue } from "@/types/strategy";
import { IndicatorMetadata } from "@/types/indicator";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import {
  Percent,
  SlidersHorizontal,
  ArrowRight,
  MoveUp,
  MoveDown,
} from "lucide-react";

type TFunction = ReturnType<typeof useTranslations>;

// --- Props 타입 정의 ---

interface ParameterTreeViewProps {
  strategy: Strategy;
  indicatorDefinitions: Record<string, IndicatorMetadata>;
  control: any;
  fields: any[]; // useFieldArray로부터 받은 overrides 필드
}

interface RuleBlockProps {
  block: LogicBlock;
  blockIndex: number;
  pathPrefix: string;
  indicatorDefinitions: Record<string, IndicatorMetadata>;
  control: any;
  fields: any[];
  t: TFunction;
  tRule: TFunction;
}

// --- 헬퍼 컴포넌트 및 함수 ---

/**
 * 단일 파라미터 입력 UI (메모이제이션으로 불필요한 리렌더링 방지)
 */
const ParameterInput = React.memo(
  ({
    fieldPath,
    label,
    tooltip,
    control,
  }: {
    fieldPath: string;
    label: string;
    tooltip: string;
    control: any;
  }) => {
    return (
      <Controller
        control={control}
        name={fieldPath}
        render={({ field, fieldState: { error } }) => (
          <div>
            <div className="flex justify-between items-center gap-4">
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor={fieldPath}
                      className="text-xs text-muted-foreground cursor-help whitespace-nowrap"
                    >
                      {label}
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start">
                    <p className="text-xs font-mono">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Input
                id={fieldPath}
                type="number"
                step="any"
                {...field}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? "" : parseFloat(e.target.value) || 0
                  )
                }
                className={cn(
                  "h-8 w-24 text-right",
                  error && "border-destructive"
                )}
              />
            </div>
            {error && (
              <p className="text-xs text-destructive text-right mt-1">
                {error.message}
              </p>
            )}
          </div>
        )}
      />
    );
  }
);
ParameterInput.displayName = "ParameterInput";

/**
 * 피연산자(Operand)를 사람이 읽기 쉬운 형태로 변환
 */
const formatOperand = (
  operand: IndicatorValue | number | null,
  definitions: Record<string, IndicatorMetadata>
): string => {
  if (typeof operand !== "object" || operand === null) {
    return String(operand);
  }
  if (operand.indicatorKey) {
    const def = definitions[operand.indicatorKey];
    const params = Object.entries(operand.values)
      .map(([key, value]) => `${value}`)
      .join(", ");
    return `${def?.label || operand.indicatorKey}(${params})`;
  }
  return "?";
};

/**
 * 규칙(Block) 객체를 사람이 읽기 쉬운 문장으로 변환
 */
const formatRuleTitle = (
  block: LogicBlock,
  definitions: Record<string, IndicatorMetadata>,
  t: (key: string, values?: any) => string,
  tRule: (key: string, values?: any) => string
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

/**
 * 단일 피연산자(Operand)와 그 파라미터들을 렌더링하는 컴포넌트
 */
const OperandParameterGroup = React.memo(
  ({
    operand,
    operandKey,
    title, // e.g., "operandTitles.min"
    currentBlockPath,
    fields,
    control,
    indicatorDefinitions,
    t,
  }: {
    operand: IndicatorValue | number | null;
    operandKey: string;
    title: string;
    currentBlockPath: string;
    fields: any[];
    control: any;
    indicatorDefinitions: Record<string, IndicatorMetadata>;
    t: TFunction;
  }) => {
    const operandPathPrefix = `${currentBlockPath}.${operandKey}`;

    const indicatorParamFields = fields.filter(
      (f) => f.path.startsWith(operandPathPrefix) && f.path.includes(".values.")
    );

    const directValueField = fields.find((f) => f.path === operandPathPrefix);

    if (directValueField) {
      return (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg h-full flex flex-col justify-center">
          <ParameterInput
            key={directValueField.id}
            control={control}
            fieldPath={`overrides.${fields.indexOf(directValueField)}.value`}
            label={t(title)}
            tooltip={`경로: ${directValueField.path}`}
          />
        </div>
      );
    }

    const operandTitle = formatOperand(operand, indicatorDefinitions);
    const displayTitle = `${t(title)} - ${operandTitle}`;

    return (
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg h-full flex flex-col">
        <h5 className="text-xs font-semibold text-muted-foreground truncate">
          {displayTitle}
        </h5>
        <div className="flex-grow pt-2 space-y-3">
          {indicatorParamFields.length > 0 ? (
            indicatorParamFields.map((field) => {
              const pathParts = field.path.split(".");
              const paramKey = pathParts[pathParts.length - 1];
              const fieldPath = `overrides.${fields.indexOf(field)}.value`;

              const indicatorKey = (operand as IndicatorValue)?.indicatorKey;
              const definition = indicatorDefinitions[indicatorKey];
              const paramDefinition = definition?.parameters[paramKey];
              const label = paramDefinition?.label || paramKey;

              return (
                <ParameterInput
                  key={field.id}
                  control={control}
                  fieldPath={fieldPath}
                  label={label}
                  tooltip={`경로: ${field.path}`}
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
OperandParameterGroup.displayName = "OperandParameterGroup";

// 읽기 전용 로직 값 표시를 위한 헬퍼 컴포넌트
const ReadOnlyLogicDisplay = React.memo(
  ({ label, value }: { label: string; value: string }) => {
    return (
      <div className="flex justify-between items-center text-xs px-1 py-0.5">
        <span className="text-muted-foreground">{label}</span>
        <Badge variant="secondary" className="text-xs">
          {value}
        </Badge>
      </div>
    );
  }
);
ReadOnlyLogicDisplay.displayName = "ReadOnlyLogicDisplay";

/**
 * 단일 규칙 블록을 재귀적으로 렌더링하는 핵심 컴포넌트
 */
const RuleBlock = React.memo(
  ({
    block,
    blockIndex,
    pathPrefix,
    indicatorDefinitions,
    control,
    fields,
    t,
    tRule,
  }: RuleBlockProps) => {
    const currentBlockPath = `${pathPrefix}.${blockIndex}`;

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
              <OperandParameterGroup
                operand={(block as any)[leftKey]}
                operandKey={leftKey}
                title={leftTitle}
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
                t={t}
              />
              <div className="flex items-center justify-center pt-8">
                <span className="font-bold text-lg text-primary">
                  {operator}
                </span>
              </div>
              <OperandParameterGroup
                operand={(block as any)[rightKey]}
                operandKey={rightKey}
                title={rightTitle}
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
                t={t}
              />
            </div>
          );
        }

        case "state": {
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-4">
              <OperandParameterGroup
                operand={block.indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
                t={t}
              />
              <OperandParameterGroup
                operand={block.lowerBound}
                operandKey="lowerBound"
                title="operandTitles.min"
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
                t={t}
              />
              <OperandParameterGroup
                operand={block.upperBound}
                operandKey="upperBound"
                title="operandTitles.max"
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
                t={t}
              />
            </div>
          );
        }

        case "channel": {
          // tRule에서 번역 키에 매핑
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
              <OperandParameterGroup
                operand={(block as any).indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
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
              <OperandParameterGroup
                operand={(block as any).indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
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
              <OperandParameterGroup
                operand={(block as any).indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
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
                value={block.patternKey} // 패턴 키는 번역하지 않고 그대로 표시
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
          {formatRuleTitle(block, indicatorDefinitions, t, tRule)}{" "}
        </p>

        {renderRuleBody()}

        {block.children && block.children.length > 0 && (
          <div className="mt-4 pl-4 border-l-2 border-amber-500/50 relative">
            <span className="absolute -left-px top-2 -translate-x-1/2 bg-card text-xs font-semibold text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-500/50">
              {t("andOperator")}
            </span>
            <div className="pt-4 space-y-3">
              {block.children.map((childBlock, childIndex) => (
                <RuleBlock
                  key={childBlock.id}
                  block={childBlock}
                  blockIndex={childIndex}
                  pathPrefix={`${currentBlockPath}.children.blocks`}
                  indicatorDefinitions={indicatorDefinitions}
                  control={control}
                  fields={fields}
                  t={t}
                  tRule={tRule}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);
RuleBlock.displayName = "RuleBlock";

/**
 * TP/SL 설정 섹션 컴포넌트
 */
const TpslSection = ({
  control,
  fields,
  t,
}: {
  control: any;
  fields: any[];
  t: TFunction;
}) => {
  const tpslFields = fields.filter((f) => f.path.startsWith("tpslLogic"));

  if (tpslFields.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        {t("tpslTitle")}
      </h4>
      <div className="p-3 rounded-md border bg-card grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {tpslFields.map((field) => {
          const pathParts = field.path.split(".");
          const paramKey = pathParts[pathParts.length - 1];
          const fieldPath = `overrides.${fields.indexOf(field)}.value`;

          const label = t(`paramLabels.${paramKey}`, undefined, paramKey);

          return (
            <ParameterInput
              key={field.id}
              control={control}
              fieldPath={fieldPath}
              label={label}
              tooltip={`경로: ${field.path}`}
            />
          );
        })}
      </div>
    </div>
  );
};

/**
 * 파라미터 오버라이드를 위한 메인 컴포넌트
 */
export const ParameterTreeView = ({
  strategy,
  indicatorDefinitions,
  control,
  fields,
}: ParameterTreeViewProps) => {
  const t = useTranslations("ParameterTreeView");
  const tRule = useTranslations("RuleBlock");

  const sections = [
    {
      titleKey: "sections.longEntry",
      rules: strategy.longEntryRules,
      type: "longEntryRules",
    },
    {
      titleKey: "sections.longExit",
      rules: strategy.longExitRules,
      type: "longExitRules",
    },
    {
      titleKey: "sections.shortEntry",
      rules: strategy.shortEntryRules,
      type: "shortEntryRules",
    },
    {
      titleKey: "sections.shortExit",
      rules: strategy.shortExitRules,
      type: "shortExitRules",
    },
  ];

  if (fields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("noParams")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <TpslSection control={control} fields={fields} t={t} />

        {sections.map((sec, secIndex) => {
          const sectionFields = fields.filter((f: any) =>
            f.path.startsWith(sec.type)
          );
          if (
            !sec.rules ||
            sec.rules.blocks.length === 0 ||
            sectionFields.length === 0
          )
            return null;

          return (
            <div key={sec.type}>
              <h4 className="text-sm font-semibold mb-2">{t(sec.titleKey)}</h4>
              <div className="space-y-3">
                {sec.rules.blocks.map((block, blockIndex) => (
                  <React.Fragment key={block.id}>
                    <RuleBlock
                      block={block}
                      blockIndex={blockIndex}
                      pathPrefix={`${sec.type}.blocks`}
                      indicatorDefinitions={indicatorDefinitions}
                      control={control}
                      fields={fields}
                      t={t}
                      tRule={tRule}
                    />
                    {sec.rules && blockIndex < sec.rules.blocks.length - 1 && (
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
