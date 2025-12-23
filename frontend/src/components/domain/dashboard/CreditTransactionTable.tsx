"use client";

import * as React from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { format, formatDistanceToNow, Locale } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import apiClient from "@/lib/apiClient";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ListX,
  Eye,
  Clock,
  Loader2,
  FileText,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

// 통합된 히스토리 아이템 타입 정의
interface UnifiedCreditHistoryItem {
  date: string;
  description: string | null;
  amount: number;
  related_id: string;
  expires_at: string | null;
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

const TransactionDetailsDialogContent = ({
  transaction,
}: {
  transaction: UnifiedCreditHistoryItem;
}) => {
  const t = useTranslations("Dashboard.credits.transactionTable");
  const locale = useLocale();
  const dateLocale = locale === "ko" ? ko : enUS;
  const isGain = transaction.amount > 0;

  // '사용' 내역의 상세 정보를 불러오기 위한 쿼리
  const { data: usageDetails, isLoading } = useQuery({
    queryKey: ["transactionDetails", transaction.related_id],
    queryFn: async () =>
      (await apiClient.get(`/credits/transactions/${transaction.related_id}`))
        .data,
    enabled: !isGain, // '사용' 내역일 때만 API 호출
  });

  if (isGain) {
    return (
      <>
        <DialogTitle>{t("detailsModal.gainTitle")}</DialogTitle>
        <DialogDescription className="border-b">
          {t("detailsModal.gainDescription")}
        </DialogDescription>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span>{t("detailsModal.gainAmount")}</span>
            <span className="font-mono text-emerald-500">
              +{transaction.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t("detailsModal.transactionDate")}</span>
            <span>
              {format(new Date(transaction.date), "yyyy-MM-dd HH:mm")}
            </span>
          </div>
          {transaction.expires_at && (
            <div className="flex justify-between">
              <span>{t("detailsModal.expiresAt")}</span>
              <span>
                {format(new Date(transaction.expires_at), "yyyy-MM-dd HH:mm")} (
                {formatDistanceToNow(new Date(transaction.expires_at), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
                )
              </span>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <DialogTitle>{t("detailsModal.usageTitle")}</DialogTitle>
      <DialogDescription>
        {t("detailsModal.usageDescription")}
      </DialogDescription>
      <div className="mt-4 space-y-2">
        {isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        ) : (
          <>
            <div className="flex justify-between mb-4 border-b border-dashed">
              <span>{t("detailsModal.totalUsed")}</span>
              <span className="font-mono text-rose-500">
                {transaction.amount.toLocaleString()} CC
              </span>
            </div>
            <div className="border rounded-lg p-3 mt-2">
              <h4 className="mb-2 text-sm font-semibold">
                {t("detailsModal.breakdownTitle")}
              </h4>
              <ul className="space-y-2">
                {usageDetails?.details.map((detail: any, index: number) => (
                  <li key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {/* @ts-expect-error */}
                      {t(`creditTypes.${detail.sourceType}`, {
                        default: detail.sourceType,
                      })}
                    </span>
                    <span className="font-mono text-rose-500">
                      - {detail.amountDeducted.toLocaleString()} CC
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
};

// 통합 데이터 구조에 맞는 컬럼 재정의
const columns = (
  t: any,
  dateLocale: Locale
): ColumnDef<UnifiedCreditHistoryItem>[] => [
  {
    accessorKey: "date",
    header: t("columns.date"),
    cell: ({ row }) =>
      format(new Date(row.getValue("date")), "yyyy-MM-dd HH:mm:ss", {
        locale: dateLocale,
      }),
  },
  {
    accessorKey: "description",
    header: t("columns.description"),
    // [복원] 누락되었던 cell 렌더링 함수를 다시 추가합니다.
    cell: ({ row }) => {
      const type = row.getValue<string | null>("description");
      return type
        ? t(`transactionTypes.${type}`, { default: type })
        : t("transactionTypes.ETC");
    },
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">{t("columns.amount")}</div>,
    cell: ({ row }) => {
      const amount = row.original.amount;
      const expiresAt = row.original.expires_at;
      const isGain = amount > 0;
      return (
        <div
          className={cn(
            "flex items-center justify-end gap-2 font-mono",
            isGain ? "text-emerald-500" : "text-rose-500"
          )}
        >
          {isGain && expiresAt && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger>
                  <Clock className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {t("expiresAtTooltip", {
                      date: format(new Date(expiresAt), "yyyy-MM-dd"),
                    })}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span>
            {isGain ? "+" : ""}
            {amount.toLocaleString()} CC
          </span>
        </div>
      );
    },
  },
  {
    id: "details",
    cell: ({ row }) => (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="w-full">
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="p-6 lg:max-w-2xl">
          <TransactionDetailsDialogContent transaction={row.original} />
        </DialogContent>
      </Dialog>
    ),
  },
];

// 메인 컴포넌트
export const CreditTransactionTable = () => {
  const t = useTranslations("Dashboard.credits.transactionTable");
  const locale = useLocale();
  const dateLocale = locale === "ko" ? ko : enUS;
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
    columns: columns(t, dateLocale),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: queryResponse?.meta.totalPages ?? -1,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          {t("title")}
        </CardTitle>
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
                    {columns(t, dateLocale).map((col, j) => (
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
                    colSpan={columns(t, dateLocale).length}
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
