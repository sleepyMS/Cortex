"use client";

import { ActivePositionCard } from "@/components/domain/bots/detail/ActivePositionCard";
import { BalanceChart } from "@/components/domain/bots/detail/BalanceChart";
import DynamicStrategyChart from "@/components/domain/strategy/DynamicStrategyChart";
import {
  BotLogViewer,
  SystemLog,
} from "@/components/domain/bots/detail/BotLogViewer";
import { BotTradeHistory } from "@/components/domain/bots/detail/BotTradeHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  getBot,
  getBotLogs,
  getBotAnalytics,
  getBotPerformance,
} from "@/lib/api/bots";
import { Skeleton } from "@/components/ui/Skeleton";
import { useParams } from "next/navigation";
import { BotHeader } from "@/components/domain/bots/detail/BotHeader";
import { PerformanceHero } from "@/components/domain/bots/detail/PerformanceHero";
import apiClient from "@/lib/apiClient";
import { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { OHLCVData } from "@/types/market";
import { parseRulesForIndicators } from "@/lib/strategyUtils";
import { useMemo } from "react";

export default function BotDetailPage() {
  const t = useTranslations("LiveTrading.Detail");
  const params = useParams();
  const botId = params.botId as string;

  const { data: bot, isLoading: isBotLoading } = useQuery({
    queryKey: ["bot", botId],
    queryFn: () => getBot(botId),
    refetchInterval: 5000,
  });

  const { data: logs } = useQuery({
    queryKey: ["bot-logs", botId],
    queryFn: () => getBotLogs(botId, { limit: 50 }),
    refetchInterval: 10000,
  });

  // TEMPORARY: Mock data for preview
  const mockLogs =
    logs && logs.length > 0
      ? logs
      : ([
          {
            id: "1",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            side: "LONG_ENTRY",
            price: 42150.5,
            quantity: 0.0234,
            pnl: null,
            reason: "RSI oversold + MACD crossover",
          },
          {
            id: "2",
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            side: "LONG_EXIT",
            price: 42350.25,
            quantity: 0.0234,
            pnl: 125.3,
            reason: "Take profit target reached",
          },
          {
            id: "3",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            side: "SHORT_ENTRY",
            price: 41980.0,
            quantity: 0.025,
            pnl: null,
            reason: "Bearish divergence detected",
          },
          {
            id: "4",
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            side: "SHORT_EXIT",
            price: 41750.75,
            quantity: 0.025,
            pnl: 220.5,
            reason: "Take profit target reached",
          },
          {
            id: "5",
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            side: "LONG_ENTRY",
            price: 41850.3,
            quantity: 0.022,
            pnl: null,
            reason: "Support level bounce",
          },
          {
            id: "6",
            timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
            side: "LONG_EXIT",
            price: 41800.0,
            quantity: 0.022,
            pnl: -45.2,
            reason: "Stop loss triggered",
          },
        ] as any);

  // TEMPORARY: Mock system logs for preview
  const mockSystemLogs: SystemLog[] = [
    {
      id: "sys-1",
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      level: "SUCCESS",
      message: "Trade executed successfully",
      details: "BUY 0.0234 BTC @ $42,150.50",
    },
    {
      id: "sys-2",
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      level: "INFO",
      message: "Signal analysis completed",
      details: "RSI: 32.5, MACD: Bullish crossover detected",
    },
    {
      id: "sys-3",
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      level: "WARN",
      message: "Stop loss triggered",
      details: "Position closed at $42,050.25 | Loss: -$45.20",
    },
    {
      id: "sys-4",
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      level: "INFO",
      message: "Bot cycle executed",
      details: "Execution interval: 5m | Next run: 21:15:00",
    },
    {
      id: "sys-5",
      timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      level: "SUCCESS",
      message: "Bot started successfully",
      details: "Strategy: RSI + MACD | Mode: Paper Trading",
    },
    {
      id: "sys-6",
      timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      level: "INFO",
      message: "Bot initialized",
      details: "Initial capital: $10,000 | Leverage: 3x",
    },
  ];

  const { data: performance } = useQuery({
    queryKey: ["bot-performance", botId],
    queryFn: () => getBotPerformance(botId, 7),
    refetchInterval: 60000,
  });

  // Fetch OHLCV data for price chart
  const { data: ohlcvData } = useQuery({
    queryKey: ["ohlcv", bot?.ticker, "5m"],
    queryFn: async () => {
      if (!bot?.ticker) return [];
      const { data } = await apiClient.get<OHLCVData[]>("/market/ohlcv", {
        params: { ticker: bot.ticker, timeframe: "5m", limit: 500 },
      });
      return data.map((d) => ({ ...d, time: d.time as UTCTimestamp }));
    },
    enabled: !!bot?.ticker,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Prepare rules for StrategyChart
  const strategyRules = useMemo(() => {
    if (!bot?.strategy) {
      return {
        longEntry: null,
        longExit: null,
        shortEntry: null,
        shortExit: null,
      };
    }
    return {
      longEntry: bot.strategy.longEntryRules,
      longExit: bot.strategy.longExitRules,
      shortEntry: bot.strategy.shortEntryRules,
      shortExit: bot.strategy.shortExitRules,
    };
  }, [bot?.strategy]);

  // Extract indicator configs
  const indicatorConfigs = useMemo(
    () =>
      parseRulesForIndicators({
        longEntry: strategyRules.longEntry,
        longExit: strategyRules.longExit,
        shortEntry: strategyRules.shortEntry,
        shortExit: strategyRules.shortExit,
      }),
    [strategyRules]
  );

  // Fetch indicator data
  const { data: indicatorData, isLoading: isLoadingIndicators } = useQuery({
    queryKey: ["indicators", bot?.ticker, "5m", indicatorConfigs],
    queryFn: async ({ signal }) => {
      if (indicatorConfigs.length === 0 || !bot?.ticker) return null;
      const { data } = await apiClient.post(
        "/strategies/calculate-indicators",
        {
          ticker: bot.ticker,
          timeframe: "5m",
          indicators: indicatorConfigs,
        },
        { signal }
      );
      return data.results;
    },
    enabled: !!bot?.ticker && indicatorConfigs.length > 0,
    refetchInterval: 60000,
  });

  const estimatedUnrealizedPnl =
    bot &&
    bot.positionSize !== 0 &&
    bot.entryPrice &&
    performance &&
    performance.length > 0
      ? performance[performance.length - 1].balance -
        bot.initialCapital -
        bot.totalPnl
      : 0;

  const botWithPnl = bot
    ? { ...bot, unrealizedPnl: bot.unrealizedPnl ?? estimatedUnrealizedPnl }
    : null;

  if (isBotLoading || !botWithPnl) {
    return (
      <div className="container mx-auto p-8 space-y-8 max-w-7xl">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <BotHeader bot={botWithPnl} />

      {/* Performance Hero */}
      <PerformanceHero bot={botWithPnl} />

      {/* Full Width Price Chart */}
      <Card className="border-2 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {botWithPnl.ticker} - 5m
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DynamicStrategyChart
            rules={strategyRules}
            ohlcvData={ohlcvData || []}
            indicatorData={indicatorData || {}}
            isLoadingIndicators={isLoadingIndicators}
            isLoadingSignals={false}
          />
        </CardContent>
      </Card>

      {/* Active Position Card (only shows if position exists) */}
      <ActivePositionCard bot={botWithPnl} />

      {/* Logs and Strategy Settings Grid (7:3) */}
      <div className="grid gap-8 lg:grid-cols-[7fr_3fr]">
        {/* Left: System Logs (70%) */}
        <BotLogViewer logs={mockSystemLogs} />

        {/* Right: Strategy Configuration (30%) */}
        <Card>
          <CardHeader>
            <CardTitle>{t("strategyConfig")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  {t("strategy")}
                </span>
                <span className="font-medium">
                  {botWithPnl.strategy?.name || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  {t("executionInterval")}
                </span>
                <span className="font-medium">
                  {botWithPnl.executionInterval}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  {t("leverage")}
                </span>
                <span className="font-medium">{botWithPnl.leverage}x</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  {t("dailyLossLimit")}
                </span>
                <span className="font-medium">
                  {botWithPnl.dailyMaxLossEnabled
                    ? `${botWithPnl.dailyMaxLossPct}%`
                    : t("disabled")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Chart Section */}
      <BalanceChart
        performance={performance || []}
        currentBalance={botWithPnl.currentBalance}
        initialCapital={botWithPnl.initialCapital}
      />

      {/* Bottom Section: Trade History Full Width */}
      <BotTradeHistory trades={mockLogs || []} />
    </div>
  );
}
