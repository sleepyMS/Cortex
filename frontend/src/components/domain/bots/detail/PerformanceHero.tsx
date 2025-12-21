"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { useTranslations } from "next-intl";
import { LiveBot } from "@/lib/api/bots";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Target,
  BarChart3,
} from "lucide-react";

interface PerformanceHeroProps {
  bot: LiveBot;
}

export function PerformanceHero({ bot }: PerformanceHeroProps) {
  const t = useTranslations("LiveTrading.Detail");

  const pnlColor = bot.totalPnl >= 0 ? "text-green-500" : "text-red-500";

  const pnlPercentage =
    bot.initialCapital > 0
      ? ((bot.totalPnl / bot.initialCapital) * 100).toFixed(2)
      : "0.00";

  const winRate =
    bot.totalTrades > 0
      ? ((bot.winningTrades / bot.totalTrades) * 100).toFixed(1)
      : "0.0";

  const cash = bot.currentBalance ?? bot.initialCapital;
  const totalEquity = bot.equity ?? cash;
  const unrealizedPnL = bot.unrealizedPnl || 0;

  let positionValue = 0;
  if (bot.positionSize && bot.entryPrice && bot.positionSize !== 0) {
    const currentPrice = unrealizedPnL / bot.positionSize + bot.entryPrice;
    positionValue = currentPrice * Math.abs(bot.positionSize);
  }

  return (
    <Card className="border overflow-hidden transition-all duration-300 hover:shadow-lg">
      <CardContent className="p-0">
        {/* Main Equity Hero Section */}
        <div className="relative p-8 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <div className="flex items-start justify-between">
            {/* Left: Main Equity Display */}
            <div className="flex items-start gap-6">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("totalEquity")}
                </p>
                <div className="text-5xl font-bold tracking-tight">
                  $
                  {totalEquity.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                {/* Quick stats inline */}
                <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Wallet className="h-4 w-4" />
                    {t("cash")}:{" "}
                    <span className="font-mono text-foreground">
                      ${cash.toFixed(2)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {t("position")}:{" "}
                    <span className="font-mono text-foreground">
                      {Math.abs(bot.positionSize).toFixed(4)}{" "}
                      {bot.ticker.replace("USDT", "")}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Mode & Exchange Info */}
            <div className="text-right space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t("tradingMode")}
              </p>
              <p className="text-sm font-medium">
                {bot.mode === "paper"
                  ? t("paperTradingMode")
                  : t("liveTradingMode")}
              </p>
              {bot.apiKey && (
                <>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-2">
                    {t("exchange")}
                  </p>
                  <p className="text-sm font-medium">{bot.apiKey.exchange}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-t bg-muted/20">
          {/* Total PnL */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-background hover:bg-muted/50 transition-colors">
            <div
              className={`flex items-center justify-center h-10 w-10 rounded-xl ${
                bot.totalPnl >= 0 ? "bg-green-500/10" : "bg-red-500/10"
              }`}
            >
              {bot.totalPnl >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {t("totalPnl")}
              </p>
              <p className={`text-xl font-bold ${pnlColor}`}>
                {bot.totalPnl >= 0 ? "+" : "-"}$
                {Math.abs(bot.totalPnl).toFixed(2)}
              </p>
              <div
                className={`text-xs font-medium flex items-center gap-1 ${pnlColor}`}
              >
                {bot.totalPnl >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {pnlPercentage}%
              </div>
            </div>
          </div>

          {/* Unrealized PnL */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-background hover:bg-muted/50 transition-colors">
            <div
              className={`flex items-center justify-center h-10 w-10 rounded-xl ${
                unrealizedPnL >= 0 ? "bg-green-500/10" : "bg-red-500/10"
              }`}
            >
              <BarChart3
                className={`h-5 w-5 ${
                  unrealizedPnL >= 0 ? "text-green-500" : "text-red-500"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {t("unrealizedPnL")}
              </p>
              <p
                className={`text-xl font-bold ${
                  unrealizedPnL >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {unrealizedPnL >= 0 ? "+" : "-"}$
                {Math.abs(unrealizedPnL).toFixed(2)}
              </p>
              {positionValue > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("positionValue")}: ${positionValue.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Win Rate */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-background hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-blue-500/10">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {t("winRate")}
              </p>
              <p className="text-xl font-bold">{winRate}%</p>
              <p className="text-xs text-muted-foreground">
                {t("tradesCount", {
                  winning: bot.winningTrades,
                  total: bot.totalTrades,
                })}
              </p>
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-background hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-red-500/10">
              <Percent className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {t("maxDrawdown")}
              </p>
              <p className="text-xl font-bold text-red-500">
                {bot.maxDrawdown.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground">{t("riskLevel")}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
