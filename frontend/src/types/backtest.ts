// file: src/types/backtest.ts

import { Strategy } from "./strategy";
import { TradeLog } from "./tradelog";

/**
 * 백엔드로부터 받는 상세 백테스트 결과 객체의 전체 형태입니다.
 */
export interface BacktestResult {
  backtestScore?: number;
  totalReturnPct: number | null;
  mddPct: number | null;
  winRatePct: number | null;
  sharpeRatio?: number | null;
  profitFactor?: number | null;
  sortinoRatio?: number | null;
  cagrPct?: number | null;
  totalTrades?: number | null;
  winningTrades?: number | null;
  losingTrades?: number | null;
  pnlCurveJson: { time: number; value: number }[] | null;
  calmarRatio?: number | null;
  avgProfitLossRatio?: number | null;
  ulcerIndex?: number | null;
  longestFlatDays?: number | null;
  avgHoldingPeriodDays?: number | null;
  kRatio?: number | null;
  drawdownCurveJson?: { time: number; value: number }[] | null;
}

/**
 * 백테스트 상세 페이지(`/backtester/[backtestId]`)에서 사용하는
 * 완전한 형태의 Backtest 객체 타입입니다.
 */
export interface Backtest {
  id: string;
  status: "completed" | "running" | "pending" | "failed" | "canceled";
  parameters: {
    startDate: string;
    endDate: string;
    initialCapital: number;
  };
  // [핵심] result 속성이 위에서 정의한 완전한 BacktestResult 타입을 사용하도록 합니다.
  result: BacktestResult | null;
  strategy: Strategy;
  createdAt: string;
  progress?: number;
  tradeLogs?: TradeLog[] | null;
}

/**
 * 백테스트 목록 페이지(`/backtester`)의 카드에서 사용하는
 * 축약된 형태의 Backtest 객체 타입입니다.
 */
export interface BacktestSummary {
  id: string;
  status: "completed" | "running" | "pending" | "failed" | "canceled";
  parameters: {
    startDate: string;
    endDate: string;
    initialCapital: number;
  };
  result: {
    // result가 축약된 형태
    totalReturnPct: number | null;
    winRatePct: number | null;
  } | null;
  strategy: Strategy;
  createdAt: string;
  progress?: number;
}
