"use client";

import { ScrollArea } from "@/components/ui/ScrollArea";
import { useEffect, useRef } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
}

interface BotLogViewerProps {
  logs: LogEntry[];
}

export function BotLogViewer({ logs }: BotLogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "INFO":
        return "text-blue-400";
      case "WARN":
        return "text-yellow-400";
      case "ERROR":
        return "text-red-500";
      case "DEBUG":
        return "text-gray-500";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">Live Logs</h3>
      </div>
      <ScrollArea
        className="flex-1 p-4 font-mono text-xs bg-black/90 text-gray-300"
        ref={scrollRef}
      >
        {logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Waiting for logs...
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-gray-500 shrink-0">
                  [{log.timestamp}]
                </span>
                <span
                  className={`font-bold shrink-0 w-12 ${getLevelColor(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>
                <span className="break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
