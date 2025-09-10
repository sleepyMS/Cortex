// file: frontend/src/components/domain/backtesting/BacktestParameters.tsx
"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Backtest } from "@/types/backtest";
import { LogicBlock } from "@/types/strategy";
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
import { Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

// --- Props 타입 정의 ---
interface BacktestParametersProps {
  backtest: Backtest;
}

interface RuleDisplayProps {
  block: LogicBlock;
  definitions: Record<string, IndicatorMetadata>;
  overriddenPaths: Set<string>;
  pathPrefix: string;
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

const formatRuleTitle = (
  block: LogicBlock,
  definitions: Record<string, IndicatorMetadata>
): string => {
  try {
    switch (block.type) {
      case "comparison":
        return `${formatOperand(block.operandA, definitions)} ${
          block.operator
        } ${formatOperand(block.operandB, definitions)}`;
      case "crossover":
        return `${formatOperand(block.mainLine, definitions)}가 ${formatOperand(
          block.signalLine,
          definitions
        )}를 ${block.crossDirection === "above" ? "상향 돌파" : "하향 돌파"}`;
      case "state":
        return `${formatOperand(block.indicator, definitions)}가 ${
          block.lowerBound
        }과(와) ${block.upperBound} 사이`;
      default:
        return `${block.type} 규칙`;
    }
  } catch (e) {
    return "규칙 해석 오류";
  }
};

// 중첩된 객체에서 특정 경로의 값을 안전하게 가져오는 헬퍼 함수
const getValueFromPath = (obj: any, path: string): any => {
  return path.split(".").reduce((acc, part) => {
    if (acc === undefined || acc === null) return undefined;
    const index = !isNaN(Number(part)) ? Number(part) : part;
    return acc[index];
  }, obj);
};

/**
 * 재귀적으로 규칙을 표시하는 내부 컴포넌트
 */
const RuleDisplay = React.memo(
  ({ block, definitions, overriddenPaths, pathPrefix }: RuleDisplayProps) => {
    const renderValue = (label: string, value: any, path: string) => {
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
                  <p>이 값은 오버라이드 되었습니다.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    };

    return (
      <div className="p-3 rounded-md border bg-muted/50">
        <p className="text-sm font-medium mb-2">
          {formatRuleTitle(block, definitions)}
        </p>
        <div className="space-y-1.5 pl-2">
          {Object.entries(block).map(([key, value]) => {
            if (typeof value === "number") {
              return renderValue(key, value, `${pathPrefix}.${key}`);
            }
            if (value && typeof value === "object" && "values" in value) {
              return Object.entries(value.values).map(
                ([paramKey, paramValue]) =>
                  renderValue(
                    `${value.indicatorKey} - ${paramKey}`,
                    paramValue,
                    `${pathPrefix}.${key}.values.${paramKey}`
                  )
              );
            }
            return null;
          })}
        </div>
        {block.children && block.children.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-amber-500/50 relative">
            <span className="absolute -left-px top-2 -translate-x-1/2 bg-muted/50 text-xs font-semibold text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-500/50">
              AND
            </span>
            <div className="pt-4 space-y-2">
              {block.children.map((child: LogicBlock, index: number) => (
                <RuleDisplay
                  key={child.id}
                  block={child}
                  definitions={definitions}
                  overriddenPaths={overriddenPaths}
                  pathPrefix={`${pathPrefix}.children.blocks.${index}`}
                />
              ))}
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
}: any) => {
  if (!rules || rules.blocks.length === 0) {
    return (
      <div className="space-y-3">
        <h4 className="text-base font-semibold mb-3">{title}</h4>
        <div className="p-4 text-center border rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">설정된 규칙 없음</p>
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
          />
          {index < rules.blocks.length - 1 && (
            <div className="flex items-center gap-2">
              <div className="flex-grow border-t border-dashed"></div>
              <span className="text-xs font-semibold text-muted-foreground">
                OR
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
 * 백테스트 파라미터 표시를 위한 메인 컴포넌트
 */
export const BacktestParameters = ({ backtest }: BacktestParametersProps) => {
  const t = useTranslations("BacktestDetailPage.Parameters");
  const { metadata } = useIndicatorStore();

  const indicatorDefinitions = useMemo(
    () =>
      metadata.reduce((acc, meta) => {
        acc[meta.indicatorKey] = meta;
        return acc;
      }, {} as Record<string, IndicatorMetadata>),
    [metadata]
  );

  const overriddenPaths = useMemo(() => {
    const originalStrategy = backtest.strategy; // 원본 전략
    const snapshotStrategy = backtest.strategySnapshot; // 실행 시점 스냅샷
    const overrides = backtest.parameters.parameters.overrides || [];
    const changedPaths = new Set<string>();

    // overrides 배열에 있는 모든 경로에 대해 값을 비교
    for (const override of overrides) {
      const originalValue = getValueFromPath(originalStrategy, override.path);
      const snapshotValue = getValueFromPath(snapshotStrategy, override.path);

      // 두 값이 실제로 다를 경우에만 Set에 추가
      if (originalValue !== snapshotValue) {
        changedPaths.add(override.path);
      }
    }
    return changedPaths;
  }, [
    backtest.strategy,
    backtest.strategySnapshot,
    backtest.parameters.parameters.overrides,
  ]);

  const snapshot = backtest.strategySnapshot;
  if (!snapshot) return null;

  const execParams = backtest.parameters.parameters;
  const tpslParams = execParams.tpslLogic || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-base font-semibold mb-3">
            {t("executionParams")}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 border rounded-lg bg-muted/50">
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("leverage")}</p>
              <p className="font-semibold">{execParams.leverage}x</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("fee")}</p>
              <p className="font-semibold">{execParams.fee}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("slippage")}</p>
              <p className="font-semibold">{execParams.slippage}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("trailingStop")}</p>
              <p className="font-semibold">
                {tpslParams.trailingStopEnabled ? t("enabled") : t("disabled")}
              </p>
            </div>
            {tpslParams.trailingStopEnabled && (
              <>
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    {t("trailingActivation")}
                  </p>
                  <p className="font-semibold">
                    {tpslParams.trailingStopActivationPct}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    {t("trailingCallback")}
                  </p>
                  <p className="font-semibold">
                    {tpslParams.trailingStopCallbackPct}%
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-8 pt-4 border-t">
          <RuleSection
            title={t("longEntry")}
            rules={snapshot.longEntryRules}
            definitions={indicatorDefinitions}
            overriddenPaths={overriddenPaths}
            pathPrefix="longEntryRules"
          />
          <RuleSection
            title={t("longExit")}
            rules={snapshot.longExitRules}
            definitions={indicatorDefinitions}
            overriddenPaths={overriddenPaths}
            pathPrefix="longExitRules"
          />
          <RuleSection
            title={t("shortEntry")}
            rules={snapshot.shortEntryRules}
            definitions={indicatorDefinitions}
            overriddenPaths={overriddenPaths}
            pathPrefix="shortEntryRules"
          />
          <RuleSection
            title={t("shortExit")}
            rules={snapshot.shortExitRules}
            definitions={indicatorDefinitions}
            overriddenPaths={overriddenPaths}
            pathPrefix="shortExitRules"
          />
        </div>
      </CardContent>
    </Card>
  );
};
