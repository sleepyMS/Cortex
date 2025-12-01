"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTranslations } from "next-intl";
import { LiveBot } from "@/lib/api/bots";

interface BotControlPanelProps {
  bot: LiveBot;
}

export function BotControlPanel({ bot }: BotControlPanelProps) {
  const t = useTranslations("LiveTrading.Detail");

  if (bot.positionSize === 0) {
    return (
      <Card className="h-full border-dashed bg-muted/30">
        <CardContent className="h-full flex flex-col items-center justify-center p-6 text-muted-foreground">
          <p className="font-medium">{t("activePosition")}</p>
          <p className="text-sm mt-1">No open positions</p>
        </CardContent>
      </Card>
    );
  }

  const pnlColor =
    (bot.unrealizedPnl || 0) >= 0 ? "text-green-500" : "text-red-500";
  const pnlBg = (bot.unrealizedPnl || 0) >= 0 ? "bg-green-500" : "bg-red-500";
  const pnlPercent =
    bot.initialCapital > 0
      ? (((bot.unrealizedPnl || 0) / bot.initialCapital) * 100).toFixed(2)
      : "0.00";

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>{t("activePosition")}</span>
          <span
            className={`text-sm px-2 py-0.5 rounded-full ${
              bot.positionSize > 0
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {bot.positionSize > 0 ? t("long") : t("short")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-6 space-y-6">
          {/* Main PnL Display */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Unrealized PnL</p>
            <div className={`text-3xl font-bold ${pnlColor}`}>
              {(bot.unrealizedPnl || 0) >= 0 ? "+" : "-"}$
              {Math.abs(bot.unrealizedPnl || 0).toFixed(2)}
            </div>
            <div className={`text-sm font-medium ${pnlColor}`}>
              ({(bot.unrealizedPnl || 0) >= 0 ? "+" : ""}
              {pnlPercent}%)
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${pnlBg} transition-all duration-500`}
              style={{
                width: `${Math.min(Math.abs(Number(pnlPercent)) * 5, 100)}%`,
              }} // Visual scaling
            />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t("size")}
              </p>
              <p className="font-mono text-lg">{Math.abs(bot.positionSize)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t("entryPrice")}
              </p>
              <p className="font-mono text-lg">${bot.entryPrice?.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
