"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useTranslations } from "next-intl";
import { Terminal } from "lucide-react";
import { useTheme } from "next-themes";

export interface SystemLog {
  id: string;
  timestamp: string;
  level?: "INFO" | "WARN" | "ERROR" | "DEBUG" | "SUCCESS";
  message?: string;
  details?: string;
  // TradeLog fields
  side: string;
  price: number;
  quantity: number;
  pnl?: number | null;
  reason?: string | null;
}

interface BotLogViewerProps {
  logs: SystemLog[];
}

export function BotLogViewer({ logs }: BotLogViewerProps) {
  const t = useTranslations("LiveTrading.Detail");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const getLevelColor = (level: SystemLog["level"]) => {
    switch (level) {
      case "ERROR":
        return isDark ? "text-red-400" : "text-red-600";
      case "WARN":
        return isDark ? "text-yellow-400" : "text-yellow-600";
      case "DEBUG":
        return isDark ? "text-blue-400" : "text-blue-600";
      case "SUCCESS":
        return isDark ? "text-green-400" : "text-green-600";
      default:
        return isDark ? "text-gray-400" : "text-gray-600";
    }
  };

  const getLevelSymbol = (level: SystemLog["level"]) => {
    switch (level) {
      case "ERROR":
        return "✗";
      case "WARN":
        return "⚠";
      case "DEBUG":
        return "◆";
      case "SUCCESS":
        return "✓";
      default:
        return "ℹ";
    }
  };

  const isSystemLog = (side: string) => {
    return [
      "BOT_DEPLOYED",
      "BOT_PAUSED",
      "BOT_RESUMED",
      "BOT_STOPPED",
    ].includes(side);
  };

  const getSystemLogLevel = (side: string): SystemLog["level"] => {
    switch (side) {
      case "BOT_DEPLOYED":
      case "BOT_RESUMED":
        return "SUCCESS";
      case "BOT_PAUSED":
        return "WARN";
      case "BOT_STOPPED":
        return "INFO";
      default:
        return "INFO";
    }
  };

  const formatLogMessage = (log: any) => {
    if (isSystemLog(log.side)) {
      // 시스템 로그는 다국어 키로 변환
      // BOT_DEPLOYED -> botDeployed, BOT_PAUSED -> botPaused
      const eventName = log.side
        .replace("BOT_", "")
        .split("_")
        .map((word: string, index: number) =>
          index === 0
            ? word.toLowerCase()
            : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join("");

      const translationKey = `systemLogs.bot${eventName
        .charAt(0)
        .toUpperCase()}${eventName.slice(1)}`;
      return (
        t(translationKey as any) ||
        log.reason ||
        log.side.replace("BOT_", "").toLowerCase()
      );
    } else {
      // 거래 로그는 다국어 적용
      const pnlText =
        log.pnl !== null && log.pnl !== undefined
          ? `PnL: ${log.pnl >= 0 ? "+" : ""}$${log.pnl.toFixed(2)}`
          : "PnL: N/A";
      const price = log.price?.toLocaleString() || "0";
      const quantity = log.quantity || 0;

      // 거래 타입 번역 (LONG_ENTRY -> longEntry)
      const tradeTypeKey = log.side
        .toLowerCase()
        .replace(/_(.)/g, (_: string, letter: string) => letter.toUpperCase());
      const tradeType = t(`types.${tradeTypeKey}` as any) || log.side;

      return `${tradeType} ${quantity} BTC @ $${price} | ${pnlText}`;
    }
  };

  return (
    <Card
      className={
        isDark ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200"
      }
    >
      <CardHeader
        className={
          isDark
            ? "border-b border-slate-800 bg-slate-900/50"
            : "border-b border-gray-200 bg-gray-50/50"
        }
      >
        <CardTitle
          className={`flex items-center gap-2 ${
            isDark ? "text-slate-200" : "text-gray-900"
          }`}
        >
          <Terminal
            className={`h-5 w-5 ${
              isDark ? "text-green-400" : "text-green-600"
            }`}
          />
          {t("liveLogs")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] w-full">
          {logs.length > 0 ? (
            <div className="p-4 space-y-1 font-mono text-xs">
              {logs.map((log) => {
                const logLevel = isSystemLog(log.side)
                  ? getSystemLogLevel(log.side)
                  : "INFO";
                const logMessage = formatLogMessage(log);

                return (
                  <div key={log.id} className="leading-relaxed">
                    <div className="flex items-start gap-2">
                      <span
                        className={
                          isDark
                            ? "text-slate-500 shrink-0"
                            : "text-gray-500 shrink-0"
                        }
                      >
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span
                        className={`shrink-0 font-bold ${getLevelColor(
                          logLevel
                        )}`}
                      >
                        {getLevelSymbol(logLevel)} {logLevel}
                      </span>
                      <span
                        className={`flex-1 ${
                          isDark ? "text-slate-300" : "text-gray-700"
                        }`}
                      >
                        {logMessage}
                      </span>
                    </div>
                    {log.details && (
                      <div
                        className={`ml-[140px] mt-0.5 ${
                          isDark ? "text-slate-500" : "text-gray-500"
                        }`}
                      >
                        └─ {log.details}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div
                className={`rounded-full p-4 mb-4 ${
                  isDark ? "bg-slate-800" : "bg-gray-100"
                }`}
              >
                <Terminal
                  className={`h-8 w-8 ${
                    isDark ? "text-green-400" : "text-green-600"
                  }`}
                />
              </div>
              <p
                className={`text-lg font-medium mb-2 ${
                  isDark ? "text-slate-300" : "text-gray-700"
                }`}
              >
                {t("waitingForLogs")}
              </p>
              <p
                className={`text-sm max-w-sm font-mono ${
                  isDark ? "text-slate-500" : "text-gray-500"
                }`}
              >
                $ waiting for system events...
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
