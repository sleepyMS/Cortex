// file: src/lib/strategyUtils.ts

import { nanoid } from "nanoid";
import {
  IndicatorMetadata,
  IndicatorValue,
  LogicBlock,
  PositionRules,
  StrategyType,
} from "@/types/strategy";

// API 요청에 맞는 IndicatorConfig 형태로 변환하는 헬퍼
const toIndicatorConfig = (iv: IndicatorValue) => ({
  indicatorKey: iv.indicatorKey,
  values: iv.values,
  outputs: iv.outputs,
});

// 재귀적으로 순회하며 IndicatorValue를 찾는 함수 (개선된 버전)
const findIndicatorsRecursive = (
  blocks: LogicBlock[],
  indicatorSet: Set<string>
) => {
  if (!blocks) return;

  blocks.forEach((block) => {
    // 👇 [개선] Object.values() 대신 switch 구문으로 타입을 명확히 구분하여 안정성 향상
    switch (block.type) {
      case "comparison":
        if (
          block.operandA &&
          typeof block.operandA === "object" &&
          "indicatorKey" in block.operandA
        ) {
          indicatorSet.add(JSON.stringify(toIndicatorConfig(block.operandA)));
        }
        if (
          block.operandB &&
          typeof block.operandB === "object" &&
          "indicatorKey" in block.operandB
        ) {
          indicatorSet.add(JSON.stringify(toIndicatorConfig(block.operandB)));
        }
        break;
      case "crossover":
        if (block.mainLine && "indicatorKey" in block.mainLine) {
          indicatorSet.add(JSON.stringify(toIndicatorConfig(block.mainLine)));
        }
        if (
          block.signalLine &&
          typeof block.signalLine === "object" &&
          "indicatorKey" in block.signalLine
        ) {
          indicatorSet.add(JSON.stringify(toIndicatorConfig(block.signalLine)));
        }
        break;
      case "state":
      case "trend_signal":
      case "channel":
      case "divergence":
        if (block.indicator && "indicatorKey" in block.indicator) {
          indicatorSet.add(JSON.stringify(toIndicatorConfig(block.indicator)));
        }
        break;
      // 'pattern' 타입은 IndicatorValue를 사용하지 않으므로 처리할 필요 없음
    }

    // 자식 노드가 있으면 재귀 호출 (AND/OR 복합 규칙을 위한 확장)
    if (block.children && block.children.length > 0) {
      findIndicatorsRecursive(block.children, indicatorSet);
    }
  });
};

// 메인 함수: 모든 규칙을 받아 중복 없는 지표 목록 반환 (변경 없음)
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

// 👇 [추가] createLogicBlock 함수를 중앙화하여 관리
export const createLogicBlock = (
  indicator: IndicatorMetadata,
  logicType: string,
  allowedTimeframes: string[]
): LogicBlock => {
  const availableTimeframes = indicator.supportedTimeframes.filter((tf) =>
    allowedTimeframes.includes(tf)
  );
  const baseIndicatorValue: IndicatorValue = {
    indicatorKey: indicator.key,
    outputs: [indicator.outputs[0].key],
    values: indicator.parameters.reduce(
      (acc, param) => ({ ...acc, [param.key]: param.default }),
      {}
    ),
    timeframe: availableTimeframes.length > 0 ? availableTimeframes[0] : "1h",
  };
  const newBlockId = nanoid();

  switch (logicType) {
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
        signalLine: 0,
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
