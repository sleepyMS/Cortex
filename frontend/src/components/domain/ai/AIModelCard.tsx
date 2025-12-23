// file: frontend/src/components/domain/ai/AIModelCard.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
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
  const config = statusConfig[model.status];
  const StatusIcon = config.icon;

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ko,
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
    return `${days}일`;
  };

  return (
    <Link href={`/ai-lab/${model.id}`} className="block group">
      <div className="relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:border-primary/30">
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Training progress bar for active training */}
        {model.status === "training" && (
          <div className="absolute top-0 left-0 right-0">
            <Progress value={50} className="h-1 rounded-none" />
          </div>
        )}

        <div className="relative p-5 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {model.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {model.modelType.toUpperCase()}
                <span className="mx-1">•</span>
                {model.trainingSymbol}
              </p>
            </div>

            {/* Status Badge */}
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1 font-medium border-0",
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
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                {t("card.timeframe")}
              </p>
              <p className="text-sm font-semibold mt-1">
                {model.trainingTimeframe}
              </p>
            </div>
            <div className="text-center border-l border-border/50">
              <p className="text-xs text-muted-foreground">
                {t("card.period")}
              </p>
              <p className="text-sm font-semibold mt-1">{trainingPeriod()}</p>
            </div>
          </div>

          {/* Description */}
          {model.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {model.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(model.createdAt)}
            </span>

            <div className="flex items-center gap-1">
              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {model.status === "completed" && (
                    <DropdownMenuItem asChild>
                      <Link href={`/ai-lab/${model.id}/test`}>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        {t("card.testPrediction")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(model.id);
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {t("card.delete")}
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
