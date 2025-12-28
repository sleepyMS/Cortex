// file: frontend/src/components/domain/ai/AIModelCard.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  Brain,
  Clock,
  Trash2,
  MoreVertical,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  Calendar,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import type { AIModelSummary, AIModelStatus } from "@/types/ai";

interface AIModelCardProps {
  model: AIModelSummary;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

const statusConfig: Record<
  AIModelStatus,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  pending: {
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  training: {
    icon: Loader2,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  failed: {
    icon: XCircle,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
  },
};

export function AIModelCard({ model, onDelete, isDeleting }: AIModelCardProps) {
  const t = useTranslations("AILabPage");
  const locale = useLocale();
  const config = statusConfig[model.status];
  const StatusIcon = config.icon;

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: locale === "ko" ? ko : enUS,
      });
    } catch {
      return dateString;
    }
  };

  const trainingPeriod = () => {
    const start = new Date(model.trainingStartDate);
    const end = new Date(model.trainingEndDate);
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return `${days}${t("card.daysSuffix")}`;
  };

  return (
    <Link href={`/ai-lab/${model.id}`} className="block group h-full">
      <div className="relative flex flex-col h-full overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/30 hover:-translate-y-1.5 hover:bg-card/60">
        {/* Training progress bar for active training */}
        {model.status === "training" && (
          <div className="absolute top-0 left-0 right-0 z-20">
            <div className="h-1 w-full bg-primary/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
        )}

        <div className="relative p-6 flex flex-col flex-grow space-y-5">
          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="font-bold text-lg leading-tight text-foreground truncate group-hover:text-primary transition-colors">
                {model.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider h-5 px-2 rounded-full"
                >
                  {model.modelType}
                </Badge>
                {model.isOptimized && (
                  <Badge
                    variant="outline"
                    className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[10px] h-5 flex items-center gap-1.5 px-2 rounded-full animate-pulse"
                  >
                    <Sparkles className="h-3 w-3" />
                    Optuna
                  </Badge>
                )}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border border-border/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                    {model.trainingSymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border border-current/20 backdrop-blur-md",
                config.bgColor,
                config.color
              )}
            >
              <StatusIcon
                className={cn(
                  "h-3 w-3",
                  model.status === "training" && "animate-spin"
                )}
              />
              {t(`status.${model.status}`)}
            </div>
          </div>

          {/* Stats Box */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/20 border border-border/50 group-hover:bg-muted/30 transition-colors">
            <div className="space-y-1.5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {t("card.timeframe")}
              </p>
              <p className="text-sm font-extrabold text-foreground tracking-tight">
                {model.trainingTimeframe}
              </p>
            </div>
            <div className="space-y-1.5 text-center border-l border-border/50">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {t("card.period")}
              </p>
              <p className="text-sm font-extrabold text-foreground tracking-tight">
                {trainingPeriod()}
              </p>
            </div>
          </div>

          {/* Description */}
          {model.description && (
            <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed italic group-hover:text-muted-foreground transition-colors">
              {'"'}
              {model.description}
              {'"'}
            </p>
          )}

          {/* Spacer to push footer down */}
          <div className="flex-grow" />

          {/* Footer */}
          <div className="flex justify-between items-center pt-5 border-t border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium tracking-tight">
                {formatDate(model.createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <ChevronRight className="h-4 w-4 text-primary" />
              </div>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-muted/50 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="h-4.5 w-4.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-xl border-border/40 shadow-2xl"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {model.status === "completed" && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/ai-lab/${model.id}?test=true`}
                        className="cursor-pointer"
                      >
                        <PlayCircle className="h-4 w-4 mr-2.5 text-primary" />
                        <span className="font-semibold">
                          {t("card.testPrediction")}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(model.id);
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 mr-2.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2.5" />
                    )}
                    <span className="font-semibold">{t("card.delete")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
