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
import { getBot, getBotLogs, getBotPerformance } from "@/lib/api/bots";
import { Skeleton } from "@/components/ui/Skeleton";
import { useParams } from "next/navigation";
import { BotHeader } from "@/components/domain/bots/detail/BotHeader";
import { PerformanceHero } from "@/components/domain/bots/detail/PerformanceHero";
import apiClient from "@/lib/apiClient";
import { UTCTimestamp } from "lightweight-charts";
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

  // Fetch trade logs
  const { data: tradeLogs } = useQuery({
    queryKey: ["bot-logs", botId],
    queryFn: () => getBotLogs(botId as string, { limit: 100 }),
    refetchInterval: 30000,
  });

  const { data: performance } = useQuery({
    queryKey: ["bot-performance", botId],
    queryFn: () => getBotPerformance(botId, 7),
    refetchInterval: 60000,
  });

  // Fetch OHLCV data for price chart
  const { data: ohlcvData } = useQuery({
    queryKey: ["ohlcv", bot?.ticker, bot?.executionInterval],
    queryFn: async () => {
      if (!bot?.ticker || !bot?.executionInterval) return [];
      const { data } = await apiClient.get<OHLCVData[]>("/market/ohlcv", {
        params: {
          ticker: bot.ticker,
          timeframe: bot.executionInterval,
          limit: 500,
        },
      });
      return data.map((d) => ({ ...d, time: d.time as UTCTimestamp }));
    },
    enabled: !!bot?.ticker && !!bot?.executionInterval,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Transform trade logs to signal data for chart markers
  const signalData = useMemo(() => {
    if (!tradeLogs || !ohlcvData || ohlcvData.length === 0)
      return { signals: [] };

    // Create a sorted array of candle times
    const candleTimes = ohlcvData
      .map((d) => d.time as number)
      .sort((a, b) => a - b);

    const signals = tradeLogs.map((log) => {
      const tradeTime = Math.floor(new Date(log.timestamp).getTime() / 1000);

      // Find the latest candle time that is less than or equal to the trade time
      let matchedTime = candleTimes[0];
      for (let i = candleTimes.length - 1; i >= 0; i--) {
        if (candleTimes[i] <= tradeTime) {
          matchedTime = candleTimes[i];
          break;
        }
      }

      return {
        time: matchedTime as UTCTimestamp,
        signalType: log.side.toLowerCase() as
          | "long_entry"
          | "long_exit"
          | "short_entry"
          | "short_exit",
      };
    });

    return { signals };
  }, [tradeLogs, ohlcvData]);

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
    queryKey: [
      "indicators",
      bot?.ticker,
      bot?.executionInterval,
      indicatorConfigs,
    ],
    queryFn: async ({ signal }) => {
      if (
        indicatorConfigs.length === 0 ||
        !bot?.ticker ||
        !bot?.executionInterval
      )
        return null;
      const { data } = await apiClient.post(
        "/strategies/calculate-indicators",
        {
          ticker: bot.ticker,
          timeframe: bot.executionInterval,
          indicators: indicatorConfigs,
        },
        { signal }
      );
      return data.results;
    },
    enabled:
      !!bot?.ticker && !!bot?.executionInterval && indicatorConfigs.length > 0,
    refetchInterval: 60000,
  });

  // Transform trade logs to system logs
  const systemLogs: SystemLog[] = useMemo(() => {
    if (!tradeLogs) return [];

    return tradeLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      side: log.side, // ✅ side 필드 그대로 전달
      price: log.price,
      quantity: log.quantity,
      pnl: log.pnl,
      reason: log.reason,
    }));
  }, [tradeLogs]);

  // 차트 데이터(ohlcvData)의 현재가를 사용하여 정확한 미실현 손익 계산
  const estimatedUnrealizedPnl = useMemo(() => {
    if (
      !bot ||
      bot.positionSize === 0 ||
      !bot.entryPrice ||
      !ohlcvData ||
      ohlcvData.length === 0
    ) {
      return 0;
    }
    const currentPrice = ohlcvData[ohlcvData.length - 1].close;
    return (currentPrice - bot.entryPrice) * bot.positionSize;
  }, [bot, ohlcvData]);

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
            {botWithPnl.ticker} - {botWithPnl.executionInterval}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DynamicStrategyChart
            rules={strategyRules}
            ohlcvData={ohlcvData || []}
            indicatorData={indicatorData || {}}
            isLoadingIndicators={isLoadingIndicators}
            signalData={signalData}
            isLoadingSignals={false}
          />
        </CardContent>
      </Card>

      {/* Balance Chart and Active Position Grid (7:3) */}
      <div className="grid gap-8 lg:grid-cols-[7fr_3fr]">
        {/* Left: Balance Chart (70%) */}
        <BalanceChart
          performance={performance || []}
          currentBalance={botWithPnl.equity ?? botWithPnl.currentBalance}
          initialCapital={botWithPnl.initialCapital}
        />

        {/* Right: Active Position (30%) */}
        <ActivePositionCard bot={botWithPnl} />
      </div>

      {/* Logs and Strategy Settings Grid (7:3) */}
      <div className="grid gap-8 lg:grid-cols-[7fr_3fr]">
        {/* Left: System Logs (70%) */}
        <BotLogViewer logs={systemLogs} />

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

      {/* Bottom Section: Trade History Full Width */}
      <BotTradeHistory trades={tradeLogs || []} />
    </div>
  );
}
