"use client";

import { WizardData } from "../BotWizard";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Rocket, GraduationCap, Check } from "lucide-react";

interface ModeSelectionStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function ModeSelectionStep({
  data,
  updateData,
}: ModeSelectionStepProps) {
  const t = useTranslations("LiveTrading.Wizard.Mode");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className={cn(
            "relative p-6 cursor-pointer transition-all hover:border-primary",
            data.mode === "paper"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "hover:bg-muted/50"
          )}
          onClick={() => updateData({ mode: "paper" })}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              {data.mode === "paper" && (
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{t("paperTitle")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("paperDesc")}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            "relative p-6 cursor-pointer transition-all hover:border-primary",
            data.mode === "live"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "hover:bg-muted/50"
          )}
          onClick={() => updateData({ mode: "live" })}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <Rocket className="h-6 w-6" />
              </div>
              {data.mode === "live" && (
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{t("liveTitle")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("liveDesc")}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
