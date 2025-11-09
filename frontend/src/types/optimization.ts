// file: frontend/src/types/optimization.ts

import { Strategy } from "./strategy";
import { BacktestResult } from "./backtest";

/**
 * 최적화 작업의 상태 타입
 */
export type OptimizationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

/**
 * 최적화 유형 타입
 */
export type OptimizationType = "general" | "wfo";

/**
 * 단일 시도(Trial)에 대한 상세 데이터
 */
export interface TrialData {
  trialId: number;
  /**
   * 이 시도에 사용된 파라미터 조합 (Key-Value)
   * 예: { "longEntryRules.0.rsi.period": 14, "tpslLogic.stopLossPct": 2.5 }
   */
  params: Record<string, number | string | boolean>;
  /**
   * 해당 시도의 백테스트 결과 지표
   */
  metrics: BacktestResult;
  /**
   * 시도의 최종 상태 (PRUNED는 조기 중단됨을 의미)
   */
  state: "COMPLETE" | "PRUNED" | "FAIL";
  createdAt: string;
}

/**
 * WFO(워크포워드)의 각 구간(Fold)별 결과 데이터
 */
export interface WFOFoldResult {
  foldIndex: number;
  /**
   * 해당 구간의 훈련(In-Sample) 시작/종료일
   */
  isStartDate: string;
  isEndDate: string;
  /**
   * 해당 구간의 테스트(Out-of-Sample) 시작/종료일
   */
  oosStartDate: string;
  oosEndDate: string;

  /**
   * 훈련 구간(IS)에서 달성한 최고 성과
   */
  inSampleMetrics: BacktestResult;
  /**
   * 테스트 구간(OOS)에서 검증된 실제 성과
   */
  outOfSampleMetrics: BacktestResult;

  /**
   * 이 구간에서 선택된 최적 파라미터
   */
  bestParams: Record<string, number | string | boolean>;
}

/**
 * 최적화 실행 당시의 설정 스냅샷
 */
export interface OptimizationConfig {
  /**
   * 1순위 최적화 목표 (예: 'CAGR', 'cortexScore')
   */
  objective: string;
  startDate: string;
  endDate: string;

  initialCapital: number;
  // 기타 실행 파라미터 (레버리지, 수수료 등)
  commonParameters: {
    leverage: number;
    fee: number;
    slippage: number;
  };
  // 2순위 제약 조건
  constraints?: Array<{
    type: string;
    operator: ">=" | "<=";
    value: number;
  }>;
  // WFO 전용 설정 (일반 최적화일 경우 optional)
  wfoSettings?: {
    folds: number;
    windowType?: "expanding" | "sliding"; // 확장창 또는 고정창
  };
  generalSettings?: {
    trials: number;
  };
  parameterRanges?: Array<{
    path: string;
    min: number;
    max: number;
    step: number;
  }>;
}

/**
 * 최적화 작업의 전체 상세 정보 (API 메인 응답 객체)
 */
export interface OptimizationJobDetail {
  id: string;
  status: OptimizationStatus;
  type: OptimizationType;

  /**
   * 최적화 대상이 된 원본 전략 정보
   */
  strategy: Strategy;

  /**
   * 최적화 실행 당시의 설정 정보 스냅샷
   */
  config: OptimizationConfig;

  /**
   * 진행률 정보 (실행 중일 때 유효)
   */
  progress?: {
    current_step: number;
    total_steps: number;
    message?: string;
  };

  /**
   * 전체 시도 중 가장 뛰어난 단일 결과 (일반/WFO 공통)
   */
  bestTrial?: TrialData;

  /**
   * WFO 전용 결과 데이터 (일반 최적화에서는 없음)
   */
  wfoResult?: {
    /**
     * OOS 수익 곡선 차트 데이터 (lightweight-charts 형식 호환)
     * 예: [{ time: 1672531200, value: 10000 }, ...]
     * UTCTimestamp 타입을 사용하려면 사용하는 곳에서 타입 단언 필요
     */
    oosCurveJson: Array<{ time: string | number; value: number }>;
    /**
     * 각 Fold별 상세 결과 리스트
     */
    folds: WFOFoldResult[];
  };

  /**
   * (Tier 2 분석용) 파라미터 중요도 분석 결과
   */
  parameterImportance?: Array<{
    param: string;
    importance: number; // 0.0 ~ 1.0 사이의 값
  }>;

  /**
   * (Tier 2 분석용) 전체 시도 데이터 목록
   * 대용량일 수 있으므로 필요에 따라 페이지네이션 처리될 수 있음
   */
  trials?: TrialData[];

  createdAt: string;
  completedAt?: string;

  /**
   * 이 작업에 소모된 실제 크레딧
   */
  usedCredits?: number;
}
