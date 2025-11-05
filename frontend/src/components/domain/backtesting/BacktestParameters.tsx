// file: frontend/src/components/domain/backtesting/BacktestParameters.tsx
"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Backtest } from "@/types/backtest";
import { LogicBlock, IndicatorValue } from "@/types/strategy";
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
import { Zap, MoveUp, MoveDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

// next-intl에서 타입 임포트
type TFunction = ReturnType<typeof useTranslations>;

// --- Props 타입 정의 ---
interface BacktestParametersProps {
  backtest: Backtest;
}

interface RuleDisplayProps {
  block: LogicBlock;
  definitions: Record<string, IndicatorMetadata>;
  overriddenPaths: Set<string>;
  pathPrefix: string;
  t: TFunction;
  tRule: TFunction;
}

// --- 헬퍼 함수 ---
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

// [수정] i18n을 사용하도록 formatRuleTitle 변경
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

const getOriginalValueByformPath = (
  originalStrategy: any,
  formPath: string
): any => {
  // (함수 내용 동일)
  const dataPath = formPath.replace(/\.children\.blocks/g, ".children");
  return dataPath.split(".").reduce((acc, part) => {
    if (acc === undefined || acc === null) return undefined;
    if (Array.isArray(acc) && isNaN(Number(part))) return acc;
    const index = !isNaN(Number(part)) ? Number(part) : part;
    return acc[index];
  }, originalStrategy);
};

// [신규] 기존 renderValue를 재사용 가능한 컴포넌트로 분리
const ParameterLineItem = React.memo(
  ({
    label,
    value,
    path,
    overriddenPaths,
    t,
  }: {
    label: string;
    value: any;
    path: string;
    overriddenPaths: Set<string>;
    t: TFunction;
  }) => {
    const isOverridden = overriddenPaths.has(path);
    return (
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">{label}</span>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 font-mono">
                {isOverridden && (
                  <Zap className="h-3.5 w-3.5 text-yellow-500" />
                )}
                <Badge variant={isOverridden ? "default" : "secondary"}>
                  {String(value)}
                </Badge>
              </div>
            </TooltipTrigger>
            {isOverridden && (
              <TooltipContent>
                <p>{t("overriddenTooltip")}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }
);
ParameterLineItem.displayName = "ParameterLineItem";

// [신규] ParameterTreeView의 OperandParameterGroup에 대응하는 읽기 전용 컴포넌트
const OperandDisplayGroup = React.memo(
  ({
    operand,
    operandKey, // "operandA", "lowerBound" 등
    title, // "operandTitles.baseA" 등 i18n 키
    currentBlockPath,
    overriddenPaths,
    definitions,
    t,
  }: {
    operand: IndicatorValue | number | null;
    operandKey: string;
    title: string;
    currentBlockPath: string;
    overriddenPaths: Set<string>;
    definitions: Record<string, IndicatorMetadata>;
    t: TFunction;
  }) => {
    const operandPathPrefix = `${currentBlockPath}.${operandKey}`;

    // 1. 피연산자 자체가 '단순 값'인 경우 (e.g., operandB: 70)
    if (typeof operand !== "object" || operand === null) {
      return (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg h-full flex flex-col justify-center">
          <ParameterLineItem
            label={t(title)}
            value={operand}
            path={operandPathPrefix}
            overriddenPaths={overriddenPaths}
            t={t}
          />
        </div>
      );
    }

    // 2. 피연산자가 '지표'인 경우 (e.g., operandA: { indicatorKey: 'RSI', ... })
    const operandTitle = formatOperand(operand, definitions);
    const displayTitle = `${t(title)} - ${operandTitle}`;

    // 2.1. 지표의 내부 파라미터 (e.g., { "period": 14 })
    const indicatorParamPaths = Object.keys(operand.values || {}).map(
      (paramKey) => ({
        key: paramKey,
        path: `${operandPathPrefix}.values.${paramKey}`,
        value: (operand.values as any)[paramKey],
      })
    );

    return (
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg h-full flex flex-col">
        <h5 className="text-xs font-semibold text-muted-foreground truncate">
          {displayTitle}
        </h5>
        <div className="flex-grow pt-2 space-y-1.5">
          {indicatorParamPaths.length > 0 ? (
            indicatorParamPaths.map((param) => {
              // 'indicator.ts'의 label을 가져오려고 시도
              const def = definitions[operand.indicatorKey];
              const paramDef = def?.parameters[param.key];
              const label = paramDef?.label || param.key;

              return (
                <ParameterLineItem
                  key={param.path}
                  label={label}
                  value={param.value}
                  path={param.path}
                  overriddenPaths={overriddenPaths}
                  t={t}
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

/**
 * [수정] 재귀적으로 규칙을 표시하는 핵심 컴포넌트
 */
const RuleDisplay = React.memo(
  ({
    block,
    definitions,
    overriddenPaths,
    pathPrefix,
    t,
    tRule,
  }: RuleDisplayProps) => {
    const currentBlockPath = pathPrefix; // pathPrefix 자체가 현재 블록의 경로임

    /**
     * [신규] 규칙 타입별로 다른 UI를 렌더링
     */
    const renderRuleBody = () => {
      switch (block.type) {
        // A vs B (좌/우 분리)
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
                overriddenPaths={overriddenPaths}
                definitions={definitions}
                t={t}
              />
              <div className="flex items-center justify-center pt-8">
                <span className="font-bold text-lg text-primary">
                  {operator}
                </span>
              </div>
              <OperandDisplayGroup
                operand={(block as any)[rightKey]}
                operandKey={rightKey}
                title={rightTitle}
                currentBlockPath={currentBlockPath}
                overriddenPaths={overriddenPaths}
                definitions={definitions}
                t={t}
              />
            </div>
          );
        }

        // 지표 + 값 + 값 (3단 분리)
        case "state": {
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-4">
              <OperandDisplayGroup
                operand={block.indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                currentBlockPath={currentBlockPath}
                overriddenPaths={overriddenPaths}
                definitions={definitions}
                t={t}
              />
              <OperandDisplayGroup
                operand={block.lowerBound}
                operandKey="lowerBound"
                title="operandTitles.min"
                currentBlockPath={currentBlockPath}
                overriddenPaths={overriddenPaths}
                definitions={definitions}
                t={t}
              />
              <OperandDisplayGroup
                operand={block.upperBound}
                operandKey="upperBound"
                title="operandTitles.max"
                currentBlockPath={currentBlockPath}
                overriddenPaths={overriddenPaths}
                definitions={definitions}
                t={t}
              />
            </div>
          );
        }

        // (기타 케이스들은 필요에 따라 추가)

        default:
          // 기본값: 기존처럼 파라미터 나열 (단, OperandDisplayGroup 사용)
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 items-stretch gap-4">
              <OperandDisplayGroup
                operand={(block as any).indicator}
                operandKey="indicator"
                title="operandTitles.indicator"
                currentBlockPath={currentBlockPath}
                overriddenPaths={overriddenPaths}
                definitions={definitions}
                t={t}
              />
              <div className="p-3 rounded-lg h-full flex items-center justify-center bg-muted/50">
                <p className="text-xs text-muted-foreground text-center">
                  {t("unknownRuleType")}
                </p>
              </div>
            </div>
          );
      }
    };

    return (
      <div className="p-3 rounded-md border bg-card">
        <p className="text-sm font-semibold text-primary mb-3">
          {formatRuleTitle(block, definitions, t, tRule)}
        </p>

        {/* [수정] 규칙 타입별 본문 렌더링 */}
        {renderRuleBody()}

        {/* 자식 규칙(AND 조건)이 있는 경우 재귀 호출 */}
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
                    overriddenPaths={overriddenPaths}
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

/**
 * 단일 규칙 섹션(예: 롱 진입)을 렌더링하는 내부 컴포넌트
 */
const RuleSection = ({
  title,
  rules,
  definitions,
  overriddenPaths,
  pathPrefix,
  t, // t, tRule 받기
  tRule,
}: {
  title: string;
  rules: { blocks: LogicBlock[] } | null | undefined;
  definitions: Record<string, IndicatorMetadata>;
  overriddenPaths: Set<string>;
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
            overriddenPaths={overriddenPaths}
            pathPrefix={`${pathPrefix}.blocks.${index}`}
            t={t} // t, tRule 전달
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

/**
 * 파라미터 값 하나를 표시하는 재사용 가능한 내부 컴포넌트
 */
const ExecutionParameterDisplay = ({
  label,
  value,
  unit = "",
  path,
  overriddenPaths,
  t, // t 함수 받기
}: {
  label: string;
  value: any;
  unit?: string;
  path: string;
  overriddenPaths: Set<string>;
  t: TFunction;
}) => {
  const isOverridden = overriddenPaths.has(path);
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5 font-semibold">
        {isOverridden && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger>
                <Zap className="h-4 w-4 text-yellow-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("overriddenTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <span>
          {value}
          {unit}
        </span>
      </div>
    </div>
  );
};

/**
 * 백테스트 파라미터 표시를 위한 메인 컴포넌트
 */
export const BacktestParameters = ({ backtest }: BacktestParametersProps) => {
  const t = useTranslations("BacktestDetailPage.Parameters");
  const tRule = useTranslations("RuleBlock"); // RuleBlock의 crossDirection 등을 위함
  const { metadata } = useIndicatorStore();

  const indicatorDefinitions = useMemo(
    () =>
      metadata.reduce((acc, meta) => {
        acc[meta.key] = meta;
        return acc;
      }, {} as Record<string, IndicatorMetadata>),
    [metadata]
  );

  const overriddenPaths = useMemo(() => {
    // (함수 내용 동일)
    const originalStrategy = backtest.strategy;
    const overrides = backtest.parameters.parameters.overrides || [];
    const changedPaths = new Set<string>();

    for (const override of overrides) {
      const originalValue = getOriginalValueByformPath(
        originalStrategy,
        override.path
      );
      const currentValue = override.value;
      if (originalValue !== currentValue) {
        changedPaths.add(override.path);
      }
    }
    return changedPaths;
  }, [backtest.strategy, backtest.parameters.parameters.overrides]);

  const snapshot = backtest.strategySnapshot;
  if (!snapshot) return null;

  const execParams = backtest.parameters.parameters;
  const tpslSnapshot = snapshot.tpslLogic || {};
  const hasTpslRules =
    tpslSnapshot &&
    Object.values(tpslSnapshot).some((v) => typeof v === "number");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 1. 실행 파라미터 섹션 */}
        <div>
          <h4 className="text-base font-semibold mb-3">
            {t("executionParams")}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 border rounded-lg bg-muted/50">
            <ExecutionParameterDisplay
              label={t("leverage")}
              value={execParams.leverage}
              unit="x"
              path="parameters.leverage"
              overriddenPaths={overriddenPaths}
              t={t}
            />
            <ExecutionParameterDisplay
              label={t("fee")}
              value={execParams.fee}
              unit="%"
              path="parameters.fee"
              overriddenPaths={overriddenPaths}
              t={t}
            />
            <ExecutionParameterDisplay
              label={t("slippage")}
              value={execParams.slippage}
              unit="%"
              path="parameters.slippage"
              overriddenPaths={overriddenPaths}
              t={t}
            />
            <ExecutionParameterDisplay
              label={t("trailingStop")}
              value={
                execParams.tpslLogic?.trailingStopEnabled
                  ? t("enabled")
                  : t("disabled")
              }
              path="parameters.tpslLogic.trailingStopEnabled"
              overriddenPaths={overriddenPaths}
              t={t}
            />
          </div>
        </div>

        {/* TP/SL 파라미터 섹션 */}
        <div>
          <h4 className="text-base font-semibold mb-3">{t("tpslTitle")}</h4>
          {hasTpslRules ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 border rounded-lg bg-muted/50">
              {Object.entries(tpslSnapshot).map(([key, value]) => {
                if (typeof value !== "number") return null;
                const path = `tpslLogic.${key}`;
                const label = t(`paramLabels.${key}`);
                return (
                  <ExecutionParameterDisplay
                    key={path}
                    label={label}
                    value={value}
                    unit={key.toLowerCase().includes("pct") ? "%" : ""}
                    path={path}
                    overriddenPaths={overriddenPaths}
                    t={t}
                  />
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t("noRules")}</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-8 pt-4 border-t">
          <RuleSection
            title={t("longEntry")}
            rules={snapshot.longEntryRules}
            definitions={indicatorDefinitions}
            overriddenPaths={overriddenPaths}
            pathPrefix="longEntryRules"
            t={t}
            tRule={tRule}
          />
          <RuleSection
            title={t("longExit")}
            rules={snapshot.longExitRules}
            definitions={indicatorDefinitions}
            overriddenPaths={overriddenPaths}
            pathPrefix="longExitRules"
            t={t}
            tRule={tRule}
          />
          <RuleSection
            title={t("shortEntry")}
            rules={snapshot.shortEntryRules}
            definitions={indicatorDefinitions}
            overriddenPaths={overriddenPaths}
            pathPrefix="shortEntryRules"
            t={t}
            tRule={tRule}
          />
          <RuleSection
            title={t("shortExit")}
            rules={snapshot.shortExitRules}
            definitions={indicatorDefinitions}
            overriddenPaths={overriddenPaths}
            pathPrefix="shortExitRules"
            t={t}
            tRule={tRule}
          />
        </div>
      </CardContent>
    </Card>
  );
};
