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
import { Progress } from "@/components/ui/Progress";

// --- 타입 정의 ---
export interface OptimizationJob {
  id: string;
  status: "completed" | "running" | "pending" | "failed" | "canceled";
  type: "general" | "wfo"; // 일반 최적화 또는 워크포워드 최적화
  strategy: Strategy;
  progress: {
    current_step: number; // 현재 진행된 Trial 또는 Fold
    total_steps: number; // 총 Trial 또는 Fold
  } | null;
  bestResultSummary: {
    backtestScore: number | null;
    totalReturnPct: number | null;
    mddPct: number | null;
    // winRatePct: number | null;
  } | null;
  createdAt: string;
}

interface OptimizationJobCardProps {
  job: OptimizationJob;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  isCanceling: boolean;
  isDeleting: boolean;
}

/**
 * 최적화 작업의 요약 정보를 표시하는 카드 컴포넌트.
 * BacktestCard와 유사한 디자인을 공유하며 최적화 관련 정보를 표시합니다.
 */
export const OptimizationJobCard = ({
  job,
  onCancel,
  onDelete,
  isCanceling,
  isDeleting,
}: OptimizationJobCardProps) => {
  const t = useTranslations("OptimizationJobCard");

  // BacktestCard와 동일한 상태 설정 객체 재사용
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

  // 프로그레스바 계산
  const progressPct =
    job.progress && job.progress.total_steps > 0
      ? (job.progress.current_step / job.progress.total_steps) * 100
      : 0;

  const progressText = job.progress
    ? `${job.progress.current_step} / ${job.progress.total_steps}`
    : t("optimizing");

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
          "flex flex-col h-full transition-all hover:shadow-md border border-border hover:border-primary",
          (status === "failed" || status === "canceled") &&
            "opacity-70 bg-muted/50"
        )}
      >
        <Link href={`/optimization/${id}`} className="flex flex-col flex-grow">
          <CardHeader>
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-base font-semibold line-clamp-2">
                {strategy.name}
              </CardTitle>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge className={cn("shrink-0", currentStatus.badgeClass)}>
                  {currentStatus.label}
                </Badge>
                <Badge className={cn("shrink-0", currentType.badgeClass)}>
                  <currentType.Icon className="h-3 w-3 mr-1" />
                  {currentType.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <div className="flex justify-around text-center">
              {/* --- 최적화 핵심 결과 표시 --- */}
              <div className="w-1/3">
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      {t("bestScore")}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{t("bestScoreTooltip")}</TooltipContent>
                </Tooltip>
                <p
                  className={cn(
                    "text-lg font-bold",
                    bestResultSummary &&
                      bestResultSummary.backtestScore !== null
                      ? bestResultSummary.backtestScore >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                      : "text-muted-foreground"
                  )}
                >
                  {bestResultSummary?.backtestScore?.toFixed(2) ?? "N/A"}
                </p>
              </div>
              <div className="w-1/3">
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      {t("bestReturn")}
                      <HelpCircle className="h-3 w-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{t("bestReturnTooltip")}</TooltipContent>
                </Tooltip>
                <p
                  className={cn(
                    "text-lg font-bold",
                    bestResultSummary &&
                      bestResultSummary.totalReturnPct !== null
                      ? bestResultSummary.totalReturnPct >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                      : "text-muted-foreground"
                  )}
                >
                  {bestResultSummary?.totalReturnPct?.toFixed(2) ?? "N/A"}%
                </p>
              </div>
              <div className="w-1/3">
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      {t("bestMdd")}
                      <HelpCircle className="h-3 w-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{t("bestMddTooltip")}</TooltipContent>
                </Tooltip>
                <p className="text-lg font-bold text-foreground">
                  {bestResultSummary?.mddPct?.toFixed(2) ?? "N/A"}%
                </p>
              </div>
            </div>

            {/* --- 'running' 상태일 때 프로그레스 바 표시 --- */}
            {status === "running" && (
              <div className="pt-2">
                <Progress value={progressPct} className="h-2" />
                <p className="text-xs text-center text-blue-500 mt-1.5">
                  {t("optimizingStatus", {
                    current: job.progress?.current_step ?? 0,
                    total: job.progress?.total_steps ?? 0,
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Link>
        <CardFooter className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {t("runAt", {
                date: format(new Date(job.createdAt), "yyyy-MM-dd HH:mm"),
              })}
            </span>
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
                  className="text-[hsl(var(--destructive))] focus:bg-[hsl(var(--destructive))]/10 focus:text-[hsl(var(--destructive))]"
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
