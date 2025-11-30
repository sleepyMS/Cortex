"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { BotSummaryCards } from "@/components/bots/dashboard/BotSummaryCards";
import { BotListTable } from "@/components/bots/dashboard/BotListTable";

export default function LiveBotsPage() {
  const t = useTranslations("LiveTrading.Dashboard");

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>
        <Link href="/bots/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("createNewBot")}
          </Button>
        </Link>
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
