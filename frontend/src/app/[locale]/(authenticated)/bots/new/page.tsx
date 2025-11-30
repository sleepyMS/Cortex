"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { BotWizard } from "@/components/bots/wizard/BotWizard";

export default function NewBotPage() {
  // const t = useTranslations("StrategyBuilder"); // 임시 번역 키

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/bots"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bots
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create New Bot</h1>
        <p className="text-muted-foreground mt-2">
          Configure your automated trading bot in 5 simple steps.
        </p>
      </div>

      <BotWizard />
    </div>
  );
}
