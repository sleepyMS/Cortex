// file: src/types/backtest.ts (신규 생성 또는 수정)

import { Strategy } from "./strategy"; // strategy 타입이 다른 곳에 정의되어 있다고 가정

/**
 * 백엔드로부터 받는 상세 백테스트 결과 객체의 전체 형태입니다.
 * BacktestResultSummary 컴포넌트가 기대하는 모든 필드를 포함해야 합니다.
 */
export interface BacktestResult {
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
  pnlCurveJson: { time: string; value: number }[] | null;
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
