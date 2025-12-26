// file: src/components/domain/optimization/OptimizationJobCard.tsx

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
  Zap,
  BarChart,
  Target,
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
// [삭제] Progress 컴포넌트 임포트 제거
// import { Progress } from "@/components/ui/Progress";

// --- 타입 정의 ---
export interface OptimizationJob {
  id: string;
  status: "completed" | "running" | "pending" | "failed" | "canceled";
  type: "general" | "wfo";
  strategy: Strategy;
  // [삭제] progress 타입 정의 제거
  // progress: {
  //   current_step: number;
  //   total_steps: number;
  // } | null;
  bestResultSummary: {
    backtestScore: number | null;
    totalReturnPct: number | null;
    mddPct: number | null;
  } | null;
  createdAt: string;
  config?: {
    // WFO Folds 카운트를 위해 유지
    wfoSettings?: {
      folds: number;
    };
  };
}

interface OptimizationJobCardProps {
  job: OptimizationJob;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  isCanceling: boolean;
  isDeleting: boolean;
}

export const OptimizationJobCard = ({
  job,
  onCancel,
  onDelete,
  isCanceling,
  isDeleting,
}: OptimizationJobCardProps) => {
  const t = useTranslations("OptimizationJobCard");
  const isWfo = job.type === "wfo";

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

  const currentStatus = statusConfig[job.status] || statusConfig.pending;
  const { bestResultSummary, strategy, id, status, type } = job;

  // [삭제] progressPct, progressText 변수 제거

  const typeConfig = {
    general: {
      label: t("type.general"),
      Icon: Zap,
      badgeClass:
        "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
    },
    wfo: {
      label: t("type.wfo"),
      Icon: BarChart,
      badgeClass:
        "bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30",
    },
  };
  const currentType = typeConfig[type];

  return (
    <TooltipProvider delayDuration={100}>
      <Card
        className={cn(
          "group flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/40 bg-card/40 backdrop-blur-md hover:bg-card/60 hover:border-primary/30",
          status === "running" &&
            "ring-1 ring-primary/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]",
          (status === "failed" || status === "canceled") &&
            "opacity-80 hover:opacity-100"
        )}
      >
        <Link
          href={`/optimization/${id}`}
          className="flex flex-col flex-grow p-5"
        >
          <div className="flex justify-between items-start gap-3 mb-4">
            <div className="space-y-1.5 flex-grow min-w-0">
              <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                {strategy.name}
              </h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 transition-colors",
                    currentType.badgeClass
                  )}
                >
                  <currentType.Icon className="mr-1 h-3 w-3" />
                  {currentType.label}
                </Badge>
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
            {isWfo ? (
              // --- WFO 전용 표시 ---
              <div
                className={cn(
                  "flex flex-col items-center justify-center text-center h-full min-h-[100px] bg-muted/30 p-4 rounded-lg border border-dashed transition-colors group-hover:bg-muted/50",
                  status === "completed"
                    ? "border-teal-500/30"
                    : "border-border/50"
                )}
              >
                {status === "completed" && (
                  <BarChart className="h-8 w-8 text-teal-500 mb-3 opacity-80" />
                )}
                <p className="text-sm font-semibold mb-1">
                  {t("wfo.summaryTitle")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("wfo.summaryDesc")}
                </p>
              </div>
            ) : (
              // --- General 전용 표시 ---
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/30 border border-border/50 group-hover:bg-muted/50 transition-colors">
                <div className="space-y-1 text-center">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help w-full">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
                        {t("bestScore")}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t("bestScoreTooltip")}</TooltipContent>
                  </Tooltip>
                  <p
                    className={cn(
                      "text-base font-bold tracking-tight",
                      bestResultSummary &&
                        bestResultSummary.backtestScore !== null
                        ? bestResultSummary.backtestScore >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                        : "text-muted-foreground"
                    )}
                  >
                    {bestResultSummary?.backtestScore?.toFixed(2) ?? "-"}
                  </p>
                </div>
                <div className="space-y-1 text-center border-l border-border/50">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help w-full">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
                        {t("bestReturn")}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t("bestReturnTooltip")}</TooltipContent>
                  </Tooltip>
                  <p
                    className={cn(
                      "text-base font-bold tracking-tight",
                      bestResultSummary &&
                        bestResultSummary.totalReturnPct !== null
                        ? bestResultSummary.totalReturnPct >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                        : "text-muted-foreground"
                    )}
                  >
                    {bestResultSummary?.totalReturnPct?.toFixed(1) ?? "-"}%
                  </p>
                </div>
                <div className="space-y-1 text-center border-l border-border/50">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help w-full">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
                        {t("bestMdd")}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t("bestMddTooltip")}</TooltipContent>
                  </Tooltip>
                  <p className="text-base font-bold tracking-tight text-foreground">
                    {bestResultSummary?.mddPct?.toFixed(1) ?? "-"}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </Link>

        <div className="flex justify-between items-center px-5 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span>{format(new Date(job.createdAt), "yyyy-MM-dd HH:mm")}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2 hover:bg-muted/50"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={
                  isCanceling || (status !== "running" && status !== "pending")
                }
                onClick={() => onCancel(id)}
                className="text-amber-600 focus:text-amber-600 focus:bg-amber-600/10 cursor-pointer"
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("actions.cancel")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={
                  isDeleting || status === "running" || status === "pending"
                }
                onClick={() => onDelete(id)}
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
