"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

interface Trade {
  id: string;
  timestamp: string;
  side: "BUY" | "SELL";
  price: number;
  amount: number;
  pnl?: number;
}

interface BotTradeHistoryProps {
  trades: Trade[];
}

export function BotTradeHistory({ trades }: BotTradeHistoryProps) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Recent Trades</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Side</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">PnL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-8 text-muted-foreground"
              >
                No trades executed yet.
              </TableCell>
            </TableRow>
          ) : (
            trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {trade.timestamp}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      trade.side === "BUY"
                        ? "border-green-500 text-green-500"
                        : "border-red-500 text-red-500"
                    }
                  >
                    {trade.side}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${trade.price.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {trade.amount}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {trade.pnl ? (
                    <span
                      className={
                        trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                      }
                    >
                      {trade.pnl >= 0 ? "+" : ""}
                      {trade.pnl.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
