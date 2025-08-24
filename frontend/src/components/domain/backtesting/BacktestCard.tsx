"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  MoreHorizontal,
  Trash2,
  Eye,
  XCircle,
  Clock,
  CheckCircle2,
  Loader2,
  Copy,
  Zap,
  ShieldCheck,
  CalendarDays,
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

// --- 데이터 타입 정의 (다른 파일과 공유 가능) ---
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
  createdAt: string;
  parameters: {
    startDate: string;
    endDate: string;
    initial_capital: number;
  };
  strategy: StrategyInfo;
  result: BacktestResultSummary | null;
}

interface BacktestCardProps {
  backtest: Backtest;
  onCancel: (backtestId: string) => void;
  onDelete: (backtestId: string) => void;
  isCanceling?: boolean;
  isDeleting?: boolean;
}

// --- 가독성을 위한 서브 컴포넌트 ---

const StatusBadge = ({ status }: { status: Backtest["status"] }) => {
  const t = useTranslations("BacktestCard.Status");
  const statusConfig = {
    pending: {
      icon: Clock,
      label: t("pending"),
      className: "bg-amber-100 text-amber-800",
    },
    running: {
      icon: Loader2,
      label: t("running"),
      className: "bg-blue-100 text-blue-800 animate-pulse",
    },
    completed: {
      icon: CheckCircle2,
      label: t("completed"),
      className: "bg-emerald-100 text-emerald-800",
    },
    failed: {
      icon: XCircle,
      label: t("failed"),
      className: "bg-rose-100 text-rose-800",
    },
    canceled: {
      icon: XCircle,
      label: t("canceled"),
      className: "bg-slate-100 text-slate-800",
    },
  };
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border-none font-semibold", config.className)}
    >
      <Icon
        className={cn("h-3.5 w-3.5", status === "running" && "animate-spin")}
      />
      <span>{config.label}</span>
    </Badge>
  );
};

const PerformanceBadges = ({ result }: { result: BacktestResultSummary }) => {
  const t = useTranslations("BacktestCard");
  const { total_return_pct, win_rate_pct } = result;
  const isProfitable = total_return_pct !== null && total_return_pct >= 0;
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger>
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 cursor-help",
                isProfitable
                  ? "text-emerald-500 border-emerald-500/50"
                  : "text-rose-500 border-rose-500/50"
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
          <TooltipTrigger>
            <Badge variant="secondary" className="gap-1.5 cursor-help">
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

const RunningIndicator = () => {
  const t = useTranslations("BacktestCard");
  return (
    <div className="flex items-center justify-center h-[26px] bg-blue-50 dark:bg-blue-900/20 rounded-md px-4">
      <div className="w-full bg-blue-200 rounded-full h-1.5 dark:bg-blue-700 overflow-hidden">
        <div className="bg-blue-600 h-1.5 rounded-full animate-[loading_2s_ease-in-out_infinite]"></div>
      </div>
    </div>
  );
};

// --- 메인 컴포넌트 ---
export function BacktestCard({
  backtest,
  onCancel,
  onDelete,
  isCanceling,
  isDeleting,
}: BacktestCardProps) {
  const t = useTranslations("BacktestCard");
  const router = useRouter();

  const isActionable = ["pending", "running"].includes(backtest.status);
  const isTerminal = ["completed", "failed", "canceled"].includes(
    backtest.status
  );

  // '복제 후 실행' 핸들러
  const handleCloneAndRun = () => {
    const params = new URLSearchParams({
      strategyId: backtest.strategy.id,
      startDate: backtest.parameters.startDate,
      endDate: backtest.parameters.endDate,
      initialCapital: backtest.parameters.initialCapital.toString(),
    });
    router.push(`/backtester/new?${params.toString()}`);
  };

  const renderCardContent = () => {
    switch (backtest.status) {
      case "running":
        return <RunningIndicator />;
      case "completed":
        return backtest.result ? (
          <PerformanceBadges result={backtest.result} />
        ) : null;
      default:
        return null; // pending, failed, canceled 상태에서는 content 없음
    }
  };

  return (
    <Card className="flex flex-col justify-between h-full transition-all duration-200 ease-in-out hover:shadow-lg hover:border-primary/50">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-grow">
            <CardTitle className="text-base font-bold text-foreground mb-1.5">
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
                {format(new Date(backtest.parameters.startDate), "yy.MM.dd")} -{" "}
                {format(new Date(backtest.parameters.endDate), "yy.MM.dd")}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={backtest.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 h-[42px] flex flex-col justify-center">
        {renderCardContent()}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(backtest.createdAt), {
            addSuffix: true,
            locale: ko,
          })}
        </p>
        <div className="flex items-center gap-2">
          {/* --- 완료 상태일 때 '결과 보기' 버튼을 직접 노출 --- */}
          {backtest.status === "completed" && (
            <Link href={`/backtester/${backtest.id}`} passHref legacyBehavior>
              <Button size="sm" variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                {t("viewResult")}
              </Button>
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCloneAndRun}>
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
        </div>
      </CardFooter>
    </Card>
  );
}
