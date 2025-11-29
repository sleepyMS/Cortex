// file: frontend/src/lib/strategyUtils.ts

import { nanoid } from "nanoid";
import { IndicatorValue, LogicBlock, PositionRules } from "@/types/strategy";
import { IndicatorMetadata } from "@/types/indicator";

// API 요청에 맞는 IndicatorConfig 형태로 변환하는 헬퍼 (기존과 동일)
const toIndicatorConfig = (iv: IndicatorValue) => ({
  indicatorKey: iv.indicatorKey,
  values: iv.values,
  outputs: iv.outputs,
  timeframe: iv.timeframe, // timeframe도 포함
});

// 재귀적으로 순회하며 IndicatorValue를 찾는 함수 (기존과 동일)
const findIndicatorsRecursive = (
  blocks: LogicBlock[],
  indicatorSet: Set<string>
) => {
  if (!blocks) return;

  blocks.forEach((block) => {
    // 블록의 모든 속성을 순회하며 IndicatorValue 객체를 찾음
    Object.values(block).forEach((value) => {
      if (value && typeof value === "object" && "indicatorKey" in value) {
        const indicator = value as IndicatorValue;
        indicatorSet.add(JSON.stringify(toIndicatorConfig(indicator)));
      }
    });

    // 자식 노드가 있으면 재귀 호출
    if (block.children && block.children.length > 0) {
      findIndicatorsRecursive(block.children, indicatorSet);
    }
  });
};

/**
 * 전략 규칙 객체 전체를 분석하여, 차트 렌더링 및 API 요청에 필요한
 * 모든 IndicatorValue 설정의 중복 없는 리스트를 반환합니다.
 */
export const parseRulesForIndicators = (
  rules: {
    longEntry: PositionRules | null;
    longExit: PositionRules | null;
    shortEntry: PositionRules | null;
    shortExit: PositionRules | null;
  } | null
) => {
  if (!rules) {
    return [];
  }
  const indicatorSet = new Set<string>();
  Object.values(rules).forEach((ruleSet) => {
    if (ruleSet?.blocks) {
      findIndicatorsRecursive(ruleSet.blocks, indicatorSet);
    }
  });
  return Array.from(indicatorSet).map((s) => JSON.parse(s));
};

/**
 * [최종 수정 버전]
 * IndicatorHub에서 지표를 처음 선택했을 때, 해당 지표의 기본 파라미터로
 * 새로운 LogicBlock 객체를 생성합니다.
 */
export const createLogicBlock = (
  indicator: IndicatorMetadata,
  logicType: string,
  allowedTimeframes: string[]
): LogicBlock => {
  // 사용 가능한 타임프레임 중 '1h'가 있으면 우선 사용, 없으면 첫 번째 값 사용
  const defaultTimeframe = indicator.supportedTimeframes?.includes("1h")
    ? "1h"
    : indicator.supportedTimeframes?.[0] || "1h";

  const baseIndicatorValue: IndicatorValue = {
    indicatorKey: indicator.key,
    outputs: [indicator.outputs[0]?.key || ""],
    timeframe: defaultTimeframe,
    // ▼▼▼ [핵심 수정] .reduce() 대신 객체(Record)를 올바르게 처리하는 로직으로 변경 ▼▼▼
    values: Object.fromEntries(
      Object.entries(indicator.parameters).map(([key, paramDef]) => [
        key,
        paramDef.default,
      ])
    ),
    // ▲▲▲ [수정 완료] ▲▲▲
  };

  const newBlockId = nanoid();

  switch (logicType as LogicBlock["type"]) {
    case "comparison":
      return {
        id: newBlockId,
        type: "comparison",
        operandA: baseIndicatorValue,
        operator: ">",
        operandB: 0,
      };
    case "crossover":
      return {
        id: newBlockId,
        type: "crossover",
        mainLine: baseIndicatorValue,
        // 우측 슬롯(Signal Line)을 0 대신 좌측 지표(Main Line)의 복제본으로 초기화
        signalLine: {
          ...baseIndicatorValue,
          values: { ...baseIndicatorValue.values },
        },
        crossDirection: "above",
      };
    case "state":
      return {
        id: newBlockId,
        type: "state",
        indicator: baseIndicatorValue,
        lowerBound: 30,
        upperBound: 70,
        stateAction: "within",
      };
    case "trend_signal":
      return {
        id: newBlockId,
        type: "trend_signal",
        indicator: baseIndicatorValue,
        signal: "buy",
      };
    case "channel":
      return {
        id: newBlockId,
        type: "channel",
        indicator: baseIndicatorValue,
        channelZone: "upper",
        action: "enter",
      };
    case "divergence":
      return {
        id: newBlockId,
        type: "divergence",
        indicator: baseIndicatorValue,
        divergenceType: "bullish",
      };
    case "pattern":
      return {
        id: newBlockId,
        type: "pattern",
        patternKey: "doji",
        direction: "any",
      };
    default:
      return {
        id: newBlockId,
        type: "comparison",
        operandA: baseIndicatorValue,
        operator: ">",
        operandB: 0,
      };
  }
};
