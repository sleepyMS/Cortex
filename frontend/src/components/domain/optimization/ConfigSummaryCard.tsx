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

import { OptimizationConfig } from "@/types/optimization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";
import { Badge } from "@/components/ui/Badge";

interface ConfigSummaryCardProps {
  config: OptimizationConfig & {
    // OptimizationConfig 타입에 제약 조건이 포함되어 있다고 가정합니다.
    // (백엔드가 이 정보를 config 객체 안에 포함시켜 반환해야 합니다.)
    constraints?: Array<{
      type: string;
      operator: string;
      value: number;
    }>;
  };
  type: "general" | "wfo";
}

export const ConfigSummaryCard = ({ config, type }: ConfigSummaryCardProps) => {
  const t = useTranslations("OptimizationDetailPage.ConfigSummary");
  const tConst = useTranslations("OptimizationSetupForm.constraints"); // 제약 조건 번역 재사용
  const tObj = useTranslations("OptimizationSetupForm.objectives"); // 목표 번역 재사용

  // 날짜 포맷팅 헬퍼
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "yyyy.MM.dd");
    } catch (e) {
      return dateStr;
    }
  };

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
              {/* 목표 키(e.g. 'CAGR')를 번역된 텍스트로 변환 시도 */}
              {tObj.has(config.objective)
                ? tObj(config.objective)
                : config.objective}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 opacity-70" />
              {t("period")}
            </span>
            <span className="font-mono text-xs">
              {formatDate(config.dateRange.from)} ~{" "}
              {formatDate(config.dateRange.to)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 opacity-70" />
              {t("initialCapital")}
            </span>
            <span className="font-mono">
              ${config.initialCapital.toLocaleString()}
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
              {/* 필요한 경우 WFO 윈도우 타입 등 추가 정보 표시 */}
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
