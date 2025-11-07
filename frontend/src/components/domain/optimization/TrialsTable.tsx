// file: frontend/src/components/domain/optimization/TrialsTable.tsx

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
import Link from "next/link";
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
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

interface TrialsTableProps {
  trials: TrialData[];
  hoveredTrialId?: number | null;
  onHoverTrial?: (id: number | null) => void;
}

export const TrialsTable = ({
  trials,
  hoveredTrialId,
  onHoverTrial,
}: TrialsTableProps) => {
  const t = useTranslations("OptimizationDetailPage.TrialsTable");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "score", desc: true }, // 기본값: 점수 내림차순 정렬
  ]);

  const columns: ColumnDef<TrialData>[] = React.useMemo(
    () => [
      {
        accessorKey: "trialId",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-xs"
          >
            Trial ID
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-mono text-xs pl-4">
            #{row.getValue("trialId")}
          </div>
        ),
      },
      {
        accessorKey: "state",
        header: t("headers.status"),
        cell: ({ row }) => {
          const state = row.getValue("state") as string;
          let badgeConfig = {
            label: state,
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
        id: "score",
        accessorFn: (row) => row.metrics.backtestScore,
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="text-xs"
            >
              {t("headers.score")}
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const score = row.original.metrics.backtestScore;
          let colorClass = "text-muted-foreground";
          if (score !== null && score !== undefined) {
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
        id: "totalReturn",
        accessorFn: (row) => row.metrics.totalReturnPct,
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="text-xs"
            >
              {t("headers.totalReturn")}
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.metrics.totalReturnPct;
          return (
            <div
              className={cn(
                "text-right font-mono pr-4",
                val && val > 0
                  ? "text-emerald-500"
                  : val && val < 0
                  ? "text-rose-500"
                  : ""
              )}
            >
              {val?.toFixed(2) ?? "-"}%
            </div>
          );
        },
      },
      {
        id: "mdd",
        accessorFn: (row) => row.metrics.mddPct,
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="text-xs"
            >
              MDD
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono text-rose-500 pr-4">
            {row.original.metrics.mddPct?.toFixed(2) ?? "-"}%
          </div>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const trial = row.original;
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
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/backtester/${trial.trialId}`}
                      target="_blank"
                      className="flex items-center cursor-pointer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t("actions.viewDetails")}
                    </Link>
                  </DropdownMenuItem>
                  {/* 필요한 경우 추가 액션 (e.g. 파라미터 복사) */}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: trials,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 20, // 기본 페이지 사이즈
      },
    },
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col min-h-0">
        <div className="rounded-md border flex-grow overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
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
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      "cursor-pointer transition-colors",
                      hoveredTrialId === row.original.trialId && "bg-muted/50",
                      row.original.state !== "COMPLETE" &&
                        "opacity-60 bg-muted/20"
                    )}
                    onMouseEnter={() => onHoverTrial?.(row.original.trialId)}
                    onMouseLeave={() => onHoverTrial?.(null)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2">
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
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 페이지네이션 컨트롤 (TradeLogTable과 동일한 스타일) */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {t("pagination.total", {
              count: table.getFilteredRowModel().rows.length,
            })}
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">
                {t("pagination.rowsPerPage")}
              </p>
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
                total: table.getPageCount(),
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
      </CardContent>
    </Card>
  );
};
