"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";

export default function LiveBotsPage() {
  const t = useTranslations("Dashboard.overview"); // 임시 번역 키 사용

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder for Bot Cards */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="font-semibold leading-none tracking-tight">
            No Bots Running
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            You haven't created any live trading bots yet.
          </p>
        </div>
      </div>
    </div>
  );
}
