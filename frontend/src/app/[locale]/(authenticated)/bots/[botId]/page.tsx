"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Play, Square, AlertTriangle } from "lucide-react";

export default function BotDetailPage({
  params,
}: {
  params: { botId: string };
}) {
  // const t = useTranslations("BotDetail");

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
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
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                Stopped
              </span>
              <span className="text-sm text-muted-foreground">
                Binance Futures • BTC/USDT
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Play className="h-4 w-4" />
            Start
          </Button>
          <Button variant="destructive" size="sm" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Panic Sell
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Chart Area */}
        <div className="md:col-span-2 rounded-xl border bg-card text-card-foreground shadow-sm min-h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">TradingView Chart Placeholder</p>
        </div>

        {/* Status & Logs */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold mb-4">Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total PnL</span>
                <span className="font-medium text-green-500">
                  +$0.00 (0.00%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Win Rate</span>
                <span className="font-medium">0%</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 h-[300px] flex flex-col">
            <h3 className="font-semibold mb-4">Live Logs</h3>
            <div className="flex-1 bg-muted/50 rounded-md p-4 text-xs font-mono overflow-y-auto">
              <p className="text-muted-foreground">Waiting for logs...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
