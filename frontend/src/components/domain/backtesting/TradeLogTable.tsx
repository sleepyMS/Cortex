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
import { formatDateToKST } from "@/lib/dateUtils";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { TradeLog } from "@/types/tradelog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

export const TradeLogTable = ({ tradeLogs }: { tradeLogs: TradeLog[] }) => {
  // [수정] t 함수 하나로 모든 번역을 관리합니다.
  const t = useTranslations("BacktestDetailPage.TradeLogTable");
  const format = useFormatter();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns: ColumnDef<TradeLog>[] = React.useMemo(
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
              {t("headers.timestamp")}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-left font-mono">
            {formatDateToKST(new Date(row.getValue("timestamp")), "datetime")}
          </div>
        ),
      },
      {
        accessorKey: "side",
        header: () => <div className="text-center">{t("headers.type")}</div>,
        cell: ({ row }) => {
          const side = row.getValue<string>("side");
          const tradeTypeConfig = {
            LONG_ENTRY: {
              label: t("types.longEntry"),
              Icon: TrendingUp,
              className:
                "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
            },
            LONG_EXIT: {
              label: t("types.longExit"),
              Icon: XCircle,
              className:
                "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
            },
            SHORT_ENTRY: {
              label: t("types.shortEntry"),
              Icon: TrendingDown,
              className:
                "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
            },
            SHORT_EXIT: {
              label: t("types.shortExit"),
              Icon: XCircle,
              className:
                "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
            },
          };
          const config = tradeTypeConfig[side as keyof typeof tradeTypeConfig];
          if (!config) return <span>{side}</span>;
          return (
            <Badge
              variant="outline"
              className={cn("py-1 px-2 text-xs font-normal", config.className)}
            >
              <config.Icon className="mr-1.5 h-3.5 w-3.5" />
              {config.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "price",
        header: () => <div className="text-right">{t("headers.price")}</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono">
            {format.number(row.getValue("price"), "currency")}
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: () => <div className="text-right">{t("headers.quantity")}</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono">
            {format.number(row.getValue("quantity"))}
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
              <div className="text-right w-full">{t("headers.pnl")}</div>
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const pnl = row.getValue<number | null>("pnl");
          if (pnl === null)
            return <div className="text-muted-foreground">-</div>;
          return (
            <div
              className={cn(
                "font-mono font-medium",
                pnl > 0 ? "text-emerald-500" : pnl < 0 ? "text-rose-500" : ""
              )}
            >
              {format.number(pnl, "pnl")}
            </div>
          );
        },
      },
      {
        accessorKey: "currentBalance",
        header: () => (
          <div className="text-right">{t("headers.currentBalance")}</div>
        ),
        cell: ({ row }) => {
          const balance = row.getValue<number | null>("currentBalance");
          if (balance === null)
            return <div className="text-right text-muted-foreground">-</div>;
          return (
            <div className="text-right font-mono">
              {format.number(balance, "currency")}
            </div>
          );
        },
      },
      {
        accessorKey: "reason",
        header: () => <div className="text-right">{t("headers.reason")}</div>,
        cell: ({ row }) => {
          const reason = row.getValue<string>("reason") as
            | "Signal"
            | "Take Profit"
            | "Stop Loss";
          const colorClass =
            reason === "Take Profit"
              ? "bg-emerald-500/80 text-white"
              : reason === "Stop Loss"
              ? "bg-rose-500/80 text-white"
              : "";
          return (
            <div className="text-right">
              <Badge
                variant={reason === "Signal" ? "secondary" : "default"}
                className={cn("text-xs", colorClass)}
              >
                {t(`reasons.${reason}`)}
              </Badge>
            </div>
          );
        },
      },
    ],
    [t, format]
  );

  const table = useReactTable({
    data: tradeLogs,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
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
                      <TableCell key={cell.id} className="text-center">
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
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TooltipProvider delayDuration={100}>
          <div className="flex items-center justify-between space-x-2 p-2">
            <span className="text-sm text-muted-foreground">
              {t("totalTrades", {
                total: table.getFilteredRowModel().rows.length,
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
                    {[10, 20, 50, 100].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                {t("pageInfo", {
                  page: table.getState().pagination.pageIndex + 1,
                  totalPages: table.getPageCount(),
                })}
              </div>
              <div className="flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="hidden h-8 w-8 p-0 lg:flex"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">
                        {t("pagination.firstPage")}
                      </span>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("pagination.firstPage")}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">
                        {t("pagination.previousPage")}
                      </span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("pagination.previousPage")}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <span className="sr-only">
                        {t("pagination.nextPage")}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("pagination.nextPage")}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="hidden h-8 w-8 p-0 lg:flex"
                      onClick={() =>
                        table.setPageIndex(table.getPageCount() - 1)
                      }
                      disabled={!table.getCanNextPage()}
                    >
                      <span className="sr-only">
                        {t("pagination.lastPage")}
                      </span>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("pagination.lastPage")}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
