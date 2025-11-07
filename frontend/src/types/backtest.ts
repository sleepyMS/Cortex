// file: src/types/backtest.ts

import { Strategy } from "./strategy";
import { TradeLog } from "./tradelog";

// [신규] 백엔드의 ParameterOverride 스키마에 대응
export interface ParameterOverride {
  path: string;
  value: any; // 다양한 타입의 값을 허용
}

// [신규] 백엔드의 BacktestExecutionParameters 스키마에 대응
export interface BacktestExecutionParameters {
  leverage: number;
  fee: number;
  slippage: number;
  overrides?: ParameterOverride[];
  tpslLogic?: {
    trailingStopEnabled: boolean;
    trailingStopActivationPct?: number;
    trailingStopCallbackPct?: number;
  };
}

// [신규] 백엔드의 BacktestParametersPayload 스키마에 대응
export interface BacktestParametersPayload {
  startDate: string;
  endDate: string;
  initialCapital: number;
  parameters: BacktestExecutionParameters;
}

/**
 * [개선] 백엔드의 BacktestResultSummary 스키마와 완전히 동기화된 타입
 * 이전 BacktestResult에서 이름 변경 및 필드 정제
 */
export interface BacktestResultSummary {
  totalReturnPct: number | null;
  mddPct: number | null;
  winRatePct: number | null;
  profitFactor: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  calmarRatio: number | null;
  cagrPct: number | null;
  avgProfitLossRatio: number | null;
  ulcerIndex: number | null;
  kRatio: number | null;
  backtestScore: number | null;
  totalTrades: number | null;
  winningTrades?: number | null;
  losingTrades?: number | null;
  longestFlatDays: number | null;
  avgHoldingPeriodDays: number | null;
  pnlCurveJson: { time: number; value: number }[] | null;
  drawdownCurveJson?: { time: number; value: number }[] | null;
  scoreFactors?: any;
}

/**
 * [개선] 목록 카드를 위한 축약된 결과 타입
 * 백엔드의 BacktestResultSummaryForCard 스키마에 대응
 */
export interface BacktestResultSummaryForCard
  extends Pick<
    BacktestResultSummary,
    | "totalReturnPct"
    | "mddPct"
    | "winRatePct"
    | "profitFactor"
    | "sharpeRatio"
    | "sortinoRatio"
  > {
  backtestId?: string | null;
}

// API 응답 데이터의 타입을 명확히 정의
export interface BacktestResult {
  totalReturnPct: number | null;
  mddPct: number | null;
  winRatePct: number | null;
  sharpeRatio?: number | null; // Optional properties
  sortinoRatio?: number | null;
  profitFactor?: number | null;
  totalTrades?: number | null;
  backtestScore?: number | null;
}

/**
 * [개선] 모든 백테스트 타입의 기반이 되는 '완전한' 형태의 타입.
 * 이 타입을 기준으로 다른 타입들이 파생됩니다.
 */
export interface Backtest {
  id: string;
  userId: string;
  strategyId: string;
  status: "completed" | "running" | "pending" | "failed" | "canceled";
  parameters: BacktestParametersPayload; // [개선] 상세 파라미터 타입 사용
  result: BacktestResultSummary | null;
  strategy?: Strategy;
  createdAt: string;
  completedAt?: string | null;
  progress?: number;
  tradeLogs?: TradeLog[] | null;
  // [추가] 파라미터 재현을 위한 필수 데이터
  strategySnapshot: Strategy | null;
}

/**
 * [개선] 목록 페이지(`/backtester`)의 카드에서 사용하는 타입.
 * TypeScript 유틸리티 타입(Omit, &)을 사용하여 Backtest 타입에서 파생시킴으로써 코드 중복을 제거합니다.
 */
export type BacktestInList = Omit<
  Backtest,
  "result" | "tradeLogs" | "strategySnapshot"
> & {
  result: BacktestResultSummaryForCard | null;
};
