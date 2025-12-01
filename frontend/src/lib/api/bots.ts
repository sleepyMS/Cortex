// file: frontend/src/lib/api/bots.ts

import apiClient from "@/lib/apiClient";
import { UUID } from "crypto";
import { Strategy } from "@/types/strategy";

// ============ Types ============

export interface CreateBotPayload {
  strategyId: string;
  apiKeyId?: string | null;
  initialCapital: number;
  ticker: string;
  executionInterval: string;
  trailingStopConfig?: {
    enabled: boolean;
    activationPct: number;
    callbackPct: number;
  } | null;
  mode: "paper" | "live";
  leverage: number;
  dailyMaxLossPct?: number | null;
  dailyMaxLossEnabled: boolean;
}

export interface LiveBot {
  id: string;
  userId: string;
  strategyId: string;
  strategy?: Strategy; // Added strategy field
  apiKeyId: string;
  status: string;
  mode: string;
  currentBalance: number | null;
  positionSize: number;
  entryPrice: number | null;
  lastSignal: string | null;
  startedAt: string;
  stoppedAt: string | null;
  lastRunAt: string | null;
  initialCapital: number;
  executionInterval: string;
  trailingStopConfig: any;
  ticker: string;
  leverage: number;
  dailyMaxLossPct: number | null;
  dailyMaxLossEnabled: boolean;
  dailyPnl: number;
  totalTrades: number;
  winningTrades: number;
  totalPnl: number;
  maxDrawdown: number;
  lastError: string | null;
  errorCount: number;
  apiKey?: {
    id: string;
    exchange: string;
    apiKeyPreview: string | null;
  };
  unrealizedPnl?: number; // Optional as it might be calculated on frontend or backend
}

export interface BotTradeLog {
  id: string;
  timestamp: string;
  side: string;
  price: number;
  quantity: number;
  commission: number | null;
  pnl: number | null;
  currentBalance: number | null;
  reason: string | null;
}

export interface BotAnalytics {
  botId: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalReturnPct: number;
  dailyPnl: number;
  maxDrawdown: number;
  sharpeRatio: number | null;
  profitFactor: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  largestWin: number | null;
  largestLoss: number | null;
  avgHoldingTime: string | null;
  totalRuntime: string;
}

export interface BotPerformanceSnapshot {
  snapshotDate: string;
  balance: number;
  positionSize: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalTrades: number;
}

export interface UpdateBotStatusPayload {
  status: "active" | "paused" | "stopped";
}

// ============ API Functions ============

/**
 * 새로운 봇 생성
 */
export async function createBot(payload: CreateBotPayload): Promise<LiveBot> {
  const response = await apiClient.post("/live-bots/", payload);
  return response.data;
}

/**
 * 사용자의 모든 봇 조회
 */
export async function getBots(params?: {
  skip?: number;
  limit?: number;
}): Promise<LiveBot[]> {
  const response = await apiClient.get("/live-bots/", { params });
  return response.data;
}

/**
 * 특정 봇 상세 조회
 */
export async function getBot(botId: string): Promise<LiveBot> {
  const response = await apiClient.get(`/live-bots/${botId}`);
  return response.data;
}

/**
 * 봇 상태 업데이트 (시작/중지/일시정지)
 */
export async function updateBotStatus(
  botId: string,
  payload: UpdateBotStatusPayload
): Promise<LiveBot> {
  const response = await apiClient.put(`/live-bots/${botId}`, payload);
  return response.data;
}

/**
 * 봇 삭제
 */
export async function deleteBot(botId: string): Promise<void> {
  await apiClient.delete(`/live-bots/${botId}`);
}

/**
 * 봇 거래 로그 조회
 */
export async function getBotLogs(
  botId: string,
  params?: { limit?: number; skip?: number }
): Promise<BotTradeLog[]> {
  const response = await apiClient.get(`/live-bots/${botId}/logs`, { params });
  return response.data;
}

/**
 * 봇 성과 분석 조회
 */
export async function getBotAnalytics(botId: string): Promise<BotAnalytics> {
  const response = await apiClient.get(`/live-bots/${botId}/analytics`);
  return response.data;
}

/**
 * 봇 성과 히스토리 조회 (차트용)
 */
export async function getBotPerformance(
  botId: string,
  days: number = 30
): Promise<BotPerformanceSnapshot[]> {
  const response = await apiClient.get(`/live-bots/${botId}/performance`, {
    params: { days },
  });
  return response.data;
}

/**
 * 긴급 청산 (Panic Sell)
 */
export async function panicSell(botId: string): Promise<{
  status: string;
  message: string;
  mode: string;
}> {
  const response = await apiClient.post(`/live-bots/${botId}/panic-sell`);
  return response.data;
}
