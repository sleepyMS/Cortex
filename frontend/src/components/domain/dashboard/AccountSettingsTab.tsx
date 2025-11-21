// file: src/components/domain/dashboard/AccountSettingsTab.tsx

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChangePasswordForm } from "@/components/domain/settings/ChangePasswordForm";
import { SubscriptionCard } from "@/components/domain/settings/SubscriptionCard";
import { NotificationSettingsCard } from "@/components/domain/settings/NotificationSettingsCard";
import { DangerZoneCard } from "../settings/DangerZoneCard";
import { CreditCard, Bell, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsSection = "subscription" | "notifications" | "security" | "danger";

interface SectionConfig {
  id: SettingsSection;
  icon: React.ElementType;
  labelKey: string;
  descriptionKey: string;
}

const sections: SectionConfig[] = [
  {
    id: "subscription",
    icon: CreditCard,
    labelKey: "subscription.title",
    descriptionKey: "subscription.description",
  },
  {
    id: "notifications",
    icon: Bell,
    labelKey: "notifications.title",
    descriptionKey: "notifications.description",
  },
  {
    id: "security",
    icon: Shield,
    labelKey: "password.title",
    descriptionKey: "password.description",
  },
  {
    id: "danger",
    icon: AlertTriangle,
    labelKey: "dangerZone.title",
    descriptionKey: "dangerZone.description",
  },
];

export function AccountSettingsTab() {
  const t = useTranslations("Dashboard.settings");
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("subscription");

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* 왼쪽 사이드바 네비게이션 */}
      <aside className="lg:w-64 flex-shrink-0">
        <nav className="space-y-1 sticky top-8">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 mt-0.5 flex-shrink-0",
                    isActive && "text-primary-foreground"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "font-medium text-sm",
                      isActive && "text-primary-foreground"
                    )}
                  >
                    {/* @ts-expect-error */}
                    {t(section.labelKey)}
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-0.5 line-clamp-2",
                      isActive
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {/* @ts-expect-error */}
                    {t(section.descriptionKey)}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 오른쪽 컨텐츠 영역 */}
      <main className="flex-1 min-w-0">
        <div className="space-y-6">
          {/* 섹션 헤더 */}
          <div className="border-b pb-4">
            <h2 className="text-2xl font-bold tracking-tight">
              {/* @ts-expect-error */}
              {t(sections.find((s) => s.id === activeSection)?.labelKey || "")}
            </h2>
            <p className="text-muted-foreground mt-1">
            {/* @ts-expect-error */}
            {t(sections.find((s) => s.id === activeSection)?.descriptionKey || "")}
          </p>
          </div>

          {/* 섹션 컨텐츠 */}
          {activeSection === "subscription" && <SubscriptionCard />}
          {activeSection === "notifications" && <NotificationSettingsCard />}
          {activeSection === "security" && (
            <div className="bg-card border rounded-lg p-6">
              <ChangePasswordForm />
            </div>
          )}
          {activeSection === "danger" && <DangerZoneCard />}
        </div>
      </main>
    </div>
  );
}
