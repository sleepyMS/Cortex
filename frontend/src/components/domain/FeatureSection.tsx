// file: frontend/src/components/domain/FeatureSection.tsx

import { getTranslations } from "next-intl/server";
import React from "react";
import { FeatureBentoGrid } from "./FeatureBentoGrid";

// async 함수로 서버에서 번역 텍스트를 가져옴
const FeatureSection = async () => {
  const t = await getTranslations("Landing.FeatureSection");

  // 번역 데이터를 클라이언트 컴포넌트에 전달
  const translations = {
    sectionTitle: t("sectionTitle"),
    sectionSubtitle: t("sectionSubtitle"),
    features: {
      strategyBuilder: {
        title: t("features.strategyBuilder.title"),
        description: t("features.strategyBuilder.description"),
      },
      tickBacktesting: {
        title: t("features.tickBacktesting.title"),
        description: t("features.tickBacktesting.description"),
      },
      aiOptimization: {
        title: t("features.aiOptimization.title"),
        description: t("features.aiOptimization.description"),
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
    <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:px-12">
      <div className="mb-20 md:text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
          {translations.sectionTitle}
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {translations.sectionSubtitle}
        </p>
      </div>

      <FeatureBentoGrid translations={translations} />
    </section>
  );
};

export { FeatureSection };
