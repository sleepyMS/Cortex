"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { BotSummaryCards } from "@/components/bots/dashboard/BotSummaryCards";
import { BotListTable } from "@/components/bots/dashboard/BotListTable";

export default function LiveBotsPage() {
  // const t = useTranslations("Dashboard.overview"); // 임시 번역 키 사용

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Bots</h1>
          <p className="text-muted-foreground mt-2">
            Manage your automated trading bots and monitor their performance.
          </p>
        </div>
        <Link href="/bots/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Bot
          </Button>
        </Link>
      </div>

      <BotSummaryCards />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Your Bots</h2>
        <BotListTable />
      </div>
    </div>
  );
}
