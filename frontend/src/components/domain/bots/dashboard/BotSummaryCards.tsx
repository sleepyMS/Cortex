"use client";

import { Card } from "@/components/ui/Card";
import {
  Activity,
  Bot,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { getBots } from "@/lib/api/bots";
import { Skeleton } from "@/components/ui/Skeleton";

export function BotSummaryCards() {
  const t = useTranslations("LiveTrading.Dashboard.summary");

  const { data: bots, isLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: () => getBots(),
    refetchInterval: 10000,
  });

  // 통계 계산
  const stats = {
    totalEquity:
      bots?.reduce(
        (sum, bot) => sum + (bot.currentBalance || bot.initialCapital),
        0
      ) || 0,
    activeBots: bots?.filter((bot) => bot.status === "active").length || 0,
    totalBots: bots?.length || 0,
    dailyPnl: bots?.reduce((sum, bot) => sum + bot.dailyPnl, 0) || 0,
    totalPnl: bots?.reduce((sum, bot) => sum + bot.totalPnl, 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="relative overflow-hidden p-6">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent" />
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: t("totalEquity"),
      value: `$${stats.totalEquity.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      description: t("totalEquityDesc"),
      icon: DollarSign,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      trend: null,
    },
    {
      title: t("activeBots"),
      value: stats.activeBots.toString(),
      description: t("activeBotsDesc", { total: stats.totalBots }),
      icon: Bot,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      trend: null,
    },
    {
      title: t("dailyPnL"),
      value: `$${Math.abs(stats.dailyPnl).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      description:
        stats.dailyPnl >= 0
          ? t("dailyPnLDescPositive")
          : t("dailyPnLDescNegative"),
      icon: Activity,
      iconBg: stats.dailyPnl >= 0 ? "bg-green-500/10" : "bg-red-500/10",
      iconColor: stats.dailyPnl >= 0 ? "text-green-500" : "text-red-500",
      trend: stats.dailyPnl >= 0 ? "up" : "down",
      trendValue: stats.dailyPnl,
    },
    {
      title: t("totalPnL"),
      value: `$${Math.abs(stats.totalPnl).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      description:
        stats.totalPnl >= 0
          ? t("totalPnLDescPositive")
          : t("totalPnLDescNegative"),
      icon: TrendingUp,
      iconBg: stats.totalPnl >= 0 ? "bg-green-500/10" : "bg-red-500/10",
      iconColor: stats.totalPnl >= 0 ? "text-green-500" : "text-red-500",
      trend: stats.totalPnl >= 0 ? "up" : "down",
      trendValue: stats.totalPnl,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1.5 group"
        >
          {/* Subtle gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative flex items-start justify-between">
            <div className="space-y-2 flex-1">
              {/* Title */}
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {card.title}
              </p>

              {/* Value with trend indicator */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-2xl font-black tracking-tight tabular-nums ${
                    card.trend === "up"
                      ? "text-green-500"
                      : card.trend === "down"
                      ? "text-red-500"
                      : "text-foreground"
                  }`}
                >
                  {card.trend === "down" && "-"}
                  {card.value}
                </span>

                {/* Trend arrow badge */}
                {card.trend && (
                  <span
                    className={`flex items-center justify-center h-5 w-5 rounded-full ${
                      card.trend === "up"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {card.trend === "up" ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>

            {/* Icon with colored background */}
            <div
              className={`flex items-center justify-center h-12 w-12 rounded-xl ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}
            >
              <card.icon className={`h-6 w-6 ${card.iconColor}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
