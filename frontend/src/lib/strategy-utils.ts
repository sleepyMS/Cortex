// file: frontend/src/lib/strategy-utils.ts

import { Strategy } from "@/types/strategy";

/**
 * 복잡한 파라미터 경로(예: longEntryRules.blocks.0...)를 사람이 읽기 쉬운 라벨로 변환합니다.
 */
export const getReadableParamLabel = (
  path: string,
  strategy?: Strategy
): string => {
  if (!strategy) return path;
  try {
    const parts = path.split(".");

    // Case 1: 일반 전략 규칙 (예: longEntryRules.blocks.0.mainLine.values.length)
    if (parts[1] === "blocks" && parts.length >= 5) {
      const section = parts[0]; // 예: longEntryRules
      const blockIndex = Number(parts[2]) + 1; // 1부터 시작하도록 변경
      const operand = parts[3]; // 예: mainLine
      const paramName = parts[parts.length - 1]; // 예: length

      // 전략 객체에서 실제 지표 정보 조회
      const block = (strategy as any)[section]?.blocks?.[Number(parts[2])];
      const indicatorKey = block?.[operand]?.indicatorKey;
      const indicatorLabel = indicatorKey ? `[${indicatorKey}]` : "";

      const sectionMap: Record<string, string> = {
        longEntryRules: "L.Entry",
        longExitRules: "L.Exit",
        shortEntryRules: "S.Entry",
        shortExitRules: "S.Exit",
      };
      const sectionName = sectionMap[section] || section;

      return `${sectionName} #${blockIndex} ${indicatorLabel} ${paramName}`.trim();
    }

    // Case 2: TP/SL 설정 (예: tpslLogic.stopLossPct)
    if (parts[0] === "tpslLogic") {
      const formattedName = parts[1]
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      return `TP/SL - ${formattedName}`;
    }

    return path;
  } catch (e) {
    return path;
  }
};
