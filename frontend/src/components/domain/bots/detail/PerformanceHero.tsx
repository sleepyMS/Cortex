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
} from "lucide-react";

interface PerformanceHeroProps {
  bot: LiveBot;
}

export function PerformanceHero({ bot }: PerformanceHeroProps) {
  const t = useTranslations("LiveTrading.Detail");

  const pnlColor = bot.totalPnl >= 0 ? "text-green-500" : "text-red-500";
  const bgTint =
    bot.totalPnl >= 0
      ? "bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20"
      : "bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20";

  const pnlPercentage =
    bot.initialCapital > 0
      ? ((bot.totalPnl / bot.initialCapital) * 100).toFixed(2)
      : "0.00";

  const winRate =
    bot.totalTrades > 0
      ? ((bot.winningTrades / bot.totalTrades) * 100).toFixed(1)
      : "0.0";

  // Calculate position value (unrealized PnL)
  const positionValue =
    bot.equity && bot.currentBalance ? bot.equity - bot.currentBalance : 0;

  // Total equity should be currentBalance + positionValue
  const totalEquity =
    (bot.currentBalance ?? bot.initialCapital) + positionValue;

  return (
    <Card className={`border-none shadow-sm ${bgTint}`}>
      <CardContent className="p-8">
        {/* Row 1: Main Balance + Mode Info */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b">
          <div className="flex items-start gap-8">
            {/* Left: Main Equity Display */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t("totalEquity")}
              </p>
              <div className="text-5xl font-bold tracking-tight">
                ${totalEquity.toFixed(2)}
              </div>
            </div>

            {/* Right: Breakdown Details */}
            <div className="flex-1 flex items-center">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{t("cash")}:</span>
                  <span className="font-mono">
                    ${(bot.currentBalance ?? bot.initialCapital).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{t("position")}:</span>
                  <span className="font-mono">
                    {Math.abs(bot.positionSize).toFixed(4)}{" "}
                    {bot.ticker.replace("USDT", "")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{t("positionValue")}:</span>
                  <span
                    className={`font-mono ${
                      positionValue >= 0
                        ? "text-green-500"
                        : positionValue < 0
                        ? "text-red-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {positionValue !== 0
                      ? `${
                          positionValue >= 0 ? "+" : ""
                        }$${positionValue.toFixed(2)}`
                      : "$0.00"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mode & Exchange Info */}
          <div className="text-right space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Trading Mode
            </p>
            <p className="text-sm font-medium">
              {bot.mode === "paper" ? "Paper Trading" : "Live Trading"}
            </p>
            {bot.apiKey && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-2">
                  Exchange
                </p>
                <p className="text-sm font-medium">{bot.apiKey.exchange}</p>
              </>
            )}
          </div>
        </div>

        {/* Row 2: Secondary Metrics */}
        <div className="grid grid-cols-3 gap-8">
          {/* PnL */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t("totalPnl")}
            </p>
            <div className={`text-2xl font-bold ${pnlColor}`}>
              {bot.totalPnl >= 0 ? "+" : "-"}$
              {Math.abs(bot.totalPnl).toFixed(2)}
            </div>
            <div
              className={`text-sm font-medium flex items-center gap-1 ${pnlColor}`}
            >
              {bot.totalPnl >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {pnlPercentage}%
            </div>
          </div>

          {/* Win Rate */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("winRate")}
            </p>
            <div className="text-2xl font-bold">{winRate}%</div>
            <p className="text-sm text-muted-foreground">
              {bot.winningTrades} / {bot.totalTrades} trades
            </p>
          </div>

          {/* MDD */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-5 w-5" />
              {t("maxDrawdown")}
            </p>
            <div className="text-2xl font-bold text-red-500">
              {bot.maxDrawdown.toFixed(2)}%
            </div>
            <p className="text-sm text-muted-foreground">Risk Level</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
