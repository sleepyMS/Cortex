"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useTranslations } from "next-intl";
import { Activity, Terminal } from "lucide-react";

export interface SystemLog {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG" | "SUCCESS";
  message: string;
  details?: string;
}

interface BotLogViewerProps {
  logs: SystemLog[];
}

export function BotLogViewer({ logs }: BotLogViewerProps) {
  const t = useTranslations("LiveTrading.Detail");

  const getLevelColor = (level: SystemLog["level"]) => {
    switch (level) {
      case "ERROR":
        return "text-red-400";
      case "WARN":
        return "text-yellow-400";
      case "DEBUG":
        return "text-blue-400";
      case "SUCCESS":
        return "text-green-400";
      default:
        return "text-gray-400";
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

  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader className="border-b border-slate-800 bg-slate-900/50">
        <CardTitle className="flex items-center gap-2 text-slate-200">
          <Terminal className="h-5 w-5 text-green-400" />
          {t("liveLogs")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] w-full">
          {logs.length > 0 ? (
            <div className="p-4 space-y-1 font-mono text-xs">
              {logs.map((log) => (
                <div key={log.id} className="leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span
                      className={`shrink-0 font-bold ${getLevelColor(
                        log.level
                      )}`}
                    >
                      {getLevelSymbol(log.level)} {log.level}
                    </span>
                    <span className="text-slate-300 flex-1">{log.message}</span>
                  </div>
                  {log.details && (
                    <div className="ml-[140px] text-slate-500 mt-0.5">
                      └─ {log.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="rounded-full bg-slate-800 p-4 mb-4">
                <Terminal className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-lg font-medium text-slate-300 mb-2">
                {t("waitingForLogs")}
              </p>
              <p className="text-sm text-slate-500 max-w-sm font-mono">
                $ waiting for system events...
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
