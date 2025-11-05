// file: frontend/src/components/domain/backtesting/ParameterTreeView.tsx

"use client";

import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { LogicBlock, Strategy } from "@/types/strategy";
import { IndicatorMetadata } from "@/types/indicator";

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
import { Percent, SlidersHorizontal } from "lucide-react";

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
            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor={fieldPath}
                      className="text-xs text-muted-foreground cursor-help"
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
  operand: any,
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
  definitions: Record<string, IndicatorMetadata>
): string => {
  try {
    switch (block.type) {
      case "comparison":
        return `${formatOperand(block.operandA, definitions)} ${
          block.operator
        } ${formatOperand(block.operandB, definitions)}`;
      case "crossover":
        const crossDirectionText =
          block.crossDirection === "above" ? "상향 돌파" : "하향 돌파";
        return `${formatOperand(block.mainLine, definitions)}가 ${formatOperand(
          block.signalLine,
          definitions
        )}를 ${crossDirectionText}`;
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

// --- 간단한 한글 레이블 맵 ---
const directParamLabels: Record<string, string> = {
  lowerBound: "최소값",
  upperBound: "최대값",
  operandB: "비교값",
  takeProfitPct: "Take Profit (%)",
  stopLossPct: "Stop Loss (%)",
  atrPeriod: "ATR 기간",
  atrStopLossMultiplier: "ATR 손절 배수",
  atrTakeProfitMultiplier: "ATR 익절 배수",
};

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
  }: RuleBlockProps) => {
    const currentBlockPath = `${pathPrefix}.${blockIndex}`;

    // 자식 파라미터는 제외하고 현재 블록의 파라미터만 정확히 필터링
    const directBlockFields = fields.filter((f) => {
      if (!f.path.startsWith(currentBlockPath)) return false;
      const subPath = f.path.substring(currentBlockPath.length + 1);
      // 'children'으로 시작하는 경로는 자식의 파라미터이므로 제외
      return !subPath.startsWith("children");
    });

    return (
      <div className="p-3 rounded-md border bg-card">
        <p className="text-sm font-semibold text-primary mb-3">
          {formatRuleTitle(block, indicatorDefinitions)}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {directBlockFields.map((field) => {
            const pathParts = field.path.split(".");
            const paramKey = pathParts[pathParts.length - 1];
            const fieldPath = `overrides.${fields.indexOf(field)}.value`;
            let label = paramKey;

            // 두 종류의 파라미터를 모두 처리
            if (field.path.includes(".values.")) {
              // 1. 지표 파라미터
              const operandKey = pathParts[pathParts.length - 3];
              const indicatorKey = (block as any)[operandKey]?.indicatorKey;
              const definition = indicatorDefinitions[indicatorKey];
              const paramDefinition = definition?.parameters[paramKey];
              label = `${definition?.label || indicatorKey} - ${
                paramDefinition?.label || paramKey
              }`;
            } else {
              // 2. 블록 직접 파라미터
              label = directParamLabels[paramKey] || paramKey;
            }

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

        {/* 자식 규칙(AND 조건)이 있는 경우 재귀 호출 */}
        {block.children && block.children.length > 0 && (
          <div className="mt-4 pl-4 border-l-2 border-amber-500/50 relative">
            <span className="absolute -left-px top-2 -translate-x-1/2 bg-card text-xs font-semibold text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-500/50">
              AND
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
const TpslSection = ({ control, fields }: { control: any; fields: any[] }) => {
  // `overrides` 배열에서 "tpslLogic"으로 시작하는 모든 필드를 필터링
  const tpslFields = fields.filter((f) => f.path.startsWith("tpslLogic"));

  // 표시할 TP/SL 파라미터가 없으면 아무것도 렌더링하지 않음
  if (tpslFields.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        TP / SL 규칙
      </h4>
      <div className="p-3 rounded-md border bg-card grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {tpslFields.map((field) => {
          const pathParts = field.path.split(".");
          const paramKey = pathParts[pathParts.length - 1];
          const fieldPath = `overrides.${fields.indexOf(field)}.value`;

          return (
            <ParameterInput
              key={field.id}
              control={control}
              fieldPath={fieldPath}
              label={directParamLabels[paramKey] || paramKey}
              tooltip={`경로: ${field.path}`}
            />
          );
        })}
      </div>
      {/* ▲▲▲ [수정 완료] ▲▲▲ */}
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
  const sections = [
    {
      title: "롱 진입 규칙",
      rules: strategy.longEntryRules,
      type: "longEntryRules",
    },
    {
      title: "롱 청산 규칙",
      rules: strategy.longExitRules,
      type: "longExitRules",
    },
    {
      title: "숏 진입 규칙",
      rules: strategy.shortEntryRules,
      type: "shortEntryRules",
    },
    {
      title: "숏 청산 규칙",
      rules: strategy.shortExitRules,
      type: "shortExitRules",
    },
  ];

  if (fields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>파라미터 오버라이드</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            선택된 전략에 수정 가능한 파라미터가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>파라미터 오버라이드</CardTitle>
        <CardDescription>
          전략의 구조를 보면서 파라미터 값만 간편하게 수정하여 테스트합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <TpslSection control={control} fields={fields} />

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
              <h4 className="text-sm font-semibold mb-2">{sec.title}</h4>
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
                    />
                    {blockIndex < sec.rules.blocks.length - 1 && (
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
