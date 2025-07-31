// frontend/src/components/domain/backtester/TradeLogTable.tsx

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel, // 페이지네이션을 위한 임포트
  SortingState, // 정렬 상태를 위한 임포트
  getSortedRowModel, // 정렬을 위한 임포트
} from "@tanstack/react-table";
import { format } from "date-fns";

import { Card } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table"; // Shadcn/ui Table 컴포넌트 임포트
import { Button } from "@/components/ui/Button"; // 페이지네이션 버튼을 위한 임포트
import { ArrowUpDown, XCircle } from "lucide-react"; // 정렬 아이콘 및 오류 아이콘
import { cn } from "@/lib/utils";

// 백엔드 schemas.TradeLogEntry와 일치하는 타입 정의
export interface TradeLogEntry {
  trade_id: string;
  timestamp: string; // ISO 8601 string
  side: "buy" | "sell";
  price: number;
  quantity: number;
  fee: number;
  pnl: number; // Profit and Loss
  current_balance: number; // 거래 후 잔고
}

interface TradeLogTableProps {
  tradeLogs?: TradeLogEntry[] | null; // 백엔드로부터 받은 거래 내역 데이터
}

export function TradeLogTable({ tradeLogs }: TradeLogTableProps) {
  const t = useTranslations("TradeLogTable");
  const [sorting, setSorting] = React.useState<SortingState>([]); // 정렬 상태

  // 컬럼 정의
  const columns: ColumnDef<TradeLogEntry>[] = React.useMemo(
    () => [
      {
        accessorKey: "timestamp",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("header.timestamp")}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) =>
          format(new Date(row.original.timestamp), "yyyy-MM-dd HH:mm:ss"),
        enableSorting: true,
      },
      {
        accessorKey: "side",
        header: t("header.side"),
        cell: ({ row }) => (
          <span
            className={cn(
              "font-medium",
              row.original.side === "buy" ? "text-blue-500" : "text-red-500"
            )}
          >
            {row.original.side === "buy" ? t("side.buy") : t("side.sell")}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "price",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("header.price")}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.original.price.toFixed(2),
        enableSorting: true,
      },
      {
        accessorKey: "quantity",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("header.quantity")}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.original.quantity.toFixed(4),
        enableSorting: true,
      },
      {
        accessorKey: "fee",
        header: t("header.fee"),
        cell: ({ row }) => row.original.fee.toFixed(4),
        enableSorting: true,
      },
      {
        accessorKey: "pnl",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("header.pnl")}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              "font-medium",
              row.original.pnl >= 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {row.original.pnl.toFixed(2)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "current_balance",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("header.currentBalance")}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.original.current_balance.toFixed(2),
        enableSorting: true,
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: tradeLogs || [], // 데이터가 없으면 빈 배열 사용
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(), // 페이지네이션 모델 추가
    onSortingChange: setSorting, // 정렬 상태 변경 핸들러
    getSortedRowModel: getSortedRowModel(), // 정렬 모델 추가
    state: {
      sorting, // 정렬 상태 적용
    },
    initialState: {
      pagination: {
        pageSize: 10, // 한 페이지에 10개 항목 표시
      },
    },
  });

  if (!tradeLogs || tradeLogs.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground flex items-center justify-center h-48">
        <XCircle className="h-6 w-6 mr-3 text-destructive" />
        <p>{t("noTradeLogsAvailable")}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-2xl font-bold text-foreground">{t("title")}</h2>
      <div className="rounded-md border overflow-x-auto">
        {" "}
        {/* 가로 스크롤 추가 */}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
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
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 컨트롤 */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {t("pagination.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {t("pagination.next")}
        </Button>
      </div>
    </Card>
  );
}
