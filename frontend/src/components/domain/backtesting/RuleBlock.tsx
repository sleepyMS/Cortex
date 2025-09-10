// file: frontend/src/components/domain/backtesting/RuleBlock.tsx
"use client";

import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { LogicBlock } from "@/types/strategy";
import { IndicatorMetadata } from "@/types/indicator";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

// --- Props 타입 정의 ---
interface RuleBlockProps {
  block: LogicBlock;
  blockIndex: number;
  pathPrefix: string;
  indicatorDefinitions: Record<string, IndicatorMetadata>;
  fields: any[];
}

// --- 헬퍼 컴포넌트 및 함수 ---

/**
 * 단일 파라미터 입력 UI 컴포넌트
 */
function ParameterInput({
  fieldPath,
  label,
  tooltip,
  control,
}: {
  fieldPath: string;
  label: string;
  tooltip: string;
  control: any;
}) {
  return (
    <Controller
      control={control}
      name={fieldPath}
      render={({ field, fieldState: { error } }) => (
        <div>
          <div className="flex items-center justify-between gap-4">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label
                    htmlFor={fieldPath}
                    className="text-xs text-muted-foreground cursor-help truncate"
                  >
                    {label}
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltip}</p>
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

/**
 * 피연산자(Operand)를 사람이 읽기 쉬운 형태로 변환하는 함수
 * 예: { indicatorKey: "EMA", values: { length: 10 } } -> "EMA(10)"
 * 예: 70 -> "70"
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
      .map(([key, value]) => {
        const paramLabel = def?.parameters[key]?.label || key;
        return `${paramLabel}:${value}`;
      })
      .join(", ");
    return `${def?.label || operand.indicatorKey}(${params})`;
  }
  return JSON.stringify(operand);
};

/**
 * 규칙(Block) 객체를 사람이 읽기 쉬운 문장으로 변환하는 함수
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
        return `${formatOperand(block.mainLine, definitions)}가 ${formatOperand(
          block.signalLine,
          definitions
        )}를 ${block.crossDirection === "above" ? "상향 돌파" : "하향 돌파"}`;
      case "state":
        return `${formatOperand(block.indicator, definitions)}가 ${
          block.lowerBound
        }과(와) ${block.upperBound} 사이에 위치`;
      default:
        return `${block.type} 규칙`;
    }
  } catch (e) {
    return "규칙을 해석하는 중 오류 발생";
  }
};

// --- 메인 재귀 컴포넌트 ---
export function RuleBlock({
  block,
  blockIndex,
  pathPrefix,
  indicatorDefinitions,
  fields,
}: RuleBlockProps) {
  const { control } = useFormContext();
  const currentBlockPath = `${pathPrefix}.${blockIndex}`;

  // 현재 블록에 속한 파라미터 필드만 필터링
  const blockFields = fields.filter((f) => f.path.startsWith(currentBlockPath));

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-md border bg-card">
        <p className="text-sm font-semibold text-primary mb-3">
          {formatRuleTitle(block, indicatorDefinitions)}
        </p>

        {/* 현재 블록의 파라미터들을 렌더링 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {blockFields.map((field) => {
            const pathParts = field.path.split(".");
            const paramKey = pathParts[pathParts.length - 1]; // "length"
            const operandKey = pathParts[pathParts.length - 3]; // "mainLine", "operandA", "indicator"
            const indicatorKey = (block as any)[operandKey]?.indicatorKey;

            const definition = indicatorDefinitions[indicatorKey];
            const paramDefinition = definition?.parameters[paramKey];

            const label = `${definition?.label || indicatorKey} - ${
              paramDefinition?.label || paramKey
            }`;
            const tooltip = `경로: ${field.path}`;

            return (
              <ParameterInput
                key={field.id}
                control={control}
                fieldPath={`overrides.${fields.indexOf(field)}.value`}
                label={label}
                tooltip={tooltip}
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
                  fields={fields}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 다음 OR 조건을 위한 구분자 (마지막 블록 제외) */}
      {/* 이 로직은 부모 컴포넌트(ParameterTreeView)에서 처리하는 것이 더 적합합니다. */}
    </div>
  );
}
