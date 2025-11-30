"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { BotControlPanel } from "@/components/domain/bots/detail/BotControlPanel";
import { BotChart } from "@/components/domain/bots/detail/BotChart";
import { BotLogViewer } from "@/components/domain/bots/detail/BotLogViewer";
import { BotTradeHistory } from "@/components/domain/bots/detail/BotTradeHistory";
import { useState } from "react";

export default function BotDetailPage({
  params,
}: {
  params: { botId: string };
}) {
  const t = useTranslations("LiveTrading.Detail");

  // Mock State
  const [status, setStatus] = useState<"running" | "stopped" | "error">(
    "running"
  );
  const [logs, setLogs] = useState([
    {
      id: "1",
      timestamp: "12:00:01",
      level: "INFO" as const,
      message: "Bot started successfully.",
    },
    {
      id: "2",
      timestamp: "12:05:30",
      level: "INFO" as const,
      message: "Fetching market data for BTC/USDT...",
    },
    {
      id: "3",
      timestamp: "12:06:00",
      level: "WARN" as const,
      message: "High volatility detected.",
    },
  ]);
  const [trades, setTrades] = useState([
    {
      id: "t1",
      timestamp: "12:10:00",
      side: "BUY" as const,
      price: 42000,
      amount: 0.1,
    },
  ]);

  const handleStart = () => {
    setStatus("running");
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: "INFO",
        message: "Bot started.",
      },
    ]);
  };

  const handleStop = () => {
    setStatus("stopped");
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: "INFO",
        message: "Bot stopped.",
      },
    ]);
  };

  const handlePanic = () => {
    setStatus("stopped");
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: "WARN",
        message: "PANIC SELL TRIGGERED. Closing all positions.",
      },
    ]);
  };

  const handleDelete = () => {
    console.log("Delete bot");
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/bots"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Bot #{params.botId}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                Binance Futures • BTC/USDT • MACD Strategy
              </span>
            </div>
          </div>
        </div>
        <BotControlPanel
          status={status}
          onStart={handleStart}
          onStop={handleStop}
          onPanic={handlePanic}
          onDelete={handleDelete}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Chart Area */}
        <div className="lg:col-span-2">
          <BotChart />
        </div>

        {/* Status & Logs */}
        <div className="h-[450px]">
          <BotLogViewer logs={logs} />
        </div>
      </div>

      <BotTradeHistory trades={trades} />
    </div>
  );
}
