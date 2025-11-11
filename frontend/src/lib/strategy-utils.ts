// file: frontend/src/lib/strategy-utils.ts

import { Strategy } from "@/types/strategy";

/**
 * 복잡한 파라미터 경로(예: longEntryRules.blocks.0...)를 사람이 읽기 쉬운 라벨로 변환합니다.
 */
export const getReadableParamLabel = (
  path: string,
  strategy?: Strategy | null
): string => {
  if (!strategy) return path;
  try {
    const parts = path.split(".");

    // Case 1: TP/SL Logic (예: tpslLogic.stopLossPct)
    if (parts[0] === "tpslLogic") {
      // 카멜케이스를 공백으로 분리 (stopLossPct -> Stop Loss Pct)
      const formattedName = parts[1]
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      return `TP/SL - ${formattedName}`;
    }

    // Case 2: General Block Logic (예: longEntryRules.blocks.0...)
    if (parts[1] === "blocks" && parts.length >= 4) {
      const section = parts[0]; // longEntryRules
      const blockIndex = Number(parts[2]) + 1; // 1
      const paramName = parts[parts.length - 1]; // length OR lowerBound

      const sectionMap: Record<string, string> = {
        longEntryRules: "L.Entry",
        longExitRules: "L.Exit",
        shortEntryRules: "S.Entry",
        shortExitRules: "S.Exit",
      };
      const sectionName = sectionMap[section] || section;

      // 스냅샷 객체에서 실제 블록 정보 조회
      const block = (strategy as any)[section]?.blocks?.[Number(parts[2])];
      if (!block) return path;

      let indicatorKey: string | undefined = undefined;

      // 경로에 'values'가 포함되어 있는지 여부로 지표 파라미터인지 블록 파라미터인지 구분
      if (parts.includes("values")) {
        // 경로: ...blocks.0.OPERAND.values.PARAM (예: ...mainLine.values.length)
        const operandKey = parts[3]; // "mainLine"
        indicatorKey = block[operandKey]?.indicatorKey;
      } else {
        // 경로: ...blocks.0.PARAM (예: ...lowerBound)
        // 이 경우, 블록의 '메인 지표' (e.g., State 블록의 'indicator')를 문맥으로 사용
        indicatorKey = block.indicator?.indicatorKey;
      }

      const indicatorLabel = indicatorKey ? `[${indicatorKey}]` : "";

      // 최종 조합: "L.Entry #1 [EMA] length"
      return `${sectionName} #${blockIndex} ${indicatorLabel} ${paramName}`
        .trim()
        .replace(/\s\s+/, " ");
    }

    return path; // Fallback
  } catch (e) {
    console.warn("Failed to parse parameter path:", path, e);
    return path; // 에러 시 원본 경로 반환
  }
};
