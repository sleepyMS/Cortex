// file: src/lib/strategyUtils.ts

import { IndicatorValue, LogicBlock, PositionRules } from "@/types/strategy";

// API 요청에 맞는 IndicatorConfig 형태로 변환하는 헬퍼
const toIndicatorConfig = (iv: IndicatorValue) => ({
  indicatorKey: iv.indicatorKey,
  values: iv.values,
  outputs: iv.outputs,
  // 참고: 백엔드 API는 현재 timeframe을 사용하지 않지만, 향후 확장을 위해 포함
});

// 재귀적으로 순회하며 IndicatorValue를 찾는 함수 (개선된 버전)
const findIndicatorsRecursive = (
  blocks: LogicBlock[],
  indicatorSet: Set<string>
) => {
  if (!blocks) return;

  blocks.forEach((block) => {
    // 블록의 모든 속성 값을 순회
    Object.values(block).forEach((value) => {
      // 값이 IndicatorValue 객체 형태인지 확인
      if (value && typeof value === "object" && "indicatorKey" in value) {
        // 중복을 피하기 위해 JSON 문자열로 변환하여 Set에 추가
        indicatorSet.add(
          JSON.stringify(toIndicatorConfig(value as IndicatorValue))
        );
      }
    });

    // 자식 노드가 있으면 재귀 호출
    if (block.children && block.children.length > 0) {
      findIndicatorsRecursive(block.children, indicatorSet);
    }
  });
};

// 메인 함수: 모든 규칙을 받아 중복 없는 지표 목록 반환
export const parseRulesForIndicators = (
  rules:
    | {
        longEntry: PositionRules | null;
        longExit: PositionRules | null;
        shortEntry: PositionRules | null;
        shortExit: PositionRules | null;
      }
    | null
    | undefined
) => {
  if (!rules) {
    return [];
  }

  const indicatorSet = new Set<string>();

  // longEntry, longExit 등 모든 규칙 세트를 순회
  Object.values(rules).forEach((ruleSet) => {
    if (ruleSet?.blocks) {
      findIndicatorsRecursive(ruleSet.blocks, indicatorSet);
    }
  });

  // Set에 저장된 문자열들을 다시 객체로 변환하여 반환
  return Array.from(indicatorSet).map((s) => JSON.parse(s));
};
