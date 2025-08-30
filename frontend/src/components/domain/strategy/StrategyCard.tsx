// file: frontend/src/components/domain/strategy/StrategyCard.tsx

"use client";

import * as React from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Bot,
  BarChart2,
  Eye,
  EyeOff,
  Code,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Copy,
  Globe,
  Lock,
  Zap,
  ShieldCheck,
  ShoppingCart,
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
} from "@/components/ui/Tooltip"; // 👈 [추가] Tooltip 임포트
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LogicBlock, Strategy } from "@/types/strategy";

interface StrategyCardProps {
  strategy: Strategy;
  viewMode?: "grid" | "list";
  onOpenListingModal: (strategy: Strategy) => void;
}

export function StrategyCard({
  strategy,
  viewMode = "grid",
  onOpenListingModal,
}: StrategyCardProps) {
  const t = useTranslations("StrategyCard");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { strategyType, keyIndicators } = useMemo(() => {
    const hasLong =
      strategy.longEntryRules && strategy.longEntryRules.blocks.length > 0;
    const hasShort =
      strategy.shortEntryRules && strategy.shortEntryRules.blocks.length > 0;

    let type = { label: "Custom", icon: Code };
    if (hasLong && hasShort)
      type = { label: "Long/Short", icon: ArrowRightLeft };
    else if (hasLong) type = { label: "Long Only", icon: TrendingUp };
    else if (hasShort) type = { label: "Short Only", icon: TrendingDown };

    const indicators = new Set<string>();
    const rulesets = [
      strategy.longEntryRules,
      strategy.longExitRules,
      strategy.shortEntryRules,
      strategy.shortExitRules,
    ];

    const extractIndicators = (blocks: LogicBlock[]) => {
      blocks.forEach((block) => {
        if ("indicator" in block && block.indicator)
          indicators.add(block.indicator.indicatorKey);
        if (
          "operandA" in block &&
          typeof block.operandA === "object" &&
          block.operandA
        )
          indicators.add(block.operandA.indicatorKey);
        if (
          "operandB" in block &&
          typeof block.operandB === "object" &&
          block.operandB
        )
          indicators.add(block.operandB.indicatorKey);
        if (
          "mainLine" in block &&
          block.mainLine &&
          typeof block.mainLine === "object"
        )
          indicators.add(block.mainLine.indicatorKey);
        if (block.children) extractIndicators(block.children);
      });
    };

    rulesets.forEach((rs) => {
      if (rs) extractIndicators(rs.blocks);
    });

    return {
      strategyType: type,
      keyIndicators: Array.from(indicators).slice(0, 3),
    };
  }, [strategy]);

  const deleteStrategyMutation = useMutation({
    mutationFn: (
      strategyId: string // 👈 [수정] 타입을 number에서 string으로 변경
    ) => apiClient.delete(`/strategies/${strategyId}`),
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
    },
    onError: (error: any) =>
      toast.error(
        t("deleteError", {
          error: error?.response?.data?.detail || error.message,
        })
      ),
  });

  const togglePublicMutation = useMutation({
    mutationFn: (strategy: Strategy) =>
      apiClient.put(`/strategies/${strategy.id}`, {
        isPublic: !strategy.isPublic,
      }),
    onSuccess: (response: any) => {
      // 👈 [수정] 응답 객체를 명시적으로 받음
      const updatedStrategy = response.data; // API Client의 응답 구조에 따라 .data 추가
      toast.success(
        updatedStrategy.isPublic
          ? t("togglePublicSuccess")
          : t("togglePrivateSuccess")
      );
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
    },
    onError: (error: any) =>
      toast.error(
        t("togglePublicError", {
          error: error?.response?.data?.detail || error.message,
        })
      ),
  });

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (confirm(t("confirmDelete", { strategyName: strategy.name }))) {
      deleteStrategyMutation.mutate(strategy.id);
    }
  };

  const handleTogglePublic = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    togglePublicMutation.mutate(strategy);
  };

  const handleDuplicate = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    toast.info(t("duplicateWip"));
  };

  const displayDateString = strategy.updatedAt || strategy.createdAt;

  const handleListOnMarketplace = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    onOpenListingModal(strategy);
  };

  const dropdownMenuContent = (
    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => router.push(`/strategies/${strategy.id}`)}
      >
        <Edit className="mr-2 h-4 w-4" />
        {t("editStrategy")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleDuplicate}>
        <Copy className="mr-2 h-4 w-4" />
        {t("duplicateStrategy")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => router.push(`/backtester?strategyId=${strategy.id}`)}
      >
        <BarChart2 className="mr-2 h-4 w-4" />
        {t("runBacktest")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => router.push(`/live-bots/new?strategyId=${strategy.id}`)}
      >
        <Bot className="mr-2 h-4 w-4" />
        {t("deployLiveBot")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleListOnMarketplace}>
        <ShoppingCart className="mr-2 h-4 w-4" />
        {strategy.marketplaceListing ? t("editListing") : t("listOnMarket")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleTogglePublic}>
        {togglePublicMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : strategy.isPublic ? (
          <EyeOff className="mr-2 h-4 w-4" />
        ) : (
          <Eye className="mr-2 h-4 w-4" />
        )}
        {strategy.isPublic ? t("makePrivate") : t("makePublic")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={handleDelete}
        className="text-destructive focus:text-destructive"
        disabled={deleteStrategyMutation.isPending}
      >
        {deleteStrategyMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-2 h-4 w-4" />
        )}
        {t("deleteStrategy")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  // ▼▼▼ [핵심 추가 UI] 성과 요약 배지를 렌더링하는 컴포넌트 ▼▼▼
  const PerformanceBadges = () => {
    if (!strategy.latestBacktestSummary) {
      return null;
    }
    const { totalReturnPct, winRatePct } = strategy.latestBacktestSummary;
    const isProfitable = totalReturnPct !== null && totalReturnPct >= 0;

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
                <span>{totalReturnPct?.toFixed(2) ?? "N/A"}%</span>
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
                <span>{winRatePct?.toFixed(1) ?? "N/A"}%</span>
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

  if (viewMode === "list") {
    return (
      <Card className="flex items-center w-full p-3 transition-all duration-200 ease-in-out border border-border hover:border-primary/50 hover:shadow-md">
        <Link
          href={`/strategies/${strategy.id}`}
          className="flex items-center gap-4 flex-grow truncate"
        >
          <div className="flex-grow truncate">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground truncate">
                {strategy.name}
              </h3>
              <Badge
                variant="outline"
                className="flex items-center gap-1 flex-shrink-0"
              >
                <strategyType.icon className="h-3 w-3" />
                <span>{strategyType.label}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {strategy.description || t("noDescription")}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <div className="hidden xl:block">
            <PerformanceBadges />
          </div>
          <div className="hidden lg:flex flex-wrap items-center gap-2">
            {keyIndicators.map((key) => (
              <Badge key={key} variant="secondary">
                {key}
              </Badge>
            ))}
          </div>
          <Badge
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium",
              strategy.isPublic
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            {strategy.isPublic ? (
              <Globe className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
          </Badge>
          <p className="hidden sm:block text-xs text-muted-foreground w-24 text-right">
            {t("updatedAt")}:{" "}
            {displayDateString
              ? format(new Date(displayDateString), "yyyy-MM-dd")
              : t("noDate")}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            {dropdownMenuContent}
          </DropdownMenu>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col justify-between h-full transition-all duration-200 ease-in-out border border-border hover:border-primary hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring">
      <Link
        href={`/strategies/${strategy.id}`}
        className="flex flex-col flex-grow h-full p-6"
      >
        <CardHeader className="p-0 mb-4">
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl font-bold text-foreground pr-2">
              {strategy.name}
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium",
                  strategy.isPublic
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                {strategy.isPublic ? (
                  <Globe className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                <span>
                  {strategy.isPublic ? t("statusPublic") : t("statusPrivate")}
                </span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <strategyType.icon className="h-3 w-3" />
                <span>{strategyType.label}</span>
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {strategy.description || t("noDescription")}
          </p>
          <div className="mt-4">
            <PerformanceBadges />
          </div>
        </CardContent>
      </Link>

      <CardFooter className="p-6 pt-4 flex flex-col items-start gap-4">
        <div className="flex flex-wrap items-center gap-2 min-h-[24px]">
          {keyIndicators.map((key) => (
            <Badge key={key} variant="secondary">
              {key}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-muted-foreground">
            {t("updatedAt")}:{" "}
            {displayDateString
              ? format(new Date(displayDateString), "yyyy-MM-dd")
              : t("noDate")}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            {dropdownMenuContent}
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}
