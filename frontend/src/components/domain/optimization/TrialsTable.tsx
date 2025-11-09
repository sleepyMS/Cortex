// file: frontend/src/components/domain/optimization/TrialsTable.tsx

"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  PaginationState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Scissors,
} from "lucide-react";

import apiClient from "@/lib/apiClient";
import { TrialData } from "@/types/optimization";
import { cn } from "@/lib/utils";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Skeleton } from "@/components/ui/Skeleton";

interface TrialsTableProps {
  jobId: string;
  hoveredTrialId?: number | null;
  onHoverTrial?: (id: number | null) => void;
  minScore?: number;
}

export const TrialsTable = ({
  jobId,
  hoveredTrialId,
  onHoverTrial,
  minScore = 0,
}: TrialsTableProps) => {
  const t = useTranslations("OptimizationDetailPage.TrialsTable");

  // --- 테이블 상태 관리 ---
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "backtestScore", desc: true }, // 기본 정렬: 점수 내림차순
  ]);

  // --- 서버 데이터 페칭 ---
  const dataQuery = useQuery({
    queryKey: ["trials", jobId, pagination, sorting, minScore],
    queryFn: async () => {
      const { pageIndex, pageSize } = pagination;

      // [중요] 프론트엔드(camelCase) -> 백엔드(snake_case) 정렬 필드 매핑
      let sortField = sorting[0]?.id;
      if (sortField === "trialId") sortField = "trial_id";
      if (sortField === "backtestScore") sortField = "score";
      if (sortField === "totalReturnPct") sortField = "total_return";

      const sortDesc = sorting[0]?.desc ?? false;

      const params = new URLSearchParams({
        page: (pageIndex + 1).toString(),
        limit: pageSize.toString(),
        sort_by: sortField || "trial_id",
        sort_desc: sortDesc.toString(),
      });

      if (minScore > 0) {
        params.append("min_score", minScore.toString());
      }

      const response = await apiClient.get(
        `/optimizations/${jobId}/trials?${params.toString()}`
      );
      return response.data;
    },
    placeholderData: (prev) => prev,
  });

  const defaultData = React.useMemo(() => [], []);

  // --- 컬럼 정의 ---
  const columns: ColumnDef<TrialData>[] = React.useMemo(
    () => [
      {
        accessorKey: "trialId", // [수정] camelCase 사용
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-xs font-medium"
          >
            Trial ID
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-mono text-xs pl-4">
            #{row.original.trialId} {/* [수정] camelCase 사용 */}
          </div>
        ),
      },
      {
        accessorKey: "state",
        header: t("headers.status"),
        cell: ({ row }) => {
          const state = row.original.state;
          let badgeConfig = {
            label: state as string,
            icon: XCircle,
            className: "bg-gray-500/20 text-gray-500 border-gray-500/30",
          };

          switch (state) {
            case "COMPLETE":
              badgeConfig = {
                label: t("status.complete"),
                icon: CheckCircle,
                className:
                  "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
              };
              break;
            case "PRUNED":
              badgeConfig = {
                label: t("status.pruned"),
                icon: Scissors,
                className:
                  "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
              };
              break;
            case "FAIL":
              badgeConfig = {
                label: t("status.failed"),
                icon: XCircle,
                className:
                  "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30",
              };
              break;
          }

          return (
            <Badge
              variant="outline"
              className={cn(
                "flex w-fit items-center gap-1 pr-2.5",
                badgeConfig.className
              )}
            >
              <badgeConfig.icon className="h-3 w-3" />
              <span>{badgeConfig.label}</span>
            </Badge>
          );
        },
      },
      {
        // [수정] id와 accessorFn 모두 camelCase로 변경
        id: "backtestScore",
        accessorFn: (row) => row.metrics?.backtestScore,
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="text-xs font-medium"
            >
              {t("headers.score")}
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          // [수정] camelCase로 접근
          const score = row.original.metrics?.backtestScore;
          let colorClass = "text-muted-foreground";
          if (score != null) {
            if (score >= 80) colorClass = "text-emerald-500 font-bold";
            else if (score >= 60) colorClass = "text-amber-500 font-semibold";
            else if (score < 30) colorClass = "text-rose-500";
          }

          return (
            <div className={cn("text-right font-mono pr-4", colorClass)}>
              {score?.toFixed(0) ?? "-"}
            </div>
          );
        },
      },
      {
        // [수정] camelCase로 변경
        id: "totalReturnPct",
        accessorFn: (row) => row.metrics?.totalReturnPct,
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="text-xs font-medium"
            >
              {t("headers.totalReturn")}
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          // [수정] camelCase로 접근
          const val = row.original.metrics?.totalReturnPct;
          return (
            <div
              className={cn(
                "text-right font-mono pr-4",
                val && val > 0
                  ? "text-emerald-500"
                  : val && val < 0
                  ? "text-rose-500"
                  : "text-muted-foreground"
              )}
            >
              {val != null ? `${val.toFixed(2)}%` : "-"}
            </div>
          );
        },
      },
      {
        // [수정] camelCase로 변경
        id: "mddPct",
        accessorFn: (row) => row.metrics?.mddPct,
        header: ({ column }) => (
          <div className="text-right text-xs font-medium px-4 py-2">MDD</div>
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono text-rose-500 pr-4">
            {/* [수정] camelCase로 접근 */}
            {row.original.metrics?.mddPct != null
              ? `${row.original.metrics.mddPct.toFixed(2)}%`
              : "-"}
          </div>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const trial = row.original;
          const canViewDetails = trial.metrics != null;

          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t("actions.label")}</DropdownMenuLabel>
                  <DropdownMenuItem
                    asChild
                    disabled={!canViewDetails}
                    className={cn(
                      !canViewDetails && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {canViewDetails ? (
                      // [수정] trialId (camelCase) 사용
                      <Link
                        href={`/backtester/trial_${jobId}_${trial.trialId}`}
                        target="_blank"
                        className="flex items-center cursor-pointer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t("actions.viewDetails")}
                      </Link>
                    ) : (
                      <span className="flex items-center">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t("actions.viewDetails")}
                      </span>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, jobId]
  );

  const table = useReactTable({
    data: dataQuery.data?.items ?? defaultData,
    columns,
    pageCount: dataQuery.data?.pages ? Math.max(1, dataQuery.data.pages) : -1,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10">
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
            {dataQuery.isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    // [수정] trialId (camelCase) 사용
                    hoveredTrialId === row.original.trialId &&
                      "bg-primary/10 hover:bg-primary/15",
                    row.original.state !== "COMPLETE" &&
                      "opacity-60 bg-muted/20"
                  )}
                  // [수정] trialId (camelCase) 사용
                  onMouseEnter={() => onHoverTrial?.(row.original.trialId)}
                  onMouseLeave={() => onHoverTrial?.(null)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
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
                  className="h-32 text-center text-muted-foreground"
                >
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-4 py-4 border-t bg-card">
        <div className="flex-1 text-sm text-muted-foreground">
          {t("pagination.total", {
            count: dataQuery.data?.total ?? 0,
          })}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">{t("pagination.rowsPerPage")}</p>
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
            {t("pagination.pageInfo", {
              current: table.getState().pagination.pageIndex + 1,
              total: Math.max(1, table.getPageCount()),
            })}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
