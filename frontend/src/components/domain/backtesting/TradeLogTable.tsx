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
import { useTranslations } from "next-intl";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { cn } from "@/lib/utils";

// --- 컬럼 정의 (TanStack Table의 핵심) ---
// 이 부분을 수정하여 표시할 컬럼을 커스터마이징할 수 있습니다.
const columns: ColumnDef<TradeLog>[] = [
  {
    accessorKey: "timestamp",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        거래 시각
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-left">
        {new Date(row.getValue("timestamp")).toLocaleString("ko-KR")}
      </div>
    ),
  },
  {
    accessorKey: "side",
    header: "종류",
    cell: ({ row }) => (
      <span
        className={cn(
          "font-medium",
          row.getValue("side") === "buy" ? "text-emerald-500" : "text-rose-500"
        )}
      >
        {row.getValue("side") === "buy" ? "매수" : "매도"}
      </span>
    ),
  },
  {
    accessorKey: "price",
    header: "거래 가격",
    cell: ({ row }) => (
      <span className="font-mono">
        ${row.getValue<number>("price").toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "quantity",
    header: "수량",
  },
  {
    accessorKey: "pnl",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        손익 (PNL)
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const pnl = row.getValue<number | null>("pnl");
      if (pnl === null) return <span className="text-muted-foreground">-</span>;
      return (
        <span
          className={cn(
            "font-mono font-medium",
            pnl > 0 ? "text-emerald-500" : pnl < 0 ? "text-rose-500" : ""
          )}
        >
          {pnl > 0 ? "+" : ""}
          {pnl.toFixed(2)}
        </span>
      );
    },
  },
  {
    accessorKey: "current_balance",
    header: "누적 자산",
    cell: ({ row }) => (
      <span className="font-mono">
        $
        {row.getValue<number>("current_balance").toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    ),
  },
];

// --- 메인 컴포넌트 ---
export const TradeLogTable = ({ tradeLogs }: { tradeLogs: TradeLog[] }) => {
  const t = useTranslations("BacktestDetailPage.TradeLogTable");
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data: tradeLogs,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
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
                  <TableRow key={row.id}>
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
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* --- 페이지네이션 컨트롤 --- */}
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
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
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
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
