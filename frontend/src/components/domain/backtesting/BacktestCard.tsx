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
  Clock,
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
    mddPct: number | null;
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
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
      iconClass: "text-emerald-500",
    },
    running: {
      label: t("status.running"),
      Icon: Loader2,
      badgeClass:
        "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
      iconClass: "text-blue-500 animate-spin",
    },
    pending: {
      label: t("status.pending"),
      Icon: Archive,
      badgeClass:
        "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20",
      iconClass: "text-yellow-500",
    },
    failed: {
      label: t("status.failed"),
      Icon: AlertCircle,
      badgeClass:
        "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
      iconClass: "text-rose-500",
    },
    canceled: {
      label: t("status.canceled"),
      Icon: XCircle,
      badgeClass:
        "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20",
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
    <TooltipProvider delayDuration={100}>
      <Card
        className={cn(
          "group flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/50 hover:bg-card hover:border-primary/20",
          (status === "failed" || status === "canceled") &&
            "opacity-70 hover:opacity-100"
        )}
      >
        <Link
          href={`/backtester/${id}`}
          className="flex flex-col flex-grow p-5"
        >
          <div className="flex justify-between items-start gap-3 mb-4">
            <div className="space-y-1.5 flex-grow min-w-0">
              <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                {strategy.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium">{t("period")}:</span>
                <span>{dateRangeString}</span>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 transition-colors",
                currentStatus.badgeClass
              )}
            >
              <currentStatus.Icon
                className={cn("mr-1 h-3 w-3", currentStatus.iconClass)}
              />
              {currentStatus.label}
            </Badge>
          </div>

          <div className="flex-grow space-y-5">
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="space-y-1 text-center">
                <Tooltip>
                  <TooltipTrigger className="cursor-help w-full">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                      {t("totalReturn")}
                      <HelpCircle className="h-3 w-3 opacity-50" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{t("totalReturnTooltip")}</TooltipContent>
                </Tooltip>
                <p
                  className={cn(
                    "text-xl font-bold tracking-tight",
                    result && result.totalReturnPct !== null
                      ? result.totalReturnPct >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                      : "text-muted-foreground"
                  )}
                >
                  {result?.totalReturnPct?.toFixed(2) ?? "-"}%
                </p>
              </div>
              <div className="space-y-1 text-center border-l border-border/50">
                <Tooltip>
                  <TooltipTrigger className="cursor-help w-full">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                      {t("mddPct")}
                      <HelpCircle className="h-3 w-3 opacity-50" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{t("mddPctTooltip")}</TooltipContent>
                </Tooltip>
                <p className="text-xl font-bold tracking-tight text-foreground">
                  {result?.mddPct?.toFixed(2) ?? "-"}%
                </p>
              </div>
            </div>

            {/* --- 'running' 상태일 때 프로그레스 바 표시 --- */}
            {status === "running" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("simulating")}</span>
                  <span>{backtest.progress ?? 0}%</span>
                </div>
                <Progress value={backtest.progress ?? 30} className="h-1.5" />
              </div>
            )}
          </div>
        </Link>

        <div className="flex justify-between items-center px-5 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {format(new Date(backtest.createdAt), "yyyy-MM-dd HH:mm")}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2 hover:bg-background"
              >
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
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    </TooltipProvider>
  );
};
