// file: frontend/src/app/[locale]/backtester/new/page.tsx

"use client";

import { useTranslations } from "next-intl";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { BacktestSetupForm } from "@/components/domain/backtesting/BacktestSetupForm";

export default function NewBacktestPage() {
  const t = useTranslations("NewBacktestPage");

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {t("v2.title")}
          </h1>
          <p className="text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
            {t("v2.description")}
          </p>
        </div>

        <BacktestSetupForm />
      </div>
    </AuthGuard>
  );
}
