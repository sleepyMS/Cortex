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
} from "lucide-react";

import { OptimizationConfig, OptimizationType } from "@/types/optimization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";
import { Badge } from "@/components/ui/Badge";

interface ConfigSummaryCardProps {
  config: OptimizationConfig;
  type: OptimizationType;
}

export const ConfigSummaryCard = ({ config, type }: ConfigSummaryCardProps) => {
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
      </CardContent>
    </Card>
  );
};
