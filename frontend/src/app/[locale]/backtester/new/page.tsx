// file: frontend/src/app/[locale]/backtester/new/page.tsx

"use client";

import { useTranslations } from "next-intl";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { BacktestSetupForm } from "@/components/domain/backtesting/BacktestSetupForm";

export default function NewBacktestPage() {
  const t = useTranslations("NewBacktestPage");

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>

        <BacktestSetupForm />
      </div>
    </AuthGuard>
  );
}
