"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { BotSummaryCards } from "@/components/domain/bots/dashboard/BotSummaryCards";
import { BotListTable } from "@/components/domain/bots/dashboard/BotListTable";

export default function LiveBotsPage() {
  const t = useTranslations("LiveTrading.Dashboard");

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Enhanced Header with gradient background */}
      <div className="relative mb-10">
        <div className="absolute inset-0 gradient-radial-subtle opacity-50 -z-10" />
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-6 border-b">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
          </div>
          <Link href="/bots/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              {t("createNewBot")}
            </Button>
          </Link>
        </div>
      </div>

      <BotSummaryCards />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("yourBots")}
        </h2>
        <BotListTable />
      </div>
    </div>
  );
}
