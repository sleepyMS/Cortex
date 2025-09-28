"use client";

import * as React from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import apiClient from "@/lib/apiClient";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ListX,
} from "lucide-react";

// UI 컴포넌트
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
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
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

// [수정] 통합된 히스토리 아이템 타입 정의
interface UnifiedCreditHistoryItem {
  date: string;
  description: string | null;
  amount: number;
  related_id: string;
}

interface PaginatedCreditHistory {
  items: UnifiedCreditHistoryItem[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

// 통합 데이터 구조에 맞는 컬럼 재정의
const columns = (t: any): ColumnDef<UnifiedCreditHistoryItem>[] => [
  {
    accessorKey: "date",
    header: t("columns.date"),
    cell: ({ row }) =>
      format(new Date(row.getValue("date")), "yyyy-MM-dd HH:mm:ss", {
        locale: ko,
      }),
  },
  {
    accessorKey: "description",
    header: t("columns.description"),
    cell: ({ row }) => {
      const type = row.getValue<string | null>("description");
      // 언어팩을 사용하여 백엔드에서 받은 타입 문자열을 사용자 친화적인 텍스트로 변환
      return type
        ? t(`transactionTypes.${type}`, { default: type })
        : t("transactionTypes.ETC");
    },
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">{t("columns.amount")}</div>,
    cell: ({ row }) => {
      const amount = row.getValue<number>("amount");
      const isGain = amount > 0;
      return (
        <div
          className={cn(
            "text-right font-mono",
            isGain ? "text-emerald-500" : "text-rose-500"
          )}
        >
          {isGain ? "+" : ""}
          {amount.toLocaleString()}
        </div>
      );
    },
  },
];

// 메인 컴포넌트
export const CreditTransactionTable = () => {
  const t = useTranslations("Dashboard.credits.transactionTable");
  // [수정] sorting 상태 관리 제거
  // const [sorting, setSorting] = React.useState<SortingState>([]);
  const [{ pageIndex, pageSize }, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const pagination = React.useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize]
  );

  const { data: queryResponse, isLoading } = useQuery<PaginatedCreditHistory>({
    queryKey: ["creditHistory", pagination],
    queryFn: async () => {
      const { data } = await apiClient.get("/users/me/credit-history", {
        params: {
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const table = useReactTable({
    data: queryResponse?.items ?? [],
    columns: columns(t),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: queryResponse?.meta.totalPages ?? -1,
    state: { pagination },
    onPaginationChange: setPagination,
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
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {columns(t).map((col, j) => (
                      <TableCell key={`skeleton-cell-${j}`}>
                        <Skeleton className="h-6" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.original.related_id}>
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
                    colSpan={columns(t).length}
                    className="h-48 text-center"
                  >
                    <ListX className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                    <p className="font-semibold">{t("noResults.title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("noResults.description")}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between space-x-2 p-2">
          <span className="text-sm text-muted-foreground">
            {t("pagination.total", {
              total: queryResponse?.meta.totalItems ?? 0,
            })}
          </span>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">
                {t("pagination.rowsPerPage")}
              </p>
              <Select
                value={`${pageSize}`}
                onValueChange={(value) =>
                  setPagination({ pageIndex: 0, pageSize: Number(value) })
                }
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 50].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              {t("pagination.pageInfo", {
                page: pageIndex + 1,
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
