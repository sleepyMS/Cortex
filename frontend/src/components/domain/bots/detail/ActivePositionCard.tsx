"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTranslations } from "next-intl";
import { LiveBot } from "@/lib/api/bots";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface ActivePositionCardProps {
  bot: LiveBot;
}

export function ActivePositionCard({ bot }: ActivePositionCardProps) {
  const t = useTranslations("LiveTrading.Detail");

  const hasPosition = bot.positionSize !== 0;
  const pnlColor =
    (bot.unrealizedPnl || 0) >= 0 ? "text-green-500" : "text-red-500";
  const pnlBg = (bot.unrealizedPnl || 0) >= 0 ? "bg-green-500" : "bg-red-500";
  const pnlPercent =
    bot.initialCapital > 0
      ? (((bot.unrealizedPnl || 0) / bot.initialCapital) * 100).toFixed(2)
      : "0.00";

  return (
    <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 group">
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <CardHeader className="bg-primary/5 pb-4 relative">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span>{t("activePosition")}</span>
          {hasPosition && (
            <span
              className={`text-sm px-3 py-1 rounded-full font-bold ${
                bot.positionSize > 0
                  ? "bg-green-500/10 text-green-600 border border-green-500/20"
                  : "bg-red-500/10 text-red-600 border border-red-500/20"
              }`}
            >
              {bot.positionSize > 0 ? t("long") : t("short")}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6 relative">
        {hasPosition ? (
          <>
            {/* Main PnL Display */}
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t("unrealizedPnl")}
              </p>
              <div
                className={`text-4xl font-bold ${pnlColor} flex items-center justify-center gap-2`}
              >
                {(bot.unrealizedPnl || 0) >= 0 ? (
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-500/10">
                    <ArrowUpRight className="h-6 w-6" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-500/10">
                    <ArrowDownRight className="h-6 w-6" />
                  </div>
                )}
                <span>
                  {(bot.unrealizedPnl || 0) >= 0 ? "+" : "-"}$
                  {Math.abs(bot.unrealizedPnl || 0).toFixed(2)}
                </span>
              </div>
              <div className={`text-lg font-semibold ${pnlColor}`}>
                ({(bot.unrealizedPnl || 0) >= 0 ? "+" : ""}
                {pnlPercent}%)
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${pnlBg} transition-all duration-500 rounded-full`}
                  style={{
                    width: `${Math.min(
                      Math.abs(Number(pnlPercent)) * 5,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {t("performanceIndicator")}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {t("size")}
                </p>
                <p className="font-mono text-lg font-bold">
                  {Math.abs(bot.positionSize).toFixed(4)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {t("entryPrice")}
                </p>
                <p className="font-mono text-lg font-bold">
                  ${bot.entryPrice?.toFixed(2)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="relative flex flex-col items-center justify-center text-muted-foreground py-8">
            {/* Empty state gradient */}
            <div className="absolute inset-0 gradient-mesh opacity-20 rounded-lg" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium">{t("noActivePosition")}</p>
              <p className="text-sm mt-2 text-center max-w-sm">
                {t("noActivePositionDescription")}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
