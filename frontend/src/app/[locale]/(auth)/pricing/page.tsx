// file: src/app/[locale]/pricing/page.tsx

import React from "react";

import { FaqSection } from "@/components/domain/pricing/FaqSection";
import { PricingCard } from "@/components/domain/pricing/PricingCard";
import { PricingComparisonTable } from "@/components/domain/pricing/PricingComparisonTable";
import { PricingHeroSection } from "@/components/domain/pricing/PricingHeroSection";
import { PricingBackground } from "@/components/domain/pricing/PricingBackground";
import { getTranslations } from "next-intl/server";
import { getPlans } from "@/lib/data/plans";
import { PlanSchema, PlanFeature } from "@/hooks/usePlans";

export default async function PricingPage() {
  const plans = await getPlans();
  const t = await getTranslations("Pricing");
  const tFeatures = await getTranslations("Pricing.planFeatures");
  const tCommon = await getTranslations("Pricing.common");

  const baselineMultiplier = (() => {
    const basicPlan = plans.find((p) => p.price === 0);
    return basicPlan?.creditSurchargeMultiplier || 2.0;
  })();

  const getFeaturesForPlan = (plan: PlanSchema): string[] => {
    const features: string[] = [];
    const planFeatures = plan.features;

    // 월간 보너스 크레딧
    if (plan.monthlyCreditReward > 0) {
      const formattedReward = new Intl.NumberFormat().format(
        plan.monthlyCreditReward
      );
      features.push(
        tFeatures("monthlyCreditReward", {
          value: tCommon("creditReward", { value: formattedReward }),
        })
      );
    }

    // 크레딧 사용 할인율
    const discountRate =
      ((baselineMultiplier - plan.creditSurchargeMultiplier) /
        baselineMultiplier) *
      100;
    if (discountRate > 0) {
      features.push(
        tFeatures("creditSurchargeMultiplier", {
          value: tCommon("creditDiscount", { value: discountRate.toFixed(0) }),
        })
      );
    }

    // 기타 기능들
    features.push(
      tFeatures("maxStrategies", {
        value:
          planFeatures.maxStrategies === -1
            ? tCommon("unlimited")
            : planFeatures.maxStrategies,
      })
    );
    features.push(
      tFeatures("maxCoinsPerBacktest", {
        value:
          planFeatures.maxCoinsPerBacktest === -1
            ? tCommon("unlimited")
            : planFeatures.maxCoinsPerBacktest,
      })
    );

    if (planFeatures.liveBotsLimit === 0) {
      features.push(
        tFeatures("liveBotsLimit", { value: tCommon("notSupported") })
      );
    } else {
      features.push(
        tFeatures("liveBotsLimit", {
          value:
            planFeatures.liveBotsLimit === -1
              ? tCommon("unlimited")
              : planFeatures.liveBotsLimit,
        })
      );
    }

    let timeframeValue = planFeatures.supportedTimeframes;
    if (timeframeValue === "1m,5m,15m,30m,1h,4h,1d,1w,1M") {
      timeframeValue = tCommon("allTimeframes");
    } else if (timeframeValue === "1h,4h,1d") {
      timeframeValue = tCommon("basicTimeframes");
    }
    features.push(tFeatures("supportedTimeframes", { value: timeframeValue }));

    if (planFeatures.communityAccess)
      features.push(tFeatures("communityAccess"));
    if (planFeatures.telegramAlerts) features.push(tFeatures("telegramAlerts"));
    if (planFeatures.advancedFeaturesAccess)
      features.push(tFeatures("advancedFeaturesAccess"));
    if (planFeatures.portfolioBacktestAccess)
      features.push(tFeatures("portfolioBacktestAccess"));

    return features;
  };

  const faqItems = t.raw("faq.items");

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden pb-24">
      {/* 배경 렌더링 */}
      <PricingBackground />

      {/* Main content wrapper */}
      <div className="relative z-0 flex min-h-screen flex-col">
        <div className="p-12"></div>
        {/* 12. props가 없는 Hero 섹션 */}
        <PricingHeroSection />

        <div className="container mx-auto max-w-5xl px-4">
          {/* 플랜 카드 섹션 */}
          <div className="py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {plans.map((plan) => {
                const staticTagline = t(`plans.${plan.name}.tagline`);
                const dynamicFeatures = getFeaturesForPlan(plan);

                return (
                  <PricingCard
                    key={plan.id}
                    planId={plan.id}
                    planName={plan.name}
                    price={plan.price}
                    tagline={staticTagline}
                    features={dynamicFeatures}
                    isFree={plan.price === 0}
                    isHighlighted={plan.name === "Trader"}
                  />
                );
              })}
            </div>
          </div>

          <PricingComparisonTable
            plans={plans}
            isLoading={false} // 서버에서 렌더링되므로 로딩 상태가 아님
            baselineMultiplier={baselineMultiplier}
          />

          {/* FAQ 섹션 */}
          <FaqSection faqItems={faqItems} />
        </div>
      </div>
    </main>
  );
}
