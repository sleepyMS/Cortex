"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Badge } from "@/components/ui/Badge";
import { useTranslations } from "next-intl";
import { BotTradeLog } from "@/lib/api/bots";

interface BotLogViewerProps {
  logs: BotTradeLog[];
}

export function BotLogViewer({ logs }: BotLogViewerProps) {
  const t = useTranslations("LiveTrading.Detail");

  // 거래 로그를 로그 형식으로 변환
  const formatLogEntry = (trade: BotTradeLog) => {
    const level = trade.pnl && trade.pnl < 0 ? "WARN" : "INFO";
    const message = `${trade.side} ${trade.quantity.toFixed(
      4
    )} @ $${trade.price.toFixed(2)}${
      trade.pnl !== null && trade.pnl !== undefined
        ? ` | PnL: $${trade.pnl.toFixed(2)}`
        : ""
    }${trade.reason ? ` | ${trade.reason}` : ""}`;

    return {
      id: trade.id,
      timestamp: new Date(trade.timestamp).toLocaleTimeString(),
      level,
      message,
    };
  };

  const logEntries = logs.map(formatLogEntry);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("liveLogs")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          {logEntries.length > 0 ? (
            <div className="space-y-2">
              {logEntries.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 text-sm font-mono"
                >
                  <span className="text-muted-foreground shrink-0">
                    {log.timestamp}
                  </span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${
                      log.level === "ERROR"
                        ? "border-red-500 text-red-500"
                        : log.level === "WARN"
                        ? "border-yellow-500 text-yellow-500"
                        : log.level === "DEBUG"
                        ? "border-blue-500 text-blue-500"
                        : "border-green-500 text-green-500"
                    }`}
                  >
                    {log.level}
                  </Badge>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("waitingForLogs")}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
