"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { BotSummaryCards } from "@/components/domain/bots/dashboard/BotSummaryCards";
import { BotListTable } from "@/components/domain/bots/dashboard/BotListTable";
import { GlassPane } from "@/components/ui/GlassPane";

export default function LiveBotsPage() {
  const t = useTranslations("LiveTrading.Dashboard");

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 space-y-12">
      {/* 고도화된 헤더 - 그라데이션 배경 및 배지 포함 */}
      <div className="relative mb-12">
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8 pb-8 border-b border-border/40">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Live Trading
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
              {t("subtitle")}
            </p>
          </div>
          <Link href="/bots/new" className="shrink-0 w-full md:w-auto">
            <Button
              size="lg"
              className="w-full md:w-auto gap-2.5 px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              <span className="font-bold">{t("createNewBot")}</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-12">
        {/* 1. 자산 현황 섹션 */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 ml-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10px] uppercase font-black text-foreground tracking-widest opacity-60">
              Asset Overview
            </span>
          </div>
          <GlassPane className="p-1 md:p-1 rounded-[32px] border-border/30 overflow-hidden">
            <div className="bg-muted/5 p-6 md:p-8">
              <BotSummaryCards />
            </div>
          </GlassPane>
        </div>

        {/* 2. 봇 목록 섹션 */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 ml-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10px] uppercase font-black text-foreground tracking-widest opacity-60">
              Active Bots
            </span>
          </div>
          <GlassPane className="p-1 md:p-1 rounded-[32px] border-border/30 overflow-hidden">
            <div className="bg-muted/5 p-6 md:p-8 space-y-6">
              <BotListTable />
            </div>
          </GlassPane>
        </div>
      </div>
    </div>
  );
}
