"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useFormatter, useTranslations } from "next-intl";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { BotTradeLog } from "@/lib/api/bots";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface BotTradeHistoryProps {
  trades: BotTradeLog[];
}

export function BotTradeHistory({ trades }: BotTradeHistoryProps) {
  const t = useTranslations("LiveTrading.Detail");
  const format = useFormatter();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // 시스템 이벤트 필터링: 실제 거래만 표시
  const actualTrades = React.useMemo(() => {
    const systemEvents = [
      "BOT_DEPLOYED",
      "BOT_PAUSED",
      "BOT_RESUMED",
      "BOT_STOPPED",
    ];
    return trades.filter((trade) => !systemEvents.includes(trade.side));
  }, [trades]);

  const columns: ColumnDef<BotTradeLog>[] = React.useMemo(
    () => [
      {
        accessorKey: "timestamp",
        header: ({ column }) => (
          <div className="text-left">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              {t("table.time")}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-left font-mono text-sm">
            {format.dateTime(new Date(row.getValue("timestamp")), "short")}
          </div>
        ),
      },
      {
        accessorKey: "side",
        header: () => <div className="text-center">{t("table.side")}</div>,
        cell: ({ row }) => {
          const side = row.getValue<string>("side");
          const tradeTypeConfig = {
            LONG_ENTRY: {
              label: t("types.longEntry" as any),
              Icon: TrendingUp,
              className:
                "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
            },
            LONG_EXIT: {
              label: t("types.longExit" as any),
              Icon: XCircle,
              className:
                "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
            },
            SHORT_ENTRY: {
              label: t("types.shortEntry" as any),
              Icon: TrendingDown,
              className:
                "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
            },
            SHORT_EXIT: {
              label: t("types.shortExit" as any),
              Icon: XCircle,
              className:
                "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
            },
            // Fallback for simple BUY/SELL
            BUY: {
              label: t("types.buy" as any),
              Icon: TrendingUp,
              className:
                "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
            },
            SELL: {
              label: t("types.sell" as any),
              Icon: TrendingDown,
              className:
                "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
            },
          };
          const config = tradeTypeConfig[side as keyof typeof tradeTypeConfig];
          if (!config) return <span>{side}</span>;
          return (
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className={cn(
                  "py-1 px-2 text-xs font-normal",
                  config.className
                )}
              >
                <config.Icon className="mr-1.5 h-3.5 w-3.5" />
                {config.label}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "price",
        header: () => <div className="text-right">{t("table.price")}</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono">
            ${row.getValue<number>("price").toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: () => <div className="text-right">{t("table.amount")}</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono">
            {row.getValue<number>("quantity").toFixed(4)}
          </div>
        ),
      },
      {
        accessorKey: "pnl",
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              <div className="text-right w-full">{t("table.pnl")}</div>
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const pnl = row.getValue<number | null>("pnl");
          if (pnl === null || pnl === undefined)
            return <div className="text-center text-muted-foreground">-</div>;
          return (
            <div
              className={cn(
                "text-center font-mono font-medium",
                pnl > 0 ? "text-emerald-500" : pnl < 0 ? "text-rose-500" : ""
              )}
            >
              {pnl > 0 ? "+" : ""}${pnl.toFixed(2)}
            </div>
          );
        },
      },
      {
        accessorKey: "reason",
        header: () => (
          <div className="text-right">{t("table.reason" as any)}</div>
        ),
        cell: ({ row }) => {
          const reason = row.getValue<string>("reason");
          if (!reason)
            return <div className="text-right text-muted-foreground">-</div>;

          const colorClass = reason.toLowerCase().includes("profit")
            ? "bg-emerald-500/80 text-white"
            : reason.toLowerCase().includes("stop") ||
              reason.toLowerCase().includes("loss")
            ? "bg-rose-500/80 text-white"
            : "";

          return (
            <div className="text-right">
              <Badge
                variant={colorClass ? "default" : "secondary"}
                className={cn("text-xs", colorClass)}
              >
                {reason}
              </Badge>
            </div>
          );
        },
      },
    ],
    [t, format]
  );

  const table = useReactTable({
    data: actualTrades,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t("recentTrades")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actualTrades.length > 0 ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        {t("noTrades")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between space-x-2 py-4">
              <span className="text-sm text-muted-foreground">
                {t("totalTradesCount", {
                  count: table.getFilteredRowModel().rows.length,
                })}
              </span>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{t("rowsPerPage")}</p>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue
                        placeholder={table.getState().pagination.pageSize}
                      />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  {t("pageOf", {
                    current: table.getState().pagination.pageIndex + 1,
                    total: table.getPageCount(),
                  })}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">{t("previousPage")}</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">{t("nextPage")}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">
              {t("noTrades")}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("tradeHistoryHint")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
