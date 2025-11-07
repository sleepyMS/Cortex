// file: frontend/src/hooks/useExport.ts

import { useCallback } from "react";
import { TrialData } from "@/types/optimization";
import { format } from "date-fns";

export const useExport = () => {
  const downloadCSV = useCallback((data: TrialData[], filename: string) => {
    if (!data || data.length === 0) {
      console.warn("No data to export");
      return;
    }

    // 1. CSV 헤더 생성 (모든 파라미터 키 포함)
    // 첫 번째 데이터 기준으로 헤더를 만들되, 모든 데이터의 키를 확인하는 것이 더 안전함
    const allParamKeys = Array.from(
      new Set(data.flatMap((d) => Object.keys(d.params)))
    ).sort();

    const headers = [
      "Trial ID",
      "State",
      "Cortex Score",
      "Total Return (%)",
      "MDD (%)",
      "Win Rate (%)",
      "Profit Factor",
      "Sharpe Ratio",
      ...allParamKeys, // 파라미터 컬럼들 동적 추가
      "Created At",
    ];

    // 2. 데이터 행 생성
    const csvRows = [headers.join(",")];

    for (const row of data) {
      const metrics = row.metrics;
      const values = [
        row.trialId,
        row.state,
        metrics.backtestScore?.toFixed(2) ?? "",
        metrics.totalReturnPct?.toFixed(2) ?? "",
        metrics.mddPct?.toFixed(2) ?? "",
        metrics.winRatePct?.toFixed(2) ?? "",
        metrics.profitFactor?.toFixed(2) ?? "",
        metrics.sharpeRatio?.toFixed(2) ?? "",
        // 파라미터 값들 (순서 보장)
        ...allParamKeys.map((key) => row.params[key] ?? ""),
        format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss"),
      ];

      // CSV 특수문자 처리 (필요시)
      const escapedValues = values.map((v) => {
        const str = String(v);
        return str.includes(",") ? `"${str}"` : str;
      });

      csvRows.push(escapedValues.join(","));
    }

    // 3. 파일 생성 및 다운로드 트리거
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return { downloadCSV };
};
