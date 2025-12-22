// file: src/components/domain/backtesting/BacktestCard.tsx

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
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
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Strategy } from "@/types/strategy";

// --- Shadcn/ui 컴포넌트 임포트 ---
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
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
  compact?: boolean; // For split view sidebar
}

export const BacktestCard = ({
  backtest,
  onCancel,
  onDelete,
  isCanceling,
  isDeleting,
  compact = false,
}: BacktestCardProps) => {
  const t = useTranslations("BacktestCard");
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handleDeleteClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    // Capture current URL state BEFORE deletion
    const currentParams = new URLSearchParams(window.location.search);
    const currentViewId = currentParams.get("view");

    // Delete and redirect if viewing this backtest
    if (currentViewId === backtest.id) {
      onDelete(backtest.id);
      // Redirect to close split view after deletion
      if (typeof window !== "undefined") {
        window.location.href = "/backtester";
      }
    } else {
      onDelete(backtest.id);
    }

    setShowDeleteConfirm(false);
  };

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

  // Compact mode for split view sidebar
  if (compact) {
    return (
      <>
        <div className="relative group">
          <Link href={`/backtester/${id}`}>
            <Card className="w-full p-3 transition-all duration-200 ease-in-out border border-border/60 hover:border-primary/30 hover:shadow-sm bg-card/30 hover:bg-card">
              <div className="space-y-2">
                {/* Top row: Strategy name + Status badge (with space for delete button) */}
                <div className="flex items-center gap-1.5 pr-6">
                  <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {strategy.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[9px] px-1 py-0 h-4",
                      currentStatus.badgeClass
                    )}
                  >
                    <currentStatus.Icon
                      className={cn(
                        "mr-0.5 h-2.5 w-2.5",
                        currentStatus.iconClass
                      )}
                    />
                    {currentStatus.label}
                  </Badge>
                </div>
                {/* Bottom row: Return percentage and date */}
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      "font-semibold",
                      result && result.totalReturnPct !== null
                        ? result.totalReturnPct >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {result?.totalReturnPct?.toFixed(2) ?? "-"}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(backtest.createdAt), "MM.dd HH:mm")}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
          {/* Delete button - appears on hover */}
          <button
            onClick={handleDeleteClick}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-destructive z-10"
            aria-label={t("actions.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDescription", { strategyName: strategy.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("deleteButton")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Full grid view
  return (
    <TooltipProvider delayDuration={100}>
      <Card
        className={cn(
          "group flex flex-col h-full transition-all duration-300 border-border/50 bg-card/50",
          // Hover effects
          "hover:shadow-lg hover:-translate-y-1 hover:bg-card hover:border-primary/30",
          // Status-based styling
          status === "completed" &&
            "hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
          status === "running" &&
            "shadow-[0_0_15px_rgba(59,130,246,0.2)] border-blue-500/30",
          (status === "failed" || status === "canceled") &&
            "opacity-60 hover:opacity-100"
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
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
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
            {/* Refactored Stats Grid matching BotListTable style */}
            <div className="grid grid-cols-2 gap-3">
              {/* Total Return */}
              <div
                className={cn(
                  "p-3 rounded-lg border border-border/10 flex flex-col items-center text-center",
                  result && result.totalReturnPct !== null
                    ? result.totalReturnPct >= 0
                      ? "bg-emerald-500/10"
                      : "bg-rose-500/10"
                    : "bg-muted/30"
                )}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  {result && result.totalReturnPct !== null ? (
                    result.totalReturnPct >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                    )
                  ) : (
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t("totalReturn")}
                        </span>
                        <HelpCircle className="h-3 w-3 opacity-50" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t("totalReturnTooltip")}</TooltipContent>
                  </Tooltip>
                </div>
                <p
                  className={cn(
                    "text-lg font-bold tracking-tight",
                    result && result.totalReturnPct !== null
                      ? result.totalReturnPct >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                      : "text-muted-foreground"
                  )}
                >
                  {result && result.totalReturnPct !== null
                    ? `${
                        result.totalReturnPct >= 0 ? "+" : ""
                      }${result.totalReturnPct.toFixed(2)}%`
                    : "-"}
                </p>
              </div>

              {/* MDD */}
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-200/20 dark:border-blue-800/20 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Activity className="h-3.5 w-3.5 text-blue-500" />
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-medium">
                          MDD
                        </span>
                        <HelpCircle className="h-3 w-3 opacity-50" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t("mddPctTooltip")}</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-lg font-bold tracking-tight text-blue-500">
                  {result?.mddPct !== null
                    ? `${result?.mddPct?.toFixed(2)}%`
                    : "-"}
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
                className="text-amber-600 focus:text-amber-600 focus:bg-amber-600/10 cursor-pointer"
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("actions.cancel")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isDeleting}
                onClick={handleDeleteClick}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
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
