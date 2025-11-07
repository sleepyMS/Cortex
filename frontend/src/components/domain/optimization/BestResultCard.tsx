// file: frontend/src/components/domain/optimization/BestResultCard.tsx

"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Target, Trophy, ArrowUpRight, ExternalLink } from "lucide-react";

import { TrialData } from "@/types/optimization";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { ScrollArea } from "@/components/ui/ScrollArea";

interface BestResultCardProps {
  bestTrial?: TrialData;
}

export const BestResultCard = ({ bestTrial }: BestResultCardProps) => {
  const t = useTranslations("OptimizationDetailPage.BestResult");

  // 1. 데이터가 없을 때 (아직 실행 중이거나 실패 시)
  if (!bestTrial) {
    return (
      <Card className="h-full flex flex-col items-center justify-center p-6 bg-muted/30 border-dashed">
        <Trophy className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm font-medium text-center">
          {t("noResultYet")}
        </p>
        <p className="text-xs text-muted-foreground/70 text-center mt-1">
          {t("noResultYetDescription")}
        </p>
      </Card>
    );
  }

  const { metrics, params, trialId } = bestTrial;

  // 점수에 따른 색상 헬퍼 함수
  const getScoreColor = (score?: number | null) => {
    if (score == null) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-rose-500";
  };

  // 수익률에 따른 색상 헬퍼 함수
  const getReturnColor = (val?: number | null) => {
    if (val == null) return "";
    return val >= 0 ? "text-emerald-500" : "text-rose-500";
  };

  return (
    <Card className="h-full flex flex-col border-primary/20 shadow-sm overflow-hidden">
      {/* --- 헤더 --- */}
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-primary">
            <Target className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <Badge variant="outline" className="bg-background font-mono">
            Trial #{trialId}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-grow pt-6 space-y-6">
        {/* --- 1. 핵심 성과 지표 (Metrics) --- */}
        <div className="grid grid-cols-2 gap-6 items-center">
          {/* 좌측: 종합 점수 (강조) */}
          <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-xl border">
            <span className="text-sm font-medium text-muted-foreground mb-1">
              Cortex Score
            </span>
            <span
              className={cn(
                "text-4xl font-extrabold flex items-baseline gap-1",
                getScoreColor(metrics.backtestScore)
              )}
            >
              {metrics.backtestScore?.toFixed(0) ?? "N/A"}
              <span className="text-base font-normal text-muted-foreground/70">
                /100
              </span>
            </span>
          </div>

          {/* 우측: 주요 세부 지표 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("totalReturn")}
              </span>
              <span
                className={cn(
                  "font-bold font-mono text-base",
                  getReturnColor(metrics.totalReturnPct)
                )}
              >
                {metrics.totalReturnPct?.toFixed(2) ?? "-"}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("mdd")}</span>
              <span className="font-medium font-mono text-rose-500">
                {metrics.mddPct?.toFixed(2) ?? "-"}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("winRate")}
              </span>
              <span className="font-medium font-mono">
                {metrics.winRatePct?.toFixed(1) ?? "-"}%
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* --- 2. 발견된 최적 파라미터 (Parameters) --- */}
        <div className="flex flex-col flex-grow min-h-0">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" />
            {t("foundParameters")}
          </h4>
          <ScrollArea className="h-[180px] rounded-md border bg-muted/30 p-3">
            <div className="space-y-2 text-xs">
              {Object.entries(params).map(([key, value]) => {
                // 키 경로를 보기 좋게 다듬기 (e.g., "longEntryRules.0.rsi.period" -> "...rsi.period")
                const shortKey =
                  key.split(".").length > 2
                    ? `...${key.split(".").slice(-2).join(".")}`
                    : key;

                return (
                  <div
                    key={key}
                    className="flex justify-between items-center py-1 border-b border-dashed last:border-0"
                  >
                    <span
                      className="text-muted-foreground truncate mr-2 max-w-[180px]"
                      title={key} // 마우스 오버 시 전체 경로 표시
                    >
                      {shortKey}
                    </span>
                    <Badge variant="secondary" className="font-mono shrink-0">
                      {String(value)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>

      {/* --- 푸터: 상세 보기 버튼 --- */}
      <CardFooter className="bg-muted/30 py-3">
        <Button variant="primary" className="w-full" asChild>
          {/* 클릭 시 새 탭에서 해당 Trial의 상세 백테스트 페이지 열기 */}
          <Link href={`/backtester/${trialId}`} target="_blank">
            {t("viewDetails")}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
