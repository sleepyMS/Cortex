// file: frontend/src/components/domain/backtesting/ParameterTreeView.tsx (수정본)

"use client";

import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { LogicBlock, Strategy, IndicatorValue } from "@/types/strategy"; // IndicatorValue 타입 추가
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
import {
  Percent,
  SlidersHorizontal,
  ArrowRight,
  MoveUp,
  MoveDown,
} from "lucide-react"; // 아이콘 추가

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
                      className="text-xs text-muted-foreground cursor-help truncate"
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
          formatOperand(block.lowerBound, definitions) // [수정] formatOperand 적용
        }과(와) ${
          formatOperand(block.upperBound, definitions) // [수정] formatOperand 적용
        } 사이`;
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
 * [신규] 단일 피연산자(Operand)와 그 파라미터들을 렌더링하는 컴포넌트
 */
const OperandParameterGroup = React.memo(
  ({
    operand,
    operandKey,
    title,
    currentBlockPath,
    fields,
    control,
    indicatorDefinitions,
  }: {
    operand: IndicatorValue | number | null;
    operandKey: string;
    title: string;
    currentBlockPath: string;
    fields: any[];
    control: any;
    indicatorDefinitions: Record<string, IndicatorMetadata>;
  }) => {
    const operandPathPrefix = `${currentBlockPath}.${operandKey}`;

    // 1. 이 피연산자가 참조하는 지표의 내부 파라미터들 (e.g., EMA의 'period')
    const indicatorParamFields = fields.filter(
      (f) => f.path.startsWith(operandPathPrefix) && f.path.includes(".values.")
    );

    // 2. 이 피연산자 자체가 값인 경우의 파라미터 (e.g., operandB가 0인 경우)
    const directValueField = fields.find((f) => f.path === operandPathPrefix);

    const hasParams = indicatorParamFields.length > 0 || !!directValueField;
    const operandTitle = formatOperand(operand, indicatorDefinitions);

    return (
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg h-full">
        <h5 className="text-xs font-semibold text-muted-foreground">{title}</h5>
        {!hasParams ? (
          <p className="text-sm text-center py-4 text-muted-foreground">
            {operandTitle}
          </p>
        ) : (
          <div className="space-y-3">
            {/* 1. 지표 내부 파라미터 렌더링 */}
            {indicatorParamFields.map((field) => {
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
            })}

            {/* 2. 피연산자 직접 값 렌더링 */}
            {directValueField && (
              <ParameterInput
                key={directValueField.id}
                control={control}
                fieldPath={`overrides.${fields.indexOf(
                  directValueField
                )}.value`}
                label={operandTitle}
                tooltip={`경로: ${directValueField.path}`}
              />
            )}
          </div>
        )}
      </div>
    );
  }
);
OperandParameterGroup.displayName = "OperandParameterGroup";

/**
 * [신규] 지표가 아닌, 블록의 직접 파라미터(e.g., lowerBound) 렌더링 컴포넌트
 */
const DirectParameterInput = React.memo(
  ({
    paramKey,
    currentBlockPath,
    fields,
    control,
  }: {
    paramKey: string;
    currentBlockPath: string;
    fields: any[];
    control: any;
  }) => {
    const field = fields.find(
      (f) => f.path === `${currentBlockPath}.${paramKey}`
    );
    if (!field) return null;

    const fieldPath = `overrides.${fields.indexOf(field)}.value`;
    const label = directParamLabels[paramKey] || paramKey;

    return (
      <div className="p-3 bg-muted/50 rounded-lg h-full">
        <ParameterInput
          control={control}
          fieldPath={fieldPath}
          label={label}
          tooltip={`경로: ${field.path}`}
        />
      </div>
    );
  }
);
DirectParameterInput.displayName = "DirectParameterInput";

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
          const leftTitle = isComparison ? "기준 (A)" : "메인 라인";
          const rightTitle = isComparison ? "비교 (B)" : "신호 라인";
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
              />
            </div>
          );
        }

        // 지표 + 값 + 값 (3단 분리)
        case "state": {
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-4">
              <OperandParameterGroup
                operand={block.indicator}
                operandKey="indicator"
                title="지표"
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
              />
              {/* [수정] DirectParameterInput 대신 OperandParameterGroup 사용 */}
              <OperandParameterGroup
                operand={block.lowerBound}
                operandKey="lowerBound"
                title="최소값"
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
              />
              {/* [수정] DirectParameterInput 대신 OperandParameterGroup 사용 */}
              <OperandParameterGroup
                operand={block.upperBound}
                operandKey="upperBound"
                title="최대값"
                currentBlockPath={currentBlockPath}
                fields={fields}
                control={control}
                indicatorDefinitions={indicatorDefinitions}
              />
            </div>
          );
        }

        // 기타 규칙 (단순 텍스트)
        default:
          return (
            <p className="text-sm text-muted-foreground p-4 text-center">
              이 규칙 타입({block.type})은 파라미터 수정을 지원하지 않습니다.
            </p>
          );
      }
    };

    return (
      <div className="p-3 rounded-md border bg-card">
        <p className="text-sm font-semibold text-primary mb-3">
          {formatRuleTitle(block, indicatorDefinitions)}
        </p>

        {/* [수정] 규칙 타입별 본문 렌더링 */}
        {renderRuleBody()}

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
                    {sec.rules && blockIndex < sec.rules.blocks.length - 1 && (
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
