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

// --- [성능 최적화] 서버 사이드 페이지네이션 + 정렬 지원 ---
interface ServerPagination {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
}

interface TradeLogTableProps {
  tradeLogs: TradeLog[];
  pagination?: ServerPagination; // 서버 사이드 페이지네이션 (optional)
}

export const TradeLogTable = ({
  tradeLogs,
  pagination,
}: TradeLogTableProps) => {
  const t = useTranslations("BacktestDetailPage.TradeLogTable");
  const format = useFormatter();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // 서버 사이드 페이지네이션 사용 여부
  const isServerPaginated = !!pagination;

  // 서버 사이드 정렬 핸들러
  const handleServerSort = (field: string) => {
    if (!pagination) return;
    const newOrder =
      pagination.sortBy === field && pagination.sortOrder === "desc"
        ? "asc"
        : "desc";
    pagination.onSortChange(field, newOrder);
  };

  const columns: ColumnDef<TradeLog>[] = React.useMemo(
    () => [
      {
        accessorKey: "timestamp",
        header: ({ column }) => (
          <div className="text-left">
            <Button
              variant="ghost"
              onClick={() => {
                if (isServerPaginated) {
                  handleServerSort("timestamp");
                } else {
                  column.toggleSorting(column.getIsSorted() === "asc");
                }
              }}
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
    [t, format, isServerPaginated, handleServerSort]
  );

  const table = useReactTable({
    data: tradeLogs,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    // 서버 사이드 페이지네이션 시 필수 설정
    ...(isServerPaginated && {
      manualPagination: true,
      pageCount: pagination.totalPages,
    }),
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
                total: isServerPaginated
                  ? pagination.total
                  : table.getFilteredRowModel().rows.length,
              })}
            </span>
            <div className="flex items-center space-x-6 lg:space-x-8">
              {/* 페이지당 행 수 선택 - 서버/클라이언트 모두 지원 */}
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">{t("rowsPerPage")}</p>
                <Select
                  value={`${
                    isServerPaginated
                      ? pagination.limit
                      : table.getState().pagination.pageSize
                  }`}
                  onValueChange={(value) => {
                    if (isServerPaginated) {
                      pagination.onLimitChange(Number(value));
                    } else {
                      table.setPageSize(Number(value));
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue
                      placeholder={
                        isServerPaginated
                          ? pagination.limit
                          : table.getState().pagination.pageSize
                      }
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
                  page: isServerPaginated
                    ? pagination.page
                    : table.getState().pagination.pageIndex + 1,
                  totalPages: isServerPaginated
                    ? pagination.totalPages
                    : table.getPageCount(),
                })}
              </div>
              <div className="flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="hidden h-8 w-8 p-0 lg:flex"
                      onClick={() =>
                        isServerPaginated
                          ? pagination.onPageChange(1)
                          : table.setPageIndex(0)
                      }
                      disabled={
                        isServerPaginated
                          ? pagination.page <= 1
                          : !table.getCanPreviousPage()
                      }
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
                      onClick={() =>
                        isServerPaginated
                          ? pagination.onPageChange(pagination.page - 1)
                          : table.previousPage()
                      }
                      disabled={
                        isServerPaginated
                          ? pagination.page <= 1
                          : !table.getCanPreviousPage()
                      }
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
                      onClick={() =>
                        isServerPaginated
                          ? pagination.onPageChange(pagination.page + 1)
                          : table.nextPage()
                      }
                      disabled={
                        isServerPaginated
                          ? pagination.page >= pagination.totalPages
                          : !table.getCanNextPage()
                      }
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
                        isServerPaginated
                          ? pagination.onPageChange(pagination.totalPages)
                          : table.setPageIndex(table.getPageCount() - 1)
                      }
                      disabled={
                        isServerPaginated
                          ? pagination.page >= pagination.totalPages
                          : !table.getCanNextPage()
                      }
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
