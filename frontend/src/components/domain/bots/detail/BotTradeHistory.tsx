"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { useTranslations } from "next-intl";
import { BotTradeLog } from "@/lib/api/bots";

interface BotTradeHistoryProps {
  trades: BotTradeLog[];
}

export function BotTradeHistory({ trades }: BotTradeHistoryProps) {
  const t = useTranslations("LiveTrading.Detail");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentTrades")}</CardTitle>
      </CardHeader>
      <CardContent>
        {trades.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.time")}</TableHead>
                <TableHead>{t("table.side")}</TableHead>
                <TableHead className="text-right">{t("table.price")}</TableHead>
                <TableHead className="text-right">
                  {t("table.amount")}
                </TableHead>
                <TableHead className="text-right">{t("table.pnl")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="text-sm">
                    {new Date(trade.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        trade.side.toLowerCase().includes("buy") ||
                        trade.side.toLowerCase().includes("long")
                          ? "default"
                          : "secondary"
                      }
                      className={
                        trade.side.toLowerCase().includes("buy") ||
                        trade.side.toLowerCase().includes("long")
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-red-500 hover:bg-red-600"
                      }
                    >
                      {trade.side}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${trade.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {trade.quantity.toFixed(4)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      trade.pnl && trade.pnl >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {trade.pnl !== null && trade.pnl !== undefined
                      ? `$${trade.pnl.toFixed(2)}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {t("noTrades")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
