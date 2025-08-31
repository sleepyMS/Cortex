// file: frontend/src/components/domain/strategy/StrategyCard.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Strategy } from "@/types/strategy";
import apiClient from "@/lib/apiClient";

// --- 아이콘 임포트 ---
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Bot,
  BarChart2,
  Eye,
  EyeOff,
  Copy,
  Globe,
  Lock,
  Loader2,
  ShoppingCart,
} from "lucide-react";

// --- UI 컴포넌트 임포트 ---
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

// --- 분리된 재사용 컴포넌트 임포트 ---
import { StrategyPerformanceBadges } from "./StrategyPerformanceBadges";
import { KeyIndicatorBadges } from "./KeyIndicatorBadges";

// --- Props 타입 정의 ---
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

  // --- 뮤테이션 및 핸들러 ---
  const deleteStrategyMutation = useMutation({
    mutationFn: (strategyId: string) =>
      apiClient.delete(`/strategies/${strategyId}`),
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
      const updatedStrategy = response.data;
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

  const handleListOnMarketplace = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    onOpenListingModal(strategy);
  };

  // --- 드롭다운 메뉴 UI ---
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

  const displayDateString = strategy.updatedAt || strategy.createdAt;

  // --- List View 렌더링 ---
  if (viewMode === "list") {
    return (
      <Card className="flex items-center w-full p-3 transition-all duration-200 ease-in-out border border-border hover:border-primary/50 hover:shadow-md">
        <Link
          href={`/strategies/${strategy.id}`}
          className="flex items-center gap-4 flex-grow truncate"
        >
          <div className="flex-grow truncate">
            <h3 className="text-base font-bold text-foreground truncate">
              {strategy.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {strategy.description || t("noDescription")}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <div className="hidden xl:block">
            <StrategyPerformanceBadges
              summary={strategy.latestBacktestSummary}
            />
          </div>
          <div className="hidden lg:block">
            <KeyIndicatorBadges strategy={strategy} />
          </div>
          <Badge
            className={cn(
              "flex items-center gap-1.5",
              strategy.isPublic
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-800"
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

  // --- Grid View 렌더링 ---
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
            <Badge
              className={cn(
                "flex items-center gap-1.5",
                strategy.isPublic
                  ? "bg-blue-100 text-blue-800"
                  : "bg-slate-100 text-slate-800"
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
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {strategy.description || t("noDescription")}
          </p>
          <div className="mt-4">
            <StrategyPerformanceBadges
              summary={strategy.latestBacktestSummary}
            />
          </div>
        </CardContent>
      </Link>
      <CardFooter className="p-6 pt-4 flex flex-col items-start gap-4">
        <div className="min-h-[24px]">
          <KeyIndicatorBadges strategy={strategy} />
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
