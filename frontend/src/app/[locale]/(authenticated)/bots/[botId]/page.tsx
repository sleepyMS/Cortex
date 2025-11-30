"use client";

import { BotControlPanel } from "@/components/domain/bots/detail/BotControlPanel";
import { BotChart } from "@/components/domain/bots/detail/BotChart";
import { BotLogViewer } from "@/components/domain/bots/detail/BotLogViewer";
import { BotTradeHistory } from "@/components/domain/bots/detail/BotTradeHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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

export default function BotDetailPage() {
  const t = useTranslations("LiveTrading.Detail");
  const params = useParams();
  const botId = params.botId as string;

  // 봇 상세 정보 조회
  const { data: bot, isLoading: isBotLoading } = useQuery({
    queryKey: ["bot", botId],
    queryFn: () => getBot(botId),
    refetchInterval: 5000, // 5초마다 갱신
  });

  // 봇 로그 조회
  const { data: logs } = useQuery({
    queryKey: ["bot-logs", botId],
    queryFn: () => getBotLogs(botId, { limit: 50 }),
    refetchInterval: 10000,
  });

  // 봇 분석 데이터 조회
  const { data: analytics } = useQuery({
    queryKey: ["bot-analytics", botId],
    queryFn: () => getBotAnalytics(botId),
    refetchInterval: 30000, // 30초마다 갱신
  });

  // 봇 성과 히스토리 조회
  const { data: performance } = useQuery({
    queryKey: ["bot-performance", botId],
    queryFn: () => getBotPerformance(botId, 7), // 최근 7일
    refetchInterval: 60000, // 1분마다 갱신
  });

  if (isBotLoading || !bot) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {bot.strategy?.name || "Bot Detail"}
          </h1>
          <p className="text-muted-foreground">
            {bot.mode === "paper" ? "📄 Paper Trading" : "🔴 Live Trading"} •{" "}
            {bot.ticker}
          </p>
        </div>
        <Badge
          variant={bot.status === "active" ? "default" : "secondary"}
          className={
            bot.status === "active"
              ? "bg-green-500 hover:bg-green-600"
              : bot.status === "error"
              ? "bg-red-500 hover:bg-red-600"
              : "bg-gray-500 hover:bg-gray-600"
          }
        >
          {bot.status.toUpperCase()}
        </Badge>
      </div>

      {/* Bot Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(bot.currentBalance || bot.initialCapital).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total PnL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                bot.totalPnl >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              ${Math.abs(bot.totalPnl).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {bot.totalPnl >= 0 ? "+" : ""}
              {bot.initialCapital > 0
                ? ((bot.totalPnl / bot.initialCapital) * 100).toFixed(2)
                : "0.00"}
              %
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bot.totalTrades > 0
                ? ((bot.winningTrades / bot.totalTrades) * 100).toFixed(1)
                : "0.0"}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {bot.winningTrades}/{bot.totalTrades} trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Max Drawdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {bot.maxDrawdown.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel and Chart */}
      <div className="grid gap-6 md:grid-cols-2">
        <BotControlPanel bot={bot} />
        <BotChart performance={performance || []} />
      </div>

      {/* Trade History and Logs */}
      <div className="grid gap-6 md:grid-cols-2">
        <BotTradeHistory trades={logs || []} />
        <BotLogViewer logs={logs || []} />
      </div>

      {/* Strategy Details */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Strategy</p>
              <p className="font-medium">{bot.strategy?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Execution Interval
              </p>
              <p className="font-medium">{bot.executionInterval}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Leverage</p>
              <p className="font-medium">{bot.leverage}x</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daily Loss Limit</p>
              <p className="font-medium">
                {bot.dailyMaxLossEnabled
                  ? `${bot.dailyMaxLossPct}%`
                  : "Disabled"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
