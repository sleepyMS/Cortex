// /src/types/optimization.ts

import { Strategy } from "@/types/strategy";

export interface OptimizationJob {
  id: string;
  status: "completed" | "running" | "pending" | "failed" | "canceled";
  type: "general" | "wfo"; // [중요] 일반/WFO 구분
  strategy: Strategy;
  progress: {
    current_step: number; // e.g., 700 (trials) or 7 (folds)
    total_steps: number; // e.g., 1000 (trials) or 10 (folds)
  } | null;
  bestResult: {
    cortexScore: number | null;
    totalReturnPct: number | null;
    mddPct: number | null;
  } | null;
  createdAt: string;
}
