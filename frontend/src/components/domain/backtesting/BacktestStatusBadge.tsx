"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Loader2,
  Archive,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export type BacktestStatus =
  | "completed"
  | "running"
  | "pending"
  | "failed"
  | "canceled";

interface BacktestStatusBadgeProps {
  status: BacktestStatus;
  className?: string;
}

export function BacktestStatusBadge({
  status,
  className,
}: BacktestStatusBadgeProps) {
  const t = useTranslations("BacktestCard");

  const statusConfig = {
    completed: {
      label: t("status.completed"),
      Icon: CheckCircle2,
      colorClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      iconClass: "text-emerald-500",
    },
    running: {
      label: t("status.running"),
      Icon: Loader2,
      colorClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      iconClass: "text-blue-500 animate-spin",
    },
    pending: {
      label: t("status.pending"),
      Icon: Archive,
      colorClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      iconClass: "text-amber-500",
    },
    failed: {
      label: t("status.failed"),
      Icon: AlertCircle,
      colorClass: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      iconClass: "text-rose-500",
    },
    canceled: {
      label: t("status.canceled"),
      Icon: XCircle,
      colorClass: "bg-muted text-muted-foreground border-border",
      iconClass: "text-muted-foreground",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.Icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1.5 h-6 px-2 text-[10px] font-medium uppercase tracking-wider transition-colors",
        config.colorClass,
        className
      )}
    >
      <Icon className={cn("h-3 w-3", config.iconClass)} />
      <span>{config.label}</span>
    </Badge>
  );
}
