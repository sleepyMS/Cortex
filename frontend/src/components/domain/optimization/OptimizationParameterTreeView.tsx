// file: frontend/src/components/domain/optimization/OptimizationParameterTreeView.tsx

"use client";

import React from "react";
import { Controller, useWatch } from "react-hook-form";
import { LogicBlock, Strategy, IndicatorValue } from "@/types/strategy";
import { IndicatorMetadata } from "@/types/indicator";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, MoveUp, MoveDown, Wand2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
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
import { FormItem, FormControl } from "@/components/ui/Form";

type TFunction = ReturnType<typeof useTranslations>;

// --- Props 타입 정의 ---

interface OptimizationParameterTreeViewProps {
  strategy: Strategy;
  indicatorDefinitions: Record<string, IndicatorMetadata>;
  control: any;
  fields: any[];
  setValue: any;
}

interface RuleBlockProps {
  block: LogicBlock;
  blockIndex: number;
  pathPrefix: string;
  indicatorDefinitions: Record<string, IndicatorMetadata>;
  control: any;
  fields: any[];
  setValue: any;
  t: TFunction;
  tRule: TFunction;
}

// --- 헬퍼 함수 ---
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

// --- 핵심 컴포넌트: 범위 입력 그룹 ---

const ParameterRangeInputGroup = React.memo(
  ({
    fieldPathPrefix,
    label,
    tooltip,
    control,
    setValue,
    paramMetadata,
  }: {
    fieldPathPrefix: string;
    label: string;
    tooltip: string;
    control: any;
    setValue: any;
    paramMetadata?: any;
  }) => {
    const isSelectedPath = `${fieldPathPrefix}.isSelected`;
    const minPath = `${fieldPathPrefix}.min`;
    const maxPath = `${fieldPathPrefix}.max`;
    const stepPath = `${fieldPathPrefix}.step`;

    const isSelected = useWatch({ control, name: isSelectedPath });
    // copy 버튼 제거로 currentMin watch도 불필요해져 제거함

    const handleSmartInit = () => {
      if (paramMetadata?.optimization_range) {
        const [optMin, optMax] = paramMetadata.optimization_range;
        setValue(minPath, optMin);
        setValue(maxPath, optMax);
      }
      if (paramMetadata?.step) {
        setValue(stepPath, paramMetadata.step);
      }
    };

    return (
      <div
        className={cn(
          "space-y-2 p-2 rounded-md border transition-colors",
          isSelected
            ? "bg-primary/5 border-primary/30"
            : "bg-muted/30 border-transparent"
        )}
      >
        <div className="flex items-center justify-between">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Label
                  htmlFor={isSelectedPath}
                  className="text-xs font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Controller
                    control={control}
                    name={isSelectedPath}
                    render={({ field }) => (
                      <Checkbox
                        id={isSelectedPath}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="h-4 w-4"
                      />
                    )}
                  />
                  <span className={cn(isSelected && "text-primary")}>
                    {label}
                  </span>
                </Label>
              </TooltipTrigger>
              <TooltipContent side="top" align="start">
                <p className="text-xs font-mono">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isSelected && paramMetadata?.optimization_range && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    onClick={handleSmartInit}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apply Recommended Range</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {isSelected ? (
          <div className="flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Min Input */}
            <Controller
              control={control}
              name={minPath}
              render={({ field, fieldState: { error } }) => (
                <FormItem className="flex-1 min-w-[70px]">
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Min"
                      className={cn(
                        "h-8 text-xs px-2",
                        error && "border-destructive"
                      )}
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {/* Max Input */}
            <Controller
              control={control}
              name={maxPath}
              render={({ field, fieldState: { error } }) => (
                <FormItem className="flex-1 min-w-[70px]">
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Max"
                      className={cn(
                        "h-8 text-xs px-2",
                        error && "border-destructive"
                      )}
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {/* Step Input */}
            <Controller
              control={control}
              name={stepPath}
              render={({ field, fieldState: { error } }) => (
                <FormItem className="w-[60px] shrink-0">
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Step"
                      className={cn(
                        "h-8 text-xs px-2",
                        error && "border-destructive"
                      )}
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        ) : (
          <div className="pl-6">
            <Controller
              control={control}
              name={minPath}
              render={({ field }) => (
                <Badge variant="secondary" className="font-mono text-xs">
                  Current: {field.value}
                </Badge>
              )}
            />
          </div>
        )}
      </div>
    );
  }
);
ParameterRangeInputGroup.displayName = "ParameterRangeInputGroup";

// --- (이하 OperandParameterGroup, RuleBlock, OptimizationParameterTreeView는 이전과 동일) ---
// 이전 코드에서 변경된 부분만 위에 반영했습니다. 아래는 전체 코드를 유지하기 위한 반복입니다.

const OperandParameterGroup = React.memo(
  ({
    operand,
    operandKey,
    title,
    currentBlockPath,
    fields,
    control,
    setValue,
    indicatorDefinitions,
    t,
  }: {
    operand: IndicatorValue | number | null;
    operandKey: string;
    title: string;
    currentBlockPath: string;
    fields: any[];
    control: any;
    setValue: any;
    indicatorDefinitions: Record<string, IndicatorMetadata>;
    t: TFunction;
  }) => {
    const operandPathPrefix = `${currentBlockPath}.${operandKey}`;
    const directValueField = fields.find((f) => f.path === operandPathPrefix);
    const indicatorParamFields = fields.filter(
      (f) => f.path.startsWith(operandPathPrefix) && f.path.includes(".values.")
    );

    if (directValueField) {
      return (
        <div className="space-y-3 p-3 bg-card rounded-lg border h-full flex flex-col justify-center">
          <ParameterRangeInputGroup
            key={directValueField.id}
            control={control}
            setValue={setValue}
            fieldPathPrefix={`parameterRanges.${fields.indexOf(
              directValueField
            )}`}
            label={t(title)}
            tooltip={`Path: ${directValueField.path}`}
          />
        </div>
      );
    }

    const operandTitle = formatOperand(operand, indicatorDefinitions);
    return (
      <div className="space-y-3 p-3 bg-card rounded-lg border h-full flex flex-col">
        <h5
          className="text-xs font-semibold text-muted-foreground truncate"
          title={operandTitle}
        >
          {t(title)} - {operandTitle}
        </h5>
        <div className="flex-grow space-y-2">
          {indicatorParamFields.length > 0 ? (
            indicatorParamFields.map((field) => {
              const pathParts = field.path.split(".");
              const paramKey = pathParts[pathParts.length - 1];
              const fieldPathPrefix = `parameterRanges.${fields.indexOf(
                field
              )}`;

              const indicatorKey = (operand as IndicatorValue)?.indicatorKey;
              const definition = indicatorDefinitions[indicatorKey];
              const paramDefinition = definition?.parameters?.[paramKey];
              const label = paramDefinition?.label || paramKey;

              return (
                <ParameterRangeInputGroup
                  key={field.id}
                  control={control}
                  setValue={setValue}
                  fieldPathPrefix={fieldPathPrefix}
                  label={label}
                  tooltip={`Path: ${field.path}`}
                  paramMetadata={paramDefinition}
                />
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full min-h-[60px] bg-muted/20 rounded">
              <p className="text-xs text-muted-foreground text-center">
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

const RuleBlock = React.memo(
  ({
    block,
    blockIndex,
    pathPrefix,
    indicatorDefinitions,
    control,
    fields,
    setValue,
    t,
    tRule,
  }: RuleBlockProps) => {
    const currentBlockPath = `${pathPrefix}.${blockIndex}`;

    const renderRuleBody = () => {
      const commonProps = {
        currentBlockPath,
        fields,
        control,
        setValue,
        indicatorDefinitions,
        t,
      };

      switch (block.type) {
        case "comparison":
        case "crossover": {
          const isComparison = block.type === "comparison";
          const leftKey = isComparison ? "operandA" : "mainLine";
          const rightKey = isComparison ? "operandB" : "signalLine";
          const operator = isComparison ? (
            block.operator
          ) : block.crossDirection === "above" ? (
            <MoveUp className="h-5 w-5 text-green-500" />
          ) : (
            <MoveDown className="h-5 w-5 text-red-500" />
          );

          return (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
              <OperandParameterGroup
                operand={(block as any)[leftKey]}
                operandKey={leftKey}
                title={
                  isComparison
                    ? "operandTitles.baseA"
                    : "operandTitles.mainLine"
                }
                {...commonProps}
              />
              <div className="flex items-center justify-center py-2 lg:py-0">
                <span className="font-bold text-lg text-muted-foreground/50">
                  {operator}
                </span>
              </div>
              <OperandParameterGroup
                operand={(block as any)[rightKey]}
                operandKey={rightKey}
                title={
                  isComparison
                    ? "operandTitles.compareToB"
                    : "operandTitles.signalLine"
                }
                {...commonProps}
              />
            </div>
          );
        }
        case "state": {
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 items-stretch gap-3">
              <OperandParameterGroup
                operand={block.indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                {...commonProps}
              />
              <OperandParameterGroup
                operand={block.lowerBound}
                operandKey="lowerBound"
                title="operandTitles.min"
                {...commonProps}
              />
              <OperandParameterGroup
                operand={block.upperBound}
                operandKey="upperBound"
                title="operandTitles.max"
                {...commonProps}
              />
            </div>
          );
        }
        default:
          return (
            <div className="p-4 text-center bg-muted/20 rounded">
              <p className="text-sm text-muted-foreground">
                {t("noParamsForRule", { type: block.type })}
              </p>
            </div>
          );
      }
    };

    return (
      <div className="p-4 rounded-lg border bg-muted/10">
        <p className="text-sm font-semibold text-primary mb-4">
          {formatRuleTitle(block, indicatorDefinitions, t, tRule)}
        </p>
        {renderRuleBody()}
        {block.children && block.children.length > 0 && (
          <div className="mt-4 pl-4 border-l-2 border-dashed border-primary/30">
            <div className="py-2">
              <Badge variant="outline" className="text-xs bg-background">
                {t("andOperator")}
              </Badge>
            </div>
            <div className="space-y-4">
              {block.children.map((childBlock, childIndex) => (
                <RuleBlock
                  key={childBlock.id}
                  block={childBlock}
                  blockIndex={childIndex}
                  pathPrefix={`${currentBlockPath}.children.blocks`}
                  indicatorDefinitions={indicatorDefinitions}
                  control={control}
                  fields={fields}
                  setValue={setValue}
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

const TpslSection = ({
  control,
  fields,
  setValue,
  t,
}: {
  control: any;
  fields: any[];
  setValue: any;
  t: TFunction;
}) => {
  const tpslFields = fields.filter((f) => f.path.startsWith("tpslLogic"));
  if (tpslFields.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        {t("tpslTitle")}
      </h4>
      <div className="p-4 rounded-lg border bg-card grid grid-cols-1 md:grid-cols-2 gap-4">
        {tpslFields.map((field) => {
          const pathParts = field.path.split(".");
          const paramKey = pathParts[pathParts.length - 1];
          const fieldPathPrefix = `parameterRanges.${fields.indexOf(field)}`;
          const label = t(`paramLabels.${paramKey}`, undefined, paramKey);

          const dummyMetadata = {
            step: paramKey.toLowerCase().includes("pct") ? 0.1 : 1,
            optimization_range: paramKey.toLowerCase().includes("pct")
              ? [1.0, 10.0]
              : [5, 50],
          };

          return (
            <ParameterRangeInputGroup
              key={field.id}
              control={control}
              setValue={setValue}
              fieldPathPrefix={fieldPathPrefix}
              label={label}
              tooltip={`Path: ${field.path}`}
              paramMetadata={dummyMetadata}
            />
          );
        })}
      </div>
    </div>
  );
};

export const OptimizationParameterTreeView = ({
  strategy,
  indicatorDefinitions,
  control,
  fields,
  setValue,
}: OptimizationParameterTreeViewProps) => {
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
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("noParams")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("descriptionOptimize")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <TpslSection
          control={control}
          fields={fields}
          setValue={setValue}
          t={t}
        />
        {sections.map((sec) => {
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
              <div className="flex items-center gap-4 mb-4">
                <h4 className="text-sm font-semibold whitespace-nowrap">
                  {t(sec.titleKey)}
                </h4>
                <div className="h-px bg-border flex-grow" />
              </div>
              <div className="space-y-4">
                {sec.rules.blocks.map((block, index) => (
                  <React.Fragment key={block.id}>
                    <RuleBlock
                      block={block}
                      blockIndex={index}
                      pathPrefix={`${sec.type}.blocks`}
                      indicatorDefinitions={indicatorDefinitions}
                      control={control}
                      fields={fields}
                      setValue={setValue}
                      t={t}
                      tRule={tRule}
                    />
                    {index < sec.rules!.blocks.length - 1 && (
                      <div className="flex items-center justify-center py-2">
                        <Badge variant="secondary" className="text-xs">
                          {t("orOperator")}
                        </Badge>
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
