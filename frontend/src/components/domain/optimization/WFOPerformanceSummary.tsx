// file: frontend/src/components/domain/optimization/WFOPerformanceSummary.tsx

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { WFOFoldResult } from "@/types/optimization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Layers } from "lucide-react";

interface WFOPerformanceSummaryProps {
  folds?: WFOFoldResult[];
}

export const WFOPerformanceSummary = ({
  folds,
}: WFOPerformanceSummaryProps) => {
  // const t = useTranslations("OptimizationDetailPage.WfoSummary"); // 언어팩 추가 필요

  if (!folds || folds.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center bg-muted/30 border-dashed">
        <p className="text-muted-foreground text-sm">
          WFO 결과 데이터가 없습니다.
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Layers className="h-5 w-5 text-teal-500" />
          구간별 성과 요약 (WFO)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px]">Fold</TableHead>
                <TableHead>테스트 기간 (OOS)</TableHead>
                <TableHead className="text-right">수익률 (OOS)</TableHead>
                <TableHead className="text-right">MDD (OOS)</TableHead>
                {/* 필요에 따라 IS(훈련) 성과도 추가 가능 */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {folds.map((fold) => (
                <TableRow key={fold.foldIndex} className="hover:bg-muted/20">
                  <TableCell className="font-medium">
                    <Badge variant="outline">#{fold.foldIndex + 1}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(fold.oosStartDate).toLocaleDateString()} ~{" "}
                    {new Date(fold.oosEndDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      (fold.outOfSampleMetrics.totalReturnPct ?? 0) >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                    }`}
                  >
                    {fold.outOfSampleMetrics.totalReturnPct?.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-rose-500">
                    {fold.outOfSampleMetrics.mddPct?.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
