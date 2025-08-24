// file: src/components/domain/backtesting/BacktestCard.tsx

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format, isValid } from "date-fns";
import {
  MoreVertical,
  Trash2,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Archive,
  CalendarDays,
  HelpCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Strategy } from "@/types/strategy";

// --- Shadcn/ui 컴포넌트 임포트 ---
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { Progress } from "@/components/ui/Progress";

// --- 타입 정의 ---
export interface Backtest {
  id: string;
  status: "completed" | "running" | "pending" | "failed" | "canceled";
  parameters: {
    startDate: string;
    endDate: string;
    initialCapital: number;
  };
  result: {
    totalReturnPct: number | null;
    winRatePct: number | null;
  } | null;
  strategy: Strategy;
  progress?: number;
  createdAt: string;
}

interface BacktestCardProps {
  backtest: Backtest;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  isCanceling: boolean;
  isDeleting: boolean;
}

export const BacktestCard = ({
  backtest,
  onCancel,
  onDelete,
  isCanceling,
  isDeleting,
}: BacktestCardProps) => {
  const t = useTranslations("BacktestCard");

  const statusConfig = {
    completed: {
      label: t("status.completed"),
      Icon: CheckCircle2,
      badgeClass:
        "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      iconClass: "text-emerald-500",
    },
    running: {
      label: t("status.running"),
      Icon: Loader2,
      badgeClass:
        "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
      iconClass: "text-blue-500 animate-spin",
    },
    pending: {
      label: t("status.pending"),
      Icon: Archive,
      badgeClass:
        "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
      iconClass: "text-yellow-500",
    },
    failed: {
      label: t("status.failed"),
      Icon: AlertCircle,
      badgeClass:
        "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30",
      iconClass: "text-rose-500",
    },
    canceled: {
      label: t("status.canceled"),
      Icon: XCircle,
      badgeClass:
        "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30",
      iconClass: "text-gray-500",
    },
  };

  const currentStatus = statusConfig[backtest.status] || statusConfig.pending;
  const { result, parameters, strategy, id, status } = backtest;

  const startDate = parameters?.startDate
    ? new Date(parameters.startDate)
    : null;
  const endDate = parameters?.endDate ? new Date(parameters.endDate) : null;
  const dateRangeString =
    startDate && isValid(startDate) && endDate && isValid(endDate)
      ? `${format(startDate, "yy.MM.dd")} - ${format(endDate, "yy.MM.dd")}`
      : t("noDateInfo");

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        className={cn(
          "flex flex-col h-full transition-all hover:shadow-md",
          (status === "failed" || status === "canceled") &&
            "opacity-70 bg-muted/50"
        )}
      >
        <Link href={`/backtester/${id}`} className="flex flex-col flex-grow">
          <CardHeader>
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-base font-semibold line-clamp-2">
                {strategy.name}
              </CardTitle>
              <Badge className={cn("shrink-0", currentStatus.badgeClass)}>
                {currentStatus.label}
              </Badge>
            </div>
            <CardDescription>
              {t("runAt", {
                date: format(new Date(backtest.createdAt), "yyyy-MM-dd HH:mm"),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <div className="flex justify-around text-center">
              <div className="w-1/2">
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      {t("totalReturn")}
                      <HelpCircle className="h-3 w-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{t("totalReturnTooltip")}</TooltipContent>
                </Tooltip>
                <p
                  className={cn(
                    "text-lg font-bold",
                    result && result.totalReturnPct !== null
                      ? result.totalReturnPct >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                      : "text-muted-foreground"
                  )}
                >
                  {result?.totalReturnPct?.toFixed(2) ?? "N/A"}%
                </p>
              </div>
              <div className="w-1/2">
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      {t("winRate")}
                      <HelpCircle className="h-3 w-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{t("winRateTooltip")}</TooltipContent>
                </Tooltip>
                <p className="text-lg font-bold text-foreground">
                  {result?.winRatePct?.toFixed(1) ?? "N/A"}%
                </p>
              </div>
            </div>

            {/* --- 'running' 상태일 때 프로그레스 바 표시 --- */}
            {status === "running" && (
              <div className="pt-2">
                <Progress value={backtest.progress ?? 45} className="h-2" />
                <p className="text-xs text-center text-blue-500 mt-1.5">
                  {t("simulating")}
                </p>
              </div>
            )}
          </CardContent>
        </Link>
        <CardFooter className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{dateRangeString}</span>
          </div>
          <div className="flex items-center gap-2">
            <currentStatus.Icon
              className={cn("h-4 w-4", currentStatus.iconClass)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={isCanceling || status !== "running"}
                  onClick={() => onCancel(id)}
                  className="text-yellow-600 dark:text-yellow-500"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("actions.cancel")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isDeleting}
                  onClick={() => onDelete(id)}
                  className="text-rose-600 dark:text-rose-500"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
};
