// file: frontend/src/components/domain/optimization/ConfigSummaryCard.tsx

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Settings,
  Calendar,
  Target,
  DollarSign,
  ShieldAlert,
  Layers,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";

import {
  OptimizationConfig,
  OptimizationType,
  TrialData,
} from "@/types/optimization";
import { Strategy } from "@/types/strategy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";
import { Badge } from "@/components/ui/Badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import { getReadableParamLabel } from "@/lib/strategy-utils";

interface ConfigSummaryCardProps {
  config: OptimizationConfig;
  type: OptimizationType;
  bestTrial?: TrialData;
  strategy?: Strategy;
}

export const ConfigSummaryCard = ({
  config,
  type,
  bestTrial,
  strategy,
}: ConfigSummaryCardProps) => {
  const t = useTranslations("OptimizationDetailPage.ConfigSummary");
  const tConst = useTranslations("OptimizationSetupForm.constraints"); // 제약 조건 번역 재사용
  const tObj = useTranslations("OptimizationSetupForm.objectives"); // 목표 번역 재사용

  // 날짜 포맷팅 헬퍼
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "yy.MM.dd");
    } catch (e) {
      return dateStr;
    }
  };

  if (!config) return null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* 1. 핵심 설정 (목표, 기간, 자본금) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Target className="h-4 w-4 opacity-70" />
              {t("objective")}
            </span>
            <span className="font-medium text-primary">
              {/* @ts-expect-error */}
              {tObj.has(config.objective)
                ? // @ts-expect-error
                  tObj(config.objective) // <-- 주석을 복사해서 넣습니다.
                : config.objective}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 opacity-70" />
              {t("period")}
            </span>
            <span className="font-mono text-xs">
              {/* [수정] config.startDate, config.endDate 사용 */}
              {formatDate(config.startDate)} ~ {formatDate(config.endDate)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 opacity-70" />
              {t("initialCapital")}
            </span>
            <span className="font-mono">
              ${config.initialCapital?.toLocaleString() ?? "-"}
            </span>
          </div>
        </div>

        {/* 2. WFO 전용 설정 (조건부 렌더링) */}
        {type === "wfo" && config.wfoSettings && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 opacity-70" />
                  {t("wfoFolds")}
                </span>
                <span className="font-medium">
                  {config.wfoSettings.folds} {t("foldsUnit")}
                </span>
              </div>
            </div>
          </>
        )}

        {/* 3. 제약 조건 (조건부 렌더링) */}
        {config.constraints && config.constraints.length > 0 && (
          <>
            <Separator />
            <div>
              <span className="text-muted-foreground flex items-center gap-1.5 mb-2">
                <ShieldAlert className="h-4 w-4 opacity-70" />
                {t("constraints")}
              </span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {config.constraints.map((c, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="bg-muted/50 text-xs font-normal"
                  >
                    {/* @ts-expect-error */}
                    {tConst.has(c.type) ? tConst(c.type) : c.type} {c.operator}{" "}
                    {c.value}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 4. 최적화된 파라미터 (조건부 렌더링) */}
        {bestTrial &&
          bestTrial.params &&
          Object.keys(bestTrial.params).length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-muted-foreground flex items-center gap-1.5 mb-3">
                  <SlidersHorizontal className="h-4 w-4 opacity-70" />
                  {t("optimizedParameters")}
                </span>
                <Accordion type="multiple" className="w-full">
                  {(() => {
                    // 파라미터를 규칙 타입별로 그룹화
                    const grouped: Record<string, Array<[string, any]>> = {};

                    Object.entries(bestTrial.params).forEach(([key, value]) => {
                      // 경로에서 규칙 타입 추출 (camelCase 형식)
                      const match = key.match(
                        /^(longEntryRules|longExitRules|shortEntryRules|shortExitRules)/
                      );
                      // camelCase를 snake_case로 변환하여 그룹 키로 사용
                      let groupKey = "other";
                      if (match) {
                        groupKey = match[1]
                          .replace(/([A-Z])/g, "_$1")
                          .toLowerCase()
                          .replace(/^_/, "");
                      }

                      if (!grouped[groupKey]) {
                        grouped[groupKey] = [];
                      }
                      grouped[groupKey].push([key, value]);
                    });

                    // 그룹 표시 순서 및 레이블
                    const groupOrder = [
                      { key: "long_entry_rules", label: "진입 규칙 (롱)" },
                      { key: "long_exit_rules", label: "청산 규칙 (롱)" },
                      { key: "short_entry_rules", label: "진입 규칙 (숏)" },
                      { key: "short_exit_rules", label: "청산 규칙 (숏)" },
                      { key: "other", label: "기타 파라미터" },
                    ];

                    return groupOrder
                      .filter(
                        ({ key }) => grouped[key] && grouped[key].length > 0
                      )
                      .map(({ key, label }) => (
                        <AccordionItem
                          key={key}
                          value={key}
                          className="border-none"
                        >
                          <AccordionTrigger className="py-2 hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-2">
                              <span className="text-sm font-medium">
                                {label}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {grouped[key].length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-2 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1.5 pl-2">
                              {grouped[key].map(([paramKey, paramValue]) => {
                                // 들여쓰기 레벨 계산 (blocks 깊이)
                                const depth = (
                                  paramKey.match(/\.blocks\./g) || []
                                ).length;
                                const indentClass =
                                  depth > 0
                                    ? `ml-${Math.min(depth * 3, 6)}`
                                    : "";

                                return (
                                  <div
                                    key={paramKey}
                                    className={`flex justify-between items-center text-xs gap-2 ${indentClass}`}
                                  >
                                    <span className="text-muted-foreground truncate flex-1">
                                      {getReadableParamLabel(
                                        paramKey,
                                        strategy
                                      )}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="font-mono text-xs shrink-0"
                                    >
                                      {typeof paramValue === "number"
                                        ? paramValue.toFixed(2)
                                        : String(paramValue)}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ));
                  })()}
                </Accordion>
              </div>
            </>
          )}
      </CardContent>
    </Card>
  );
};
