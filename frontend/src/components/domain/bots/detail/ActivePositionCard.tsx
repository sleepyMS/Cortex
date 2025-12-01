"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTranslations } from "next-intl";
import { LiveBot } from "@/lib/api/bots";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ActivePositionCardProps {
  bot: LiveBot;
}

export function ActivePositionCard({ bot }: ActivePositionCardProps) {
  const t = useTranslations("LiveTrading.Detail");

  // Don't render if no position
  if (bot.positionSize === 0) {
    return null;
  }

  const pnlColor =
    (bot.unrealizedPnl || 0) >= 0 ? "text-green-500" : "text-red-500";
  const pnlBg = (bot.unrealizedPnl || 0) >= 0 ? "bg-green-500" : "bg-red-500";
  const pnlPercent =
    bot.initialCapital > 0
      ? (((bot.unrealizedPnl || 0) / bot.initialCapital) * 100).toFixed(2)
      : "0.00";

  return (
    <Card className="overflow-hidden border-2 border-primary/20">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span>{t("activePosition")}</span>
          <span
            className={`text-sm px-3 py-1 rounded-full font-bold ${
              bot.positionSize > 0
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {bot.positionSize > 0 ? t("long") : t("short")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Main PnL Display */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Unrealized PnL
          </p>
          <div
            className={`text-4xl font-bold ${pnlColor} flex items-center justify-center gap-2`}
          >
            {(bot.unrealizedPnl || 0) >= 0 ? (
              <TrendingUp className="h-8 w-8" />
            ) : (
              <TrendingDown className="h-8 w-8" />
            )}
            {(bot.unrealizedPnl || 0) >= 0 ? "+" : "-"}$
            {Math.abs(bot.unrealizedPnl || 0).toFixed(2)}
          </div>
          <div className={`text-lg font-semibold ${pnlColor}`}>
            ({(bot.unrealizedPnl || 0) >= 0 ? "+" : ""}
            {pnlPercent}%)
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${pnlBg} transition-all duration-500`}
              style={{
                width: `${Math.min(Math.abs(Number(pnlPercent)) * 5, 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Performance Indicator
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {t("size")}
            </p>
            <p className="font-mono text-xl font-bold">
              {Math.abs(bot.positionSize)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {t("entryPrice")}
            </p>
            <p className="font-mono text-xl font-bold">
              ${bot.entryPrice?.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
