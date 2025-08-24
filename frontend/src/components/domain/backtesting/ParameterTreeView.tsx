// file: frontend/src/components/domain/backtesting/ParameterTreeView.tsx (신규 생성)
"use client";

import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { LogicBlock, PositionRules } from "@/types/strategy";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";

// 단일 파라미터 입력 UI
function ParameterInput({
  fieldPath,
  label,
  control,
}: {
  fieldPath: string;
  label: string;
  control: any;
}) {
  return (
    <Controller
      control={control}
      name={fieldPath}
      render={({ field }) => (
        <div className="flex items-center gap-2">
          <Label
            htmlFor={fieldPath}
            className="w-24 text-right text-xs text-muted-foreground truncate"
          >
            {label}
          </Label>
          <Input
            id={fieldPath}
            type="number"
            step="any"
            value={field.value}
            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
            className="h-8 flex-1"
          />
        </div>
      )}
    />
  );
}

// 재귀적으로 규칙과 파라미터를 렌더링하는 함수
function RecursiveRenderer({
  blocks,
  pathPrefix,
  fields,
  control,
}: {
  blocks: LogicBlock[];
  pathPrefix: string;
  fields: any[];
  control: any;
}) {
  const t = (key: string) =>
    ({ orOperator: "또는 (OR)", andOperator: "그리고 (AND)" }[key] || key);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <React.Fragment key={block.id}>
          {index > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {t("orOperator")}
              </span>
              <div className="flex-grow border-t border-dashed"></div>
            </div>
          )}

          <div className="p-3 rounded-md border bg-muted/50">
            {/* 블록 내부의 파라미터들을 찾아서 렌더링 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {fields
                .filter((f) =>
                  f.path.startsWith(`${pathPrefix}.blocks.${index}`)
                )
                .map((field) => {
                  // 경로에서 라벨 생성 (예: "mainLine.values.period" -> "Period")
                  const pathParts = field.path.split(".");
                  const paramKey = pathParts[pathParts.length - 1];
                  const operandKey = pathParts[pathParts.length - 3];
                  const label = `${operandKey} ${paramKey}`;

                  return (
                    <ParameterInput
                      key={field.id}
                      control={control}
                      fieldPath={`overrides.${fields.indexOf(field)}.value`}
                      label={label}
                    />
                  );
                })}
            </div>

            {/* 자식 규칙(AND 조건)이 있는 경우 재귀 호출 */}
            {block.children && block.children.length > 0 && (
              <div className="mt-3 pl-4 border-l-2 border-primary/50 relative">
                <span className="absolute -left-[1px] top-2 -translate-x-1/2 bg-muted text-xs font-semibold text-primary px-1">
                  {t("andOperator")}
                </span>
                <div className="pt-3">
                  <RecursiveRenderer
                    blocks={block.children}
                    pathPrefix={`${pathPrefix}.blocks.${index}.children`}
                    fields={fields}
                    control={control}
                  />
                </div>
              </div>
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// 메인 컴포넌트
export const ParameterTreeView = ({ strategy, control, fields }: any) => {
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

  const hasAnyParams = fields.length > 0;
  if (!hasAnyParams) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>파라미터 오버라이드</CardTitle>
        <CardDescription>
          규칙의 구조를 유지한 채 파라미터 값만 간편하게 수정합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <h4 className="text-sm font-semibold mb-2">{sec.title}</h4>
              <RecursiveRenderer
                blocks={sec.rules.blocks}
                pathPrefix={sec.type}
                fields={sectionFields}
                control={control}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
