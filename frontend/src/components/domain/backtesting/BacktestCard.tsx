// file: frontend/src/components/domain/backtesting/BacktestCard.tsx

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  BarChart2,
  Eye,
  XCircle,
  Clock,
  CheckCircle2,
  Loader2,
  Copy,
  Zap,
  ShieldCheck,
  CalendarDays,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/Progress";

// --- Data Types ---
// API 명세와 DB 스키마를 기반으로 Backtest 타입을 정의합니다.
// 이 타입은 나중에 중앙화된 types 폴더로 이동할 수 있습니다.
interface BacktestResultSummary {
  total_return_pct: number | null;
  win_rate_pct: number | null;
  mdd_pct: number | null;
}

interface StrategyInfo {
  id: string;
  name: string;
}

export interface Backtest {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "canceled";
  createdAt: string; // ISO 8601 string
  parameters: {
    start_date: string;
    end_date: string;
    initial_capital: number;
  };
  strategy: StrategyInfo;
  result: BacktestResultSummary | null;
}

// --- Component Props ---
interface BacktestCardProps {
  backtest: Backtest;
  onCancel: (backtestId: string) => void;
  onDelete: (backtestId: string) => void;
  isCanceling?: boolean;
  isDeleting?: boolean;
}

// --- Sub-components for better readability ---

const StatusBadge = ({ status }: { status: Backtest["status"] }) => {
  const t = useTranslations("BacktestCard.Status");
  const statusConfig = {
    pending: {
      icon: Clock,
      label: t("pending"),
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300/50",
    },
    running: {
      icon: Loader2,
      label: t("running"),
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300/50 animate-pulse",
    },
    completed: {
      icon: CheckCircle2,
      label: t("completed"),
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300/50",
    },
    failed: {
      icon: XCircle,
      label: t("failed"),
      className:
        "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300/50",
    },
    canceled: {
      icon: XCircle,
      label: t("canceled"),
      className:
        "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300/50",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={cn("flex items-center gap-1.5", config.className)}>
      <Icon
        className={cn("h-3.5 w-3.5", status === "running" && "animate-spin")}
      />
      <span>{config.label}</span>
    </Badge>
  );
};

const PerformanceBadges = ({ result }: { result: BacktestResultSummary }) => {
  const t = useTranslations("StrategyCard"); // 'StrategyCard'의 번역을 재사용
  const { total_return_pct, win_rate_pct } = result;
  const isProfitable = total_return_pct !== null && total_return_pct >= 0;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className={cn(
                "flex items-center gap-1.5 cursor-help",
                isProfitable
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300/50"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300/50"
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{total_return_pct?.toFixed(2) ?? "N/A"}%</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("totalReturnTooltip")}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 cursor-help"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{win_rate_pct?.toFixed(1) ?? "N/A"}%</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("winRateTooltip")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

// --- Main Component ---

export function BacktestCard({
  backtest,
  onCancel,
  onDelete,
  isCanceling,
  isDeleting,
}: BacktestCardProps) {
  const t = useTranslations("BacktestCard");

  const isActionable =
    backtest.status === "pending" || backtest.status === "running";
  const isTerminal = ["completed", "failed", "canceled"].includes(
    backtest.status
  );

  return (
    <Card className="flex flex-col justify-between h-full transition-all duration-200 ease-in-out border border-border hover:border-primary/80 hover:shadow-md">
      <CardHeader className="p-4 flex-row items-start justify-between gap-4">
        <div className="flex-grow">
          <CardTitle className="text-base font-bold text-foreground mb-1">
            <Link
              href={`/strategies/${backtest.strategy.id}`}
              className="hover:underline"
            >
              {backtest.strategy.name}
            </Link>
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>
              {format(new Date(backtest.parameters.start_date), "yy.MM.dd")} -{" "}
              {format(new Date(backtest.parameters.end_date), "yy.MM.dd")}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={backtest.status} />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {backtest.status === "running" && (
          <div className="space-y-1">
            <Progress value={33} className="h-1 animate-pulse" />
            <p className="text-xs text-blue-500 text-center">
              {t("runningMessage")}
            </p>
          </div>
        )}
        {backtest.status === "completed" && backtest.result ? (
          <PerformanceBadges result={backtest.result} />
        ) : backtest.status !== "running" ? (
          <div className="flex items-center justify-center h-[26px] bg-slate-100 dark:bg-slate-800/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              {t("noResultMessage")}
            </p>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(backtest.createdAt), {
            addSuffix: true,
            locale: ko,
          })}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href={`/backtester/${backtest.id}`} passHref legacyBehavior>
              <DropdownMenuItem disabled={backtest.status !== "completed"}>
                <Eye className="mr-2 h-4 w-4" />
                {t("viewResult")}
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem disabled>
              <Copy className="mr-2 h-4 w-4" />
              {t("cloneAndRun")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onCancel(backtest.id)}
              disabled={!isActionable || isCanceling}
              className="text-amber-600 focus:text-amber-700"
            >
              {isCanceling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {t("cancelJob")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(backtest.id)}
              disabled={!isTerminal || isDeleting}
              className="text-destructive focus:text-destructive"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t("deleteJob")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
