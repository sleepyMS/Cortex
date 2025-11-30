"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Link } from "@/i18n/navigation";
import { MoreHorizontal, Play, Square, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useTranslations } from "next-intl";

// Mock Data
const BOTS = [
  {
    id: "bot_1",
    name: "BTC Trend Follower",
    strategy: "MACD Trend Follower",
    symbol: "BTC/USDT",
    status: "running",
    pnl: 123.45,
    pnlPercent: 2.5,
    uptime: "2d 4h",
  },
  {
    id: "bot_2",
    name: "ETH Mean Reversion",
    strategy: "RSI Mean Reversion",
    symbol: "ETH/USDT",
    status: "stopped",
    pnl: -45.2,
    pnlPercent: -1.2,
    uptime: "-",
  },
  {
    id: "bot_3",
    name: "SOL Breakout",
    strategy: "Bollinger Breakout",
    symbol: "SOL/USDT",
    status: "running",
    pnl: 89.1,
    pnlPercent: 5.4,
    uptime: "12h 30m",
  },
];

export function BotListTable() {
  const t = useTranslations("LiveTrading.Dashboard.table");

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("status")}</TableHead>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("strategy")}</TableHead>
            <TableHead>{t("symbol")}</TableHead>
            <TableHead className="text-right">{t("pnl")}</TableHead>
            <TableHead className="text-right">{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {BOTS.map((bot) => (
            <TableRow key={bot.id}>
              <TableCell>
                <Badge
                  variant={bot.status === "running" ? "default" : "secondary"}
                  className={
                    bot.status === "running"
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-gray-500 hover:bg-gray-600"
                  }
                >
                  {bot.status}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                <Link href={`/bots/${bot.id}`} className="hover:underline">
                  {bot.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  ID: {bot.id}
                </div>
              </TableCell>
              <TableCell>{bot.strategy}</TableCell>
              <TableCell>{bot.symbol}</TableCell>
              <TableCell className="text-right">
                <div
                  className={bot.pnl >= 0 ? "text-green-500" : "text-red-500"}
                >
                  ${Math.abs(bot.pnl).toFixed(2)}
                </div>
                <div
                  className={`text-xs ${
                    bot.pnl >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {bot.pnl >= 0 ? "+" : ""}
                  {bot.pnlPercent}%
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                    <DropdownMenuItem>
                      <Link href={`/bots/${bot.id}`} className="flex w-full">
                        {t("viewDetails")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {bot.status === "running" ? (
                      <DropdownMenuItem className="text-red-500">
                        <Square className="mr-2 h-4 w-4" />
                        {t("stopBot")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-green-500">
                        <Play className="mr-2 h-4 w-4" />
                        {t("startBot")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-500">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
