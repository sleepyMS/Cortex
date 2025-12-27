// file: frontend/src/components/domain/FeatureSection.tsx

import { getTranslations } from "next-intl/server";
import React from "react";
import { ScrollFeatureShowcase } from "./ScrollFeatureShowcase";

// async 함수로 서버에서 번역 텍스트를 가져옴
const FeatureSection = async () => {
  const t = await getTranslations("Landing.FeatureSection");

  // 번역 데이터를 클라이언트 컴포넌트에 전달
  const translations = {
    sectionLabel: t("sectionLabel"),
    sectionTitle: t("sectionTitle"),
    sectionSubtitle: t("sectionSubtitle"),
    statistics: {
      aiLab: t("statistics.aiLab"),
      strategyBuilder: t("statistics.strategyBuilder"),
      optimization: t("statistics.optimization"),
      backtesting: t("statistics.backtesting"),
      infrastructure: t("statistics.infrastructure"),
    },
    techStack: {
      title: t("techStack.title"),
    },
    features: {
      aiLab: {
        badge: t("features.aiLab.badge"),
        title: t("features.aiLab.title"),
        description: t("features.aiLab.description"),
        highlights: [
          t("features.aiLab.highlights.0"),
          t("features.aiLab.highlights.1"),
          t("features.aiLab.highlights.2"),
        ],
        cta: t("features.aiLab.cta"),
      },
      strategyBuilder: {
        badge: t("features.strategyBuilder.badge"),
        title: t("features.strategyBuilder.title"),
        description: t("features.strategyBuilder.description"),
        highlights: [
          t("features.strategyBuilder.highlights.0"),
          t("features.strategyBuilder.highlights.1"),
          t("features.strategyBuilder.highlights.2"),
        ],
        cta: t("features.strategyBuilder.cta"),
      },
      tickBacktesting: {
        badge: t("features.tickBacktesting.badge"),
        title: t("features.tickBacktesting.title"),
        description: t("features.tickBacktesting.description"),
        highlights: [
          t("features.tickBacktesting.highlights.0"),
          t("features.tickBacktesting.highlights.1"),
          t("features.tickBacktesting.highlights.2"),
        ],
        cta: t("features.tickBacktesting.cta"),
      },
      aiOptimization: {
        badge: t("features.aiOptimization.badge"),
        title: t("features.aiOptimization.title"),
        description: t("features.aiOptimization.description"),
        highlights: [
          t("features.aiOptimization.highlights.0"),
          t("features.aiOptimization.highlights.1"),
          t("features.aiOptimization.highlights.2"),
        ],
        cta: t("features.aiOptimization.cta"),
      },
      exchangeConnectivity: {
        title: t("features.exchangeConnectivity.title"),
        description: t("features.exchangeConnectivity.description"),
      },
      security: {
        title: t("features.security.title"),
        description: t("features.security.description"),
      },
      community: {
        title: t("features.community.title"),
        description: t("features.community.description"),
      },
    },
  };

  return (
    <section id="features" className="relative">
      {/* Section Header */}
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-12 pb-8">
        <div className="md:text-center max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-500 mb-4">
            {translations.sectionLabel || "Key Features"}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
            {translations.sectionTitle}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {translations.sectionSubtitle}
          </p>
        </div>
      </div>

      {/* Scroll Feature Showcase */}
      <ScrollFeatureShowcase translations={translations} />
    </section>
  );
};

export { FeatureSection };
