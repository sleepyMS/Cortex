// file: src/types/optimization.ts

// 단일 최적화 시도(Trial)의 결과
export interface OptimizationTrialResult {
  trialNumber: number;
  parameters: Record<string, number>; // 예: { "ema_length": 25, "rsi_period": 14 }

  // ▼▼▼ [핵심 확장] BacktestResult의 모든 주요 지표를 포함시킵니다. ▼▼▼
  totalReturnPct: number;
  sharpeRatio: number;
  mddPct: number;
  winRatePct: number;
  profitFactor: number;
  sortinoRatio: number;
  cagrPct: number;
  totalTrades: number;
  // ▲▲▲ [확장 완료] ▲▲▲
}

// 최종 최적화 결과 페이지의 전체 데이터 구조
export interface OptimizationResult {
  id: string; // 최적화 작업 ID
  status: "RUNNING" | "COMPLETED" | "FAILED";
  objectiveMetric: "totalReturnPct" | "sharpeRatio"; // 사용자가 설정한 주 목표

  // 주 목표 기준 최고의 결과
  bestTrial: OptimizationTrialResult;

  // 요청사항: 각 지표별 Top 3 결과
  topByTotalReturn: OptimizationTrialResult[];
  topBySharpeRatio: OptimizationTrialResult[];

  // 모든 시도에 대한 전체 목록 (선택 사항)
  allTrials?: OptimizationTrialResult[];
}
