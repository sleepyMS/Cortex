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
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LogicBlock, Strategy } from "@/types/strategy"; // 👈 완성된 Strategy 타입을 직접 임포트

interface StrategyCardProps {
  strategy: Strategy; // 👈 props 타입을 Strategy로 변경
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const t = useTranslations("StrategyCard");
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteStrategyMutation = useMutation({
    mutationFn: (strategyId: number) =>
      apiClient.delete(`/strategies/${strategyId}`),
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
    },
    onError: (error: any) => {
      toast.error(
        t("deleteError", {
          error: error?.response?.data?.detail || error.message,
        })
      );
    },
  });

  const togglePublicMutation = useMutation({
    // 👈 API 요청 시 isPublic (camelCase) 사용
    mutationFn: (strategy: Strategy) =>
      apiClient.put(`/strategies/${strategy.id}`, {
        isPublic: !strategy.isPublic,
      }),
    onSuccess: (data: any) => {
      toast.success(
        data.isPublic ? t("togglePublicSuccess") : t("togglePrivateSuccess")
      );
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
    },
    onError: (error: any) => {
      toast.error(
        t("togglePublicError", {
          error: error?.response?.data?.detail || error.message,
        })
      );
    },
  });

  const { strategyType, keyIndicators } = useMemo(() => {
    // 👈 strategy 객체의 속성을 camelCase로 접근
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

  const displayDateString = strategy.updatedAt || strategy.createdAt;

  return (
    <Card className="flex flex-col justify-between h-full transition-all duration-200 ease-in-out border border-border hover:border-primary hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring">
      <Link
        href={`/strategies/${strategy.id}/edit`}
        className="flex flex-col flex-grow h-full p-6"
      >
        <CardHeader className="p-0 mb-4">
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl font-bold text-foreground pr-2">
              {strategy.name}
            </CardTitle>
            <Badge
              variant="outline"
              className="flex items-center gap-1 flex-shrink-0"
            >
              <strategyType.icon className="h-3 w-3" />
              <span>{strategyType.label}</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-grow">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {strategy.description || t("noDescription")}
          </p>
        </CardContent>
      </Link>

      <CardFooter className="p-6 pt-4 flex flex-col items-start gap-4">
        <div className="flex flex-wrap items-center gap-2">
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
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push(`/strategies/${strategy.id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t("editStrategy")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/backtester?strategyId=${strategy.id}`)
                }
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                {t("runBacktest")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/live-bots/new?strategyId=${strategy.id}`)
                }
              >
                <Bot className="mr-2 h-4 w-4" />
                {t("deployLiveBot")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleTogglePublic}>
                {/* 👈 isPublic (camelCase) 사용 */}
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
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}
