// file: src/components/domain/backtesting/BacktestCard.tsx

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
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
  Calendar,
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
import { BacktestStatusBadge } from "./BacktestStatusBadge";

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
    const currentParams = new URLSearchParams(window.location.search);
    const currentViewId = currentParams.get("view");

    if (currentViewId === backtest.id) {
      onDelete(backtest.id);
      if (typeof window !== "undefined") {
        window.location.href = "/backtester";
      }
    } else {
      onDelete(backtest.id);
    }
    setShowDeleteConfirm(false);
  };

  const { result, parameters, strategy, id, status } = backtest;

  const startDate = parameters?.startDate
    ? new Date(parameters.startDate)
    : null;
  const endDate = parameters?.endDate ? new Date(parameters.endDate) : null;
  const dateRangeString =
    startDate && isValid(startDate) && endDate && isValid(endDate)
      ? `${format(startDate, "yy.MM.dd")} - ${format(endDate, "yy.MM.dd")}`
      : t("noDateInfo");

  // 분할 뷰 사이드바를 위한 컴팩트 모드
  if (compact) {
    return (
      <>
        <div className="relative group">
          <Link href={`/backtester/${id}`}>
            <Card className="w-full p-4 transition-all duration-300 ease-in-out border border-border/40 hover:border-primary/40 bg-card/40 backdrop-blur-md hover:bg-card/60">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 pr-6">
                  <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {strategy.name}
                  </h3>
                  <BacktestStatusBadge
                    status={status}
                    className="h-4 px-1.5 text-[8px]"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      result && result.totalReturnPct !== null
                        ? (result.totalReturnPct ?? 0) >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                        : "text-muted-foreground/60"
                    )}
                  >
                    {result && result.totalReturnPct !== null
                      ? result.totalReturnPct >= 0
                        ? "+"
                        : ""
                      : ""}
                    {result?.totalReturnPct?.toFixed(2) ?? "-"}%
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {format(new Date(backtest.createdAt), "MM.dd HH:mm")}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
          <button
            onClick={handleDeleteClick}
            className="absolute top-3.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-destructive z-10"
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

  // 전체 그리드 뷰
  return (
    <TooltipProvider delayDuration={100}>
      <Card
        className={cn(
          "group relative flex flex-col h-full transition-all duration-500 ease-out border border-border/50 bg-card/40 backdrop-blur-md overflow-hidden",
          "hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-primary/5 hover:-translate-y-1.5 hover:bg-card/60 hover:border-primary/40",
          status === "running" &&
            "border-primary/30 shadow-[0_0_20px_rgba(139,92,246,0.1)] animate-pulse-subtle"
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <Link
          href={`/backtester/${id}`}
          className="flex flex-col flex-grow p-6"
        >
          <div className="flex justify-between items-start gap-4 mb-6">
            <div className="space-y-1.5 flex-grow min-w-0">
              <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                {strategy.name}
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 uppercase font-bold tracking-tight">
                <Calendar className="h-3 w-3" />
                <span>{dateRangeString}</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <BacktestStatusBadge status={status} />
            </div>
          </div>

          <div className="flex-grow space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Total Return */}
              <div
                className={cn(
                  "p-4 rounded-xl border border-border/50 flex flex-col items-center text-center transition-colors duration-300",
                  result && result.totalReturnPct !== null
                    ? result.totalReturnPct >= 0
                      ? "bg-emerald-500/5 group-hover:bg-emerald-500/10 border-emerald-500/10"
                      : "bg-rose-500/5 group-hover:bg-rose-500/10 border-rose-500/10"
                    : "bg-muted/10 group-hover:bg-muted/20"
                )}
              >
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help inline-flex items-center gap-1 text-[11px] uppercase font-bold tracking-widest text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
                      {t("totalReturn")}
                      <HelpCircle className="h-3 w-3 opacity-40" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px] p-2.5">
                      <p className="font-bold text-sm mb-1">
                        {t("totalReturn")}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t("totalReturnTooltip")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1.5">
                  <p
                    className={cn(
                      "text-xl font-bold tracking-tighter tabular-nums",
                      result && result.totalReturnPct !== null
                        ? result.totalReturnPct >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                        : "text-muted-foreground/40"
                    )}
                  >
                    {result && result.totalReturnPct !== null
                      ? `${
                          result.totalReturnPct >= 0 ? "+" : ""
                        }${result.totalReturnPct.toFixed(2)}%`
                      : "-"}
                  </p>
                </div>
              </div>

              {/* MDD */}
              <div className="p-4 rounded-xl border border-border/50 bg-blue-500/5 group-hover:bg-blue-500/10 border-blue-500/10 flex flex-col items-center text-center transition-colors duration-300">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help inline-flex items-center gap-1 text-[11px] uppercase font-bold tracking-widest text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
                      MDD
                      <HelpCircle className="h-3 w-3 opacity-40" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px] p-2.5">
                      <p className="font-bold text-sm mb-1">MDD</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t("mddPctTooltip")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-bold tracking-tighter text-blue-500 tabular-nums">
                    {result?.mddPct !== null
                      ? `${result?.mddPct?.toFixed(2)}%`
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* 시뮬레이션 프로그레스 */}
            {status === "running" && (
              <div className="space-y-3 px-1">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-widest animate-pulse">
                    {t("simulating")}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-primary">
                    {backtest.progress ?? 0}%
                  </span>
                </div>
                <div className="relative h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${backtest.progress ?? 30}%` }}
                    transition={{ duration: 0.5 }}
                  />
                  <div
                    className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-[shimmer_1.5s_infinite]"
                    style={{ backgroundSize: "200% 100%" }}
                  />
                </div>
              </div>
            )}
          </div>
        </Link>

        <div className="flex justify-between items-center px-6 py-4 border-t border-border/50 bg-muted/10">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-muted-foreground/50 tracking-tighter">
              Execution Date
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium tabular-nums">
              <Clock className="h-3 w-3 opacity-60" />
              <span>
                {format(new Date(backtest.createdAt), "yyyy.MM.dd HH:mm")}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full -mr-2 text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 p-1.5 rounded-xl border-border/50 shadow-xl"
            >
              <DropdownMenuItem
                disabled={isCanceling || status !== "running"}
                onClick={() => onCancel(id)}
                className="rounded-lg text-amber-500 focus:text-amber-500 focus:bg-amber-500/10 cursor-pointer font-bold duration-200"
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("actions.cancel")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isDeleting}
                onClick={handleDeleteClick}
                className="rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-bold duration-200"
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
