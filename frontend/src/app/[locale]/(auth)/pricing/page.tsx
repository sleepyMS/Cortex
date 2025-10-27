// file: src/app/[locale]/pricing/page.tsx

"use client";

import { FaqSection } from "@/components/domain/pricing/FaqSection";
import { PricingCard } from "@/components/domain/pricing/PricingCard";
import { PricingComparisonTable } from "@/components/domain/pricing/PricingComparisonTable";
import { PricingHeroSection } from "@/components/domain/pricing/PricingHeroSection";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import React from "react";
// 1. usePlans 훅에서 PlanSchema, PlanFeature 타입을 함께 가져옵니다.
import { usePlans, PlanSchema, PlanFeature } from "@/hooks/usePlans";
import { Spinner } from "@/components/ui/Spinner";

// --- 배경 애니메이션 관련 코드 ---
const floatingColors = [
  "rgba(var(--primary-rgb), 0.20)",
  "rgba(var(--accent-rgb), 0.25)",
  "rgba(179, 229, 252, 0.20)",
  "rgba(255, 204, 255, 0.20)",
  "rgba(255, 255, 153, 0.15)",
];

function getRandom(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function createFloatingElements(
  count: number,
  isBlob: boolean = false
): JSX.Element[] {
  const elements: JSX.Element[] = [];
  for (let i = 0; i < count; i++) {
    const size = isBlob ? getRandom(250, 600) : getRandom(50, 100);
    const x = getRandom(-20, 120);
    const y = getRandom(-20, 120);
    const color =
      floatingColors[Math.floor(Math.random() * floatingColors.length)];
    const duration = getRandom(25, 45);
    const delay = getRandom(0, 15);
    const direction = Math.random() > 0.5 ? "normal" : "reverse";
    const blurClass = isBlob ? "blur-xl" : "";

    elements.push(
      <div
        key={i}
        className={`absolute rounded-full ${blurClass}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          top: `${y}%`,
          left: `${x}%`,
          animation: `float ${duration}s ease-in-out infinite ${delay}s ${direction}`,
          opacity: isBlob ? 0.3 : 0.35,
          willChange: "transform",
          zIndex: -1,
        }}
      />
    );
  }
  return elements;
}
// --- 배경 애니메이션 코드 끝 ---

export default function PricingPage() {
  const t = useTranslations("Pricing");
  const tFeatures = useTranslations("Pricing.planFeatures");
  const tCommon = useTranslations("Pricing.common");

  const { data: plans, isLoading } = usePlans();
  const faqItems = t.raw("faq.items");

  // 2. 할인율 계산의 기준이 되는 Basic 플랜의 부가율(2.0)을
  //    하드코딩하지 않고 API 응답에서 동적으로 찾습니다.
  const baselineMultiplier = useMemo(() => {
    // price: 0 (무료)인 플랜을 Basic 플랜으로 간주합니다.
    const basicPlan = plans?.find((p) => p.price === 0);
    if (basicPlan && basicPlan.creditSurchargeMultiplier > 0) {
      return basicPlan.creditSurchargeMultiplier;
    }
    // 만약의 사태(API 로드 실패 등)를 대비한 기본값
    return 2.0;
  }, [plans]); // plans 데이터가 로드되면 이 값은 재계산됩니다.

  // API 데이터와 i18n 템플릿을 조합해 동적 기능 목록을 생성하는 함수
  const getFeaturesForPlan = (plan: PlanSchema): string[] => {
    const features: string[] = [];
    const planFeatures = plan.features; // { maxStrategies: 3, ... }

    // --- 월간 보너스 크레딧 ---
    if (plan.monthlyCreditReward > 0) {
      // API에서 받은 숫자(예: 3000)를 포맷팅 (예: "3,000")
      const formattedReward = new Intl.NumberFormat().format(
        plan.monthlyCreditReward
      );
      // "월간 보너스 크레딧: {value}" 템플릿에
      // "{value}C 지급" 템플릿을 조합하여 삽입
      features.push(
        tFeatures("monthlyCreditReward", {
          value: tCommon("creditReward", { value: formattedReward }),
        })
      );
    }

    // --- 크레딧 사용 할인율 ---
    const discountRate =
      ((baselineMultiplier - plan.creditSurchargeMultiplier) /
        baselineMultiplier) *
      100;

    // 0% 초과일 때만 표시 (Basic은 0%라 표시 안 됨)
    if (discountRate > 0) {
      features.push(
        tFeatures("creditSurchargeMultiplier", {
          value: tCommon("creditDiscount", { value: discountRate.toFixed(0) }),
        })
      );
    }

    // --- 나머지 기능들 (기존과 동일) ---
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

    if (planFeatures.communityAccess) {
      features.push(tFeatures("communityAccess"));
    }
    if (planFeatures.telegramAlerts) {
      features.push(tFeatures("telegramAlerts"));
    }
    if (planFeatures.advancedFeaturesAccess) {
      features.push(tFeatures("advancedFeaturesAccess"));
    }
    if (planFeatures.portfolioBacktestAccess) {
      features.push(tFeatures("portfolioBacktestAccess"));
    }

    return features;
  };

  const floatingCircles = useMemo(() => createFloatingElements(15, false), []);
  const floatingBlobs = useMemo(() => createFloatingElements(5, true), []);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Animated Aurora Background */}
      <div className="absolute inset-0 -z-20">
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(100,50,200,0.5),rgba(255,255,255,0))] animate-[spin_20s_linear_infinite]"></div>
        <div className="absolute bottom-[-40%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(80,40,180,0.55),rgba(255,255,255,0))] animate-[spin_25s_linear_infinite_reverse]"></div>
      </div>

      {/* Floating Circles and Blobs Overlay */}
      <div className="absolute inset-0 -z-10">
        {floatingCircles}
        {floatingBlobs}
      </div>

      {/* Main content wrapper */}
      <div className="relative z-0 flex min-h-screen flex-col">
        <div className="p-12"></div>
        {/* Hero 섹션 (props 없음) */}
        <PricingHeroSection />

        <div className="container mx-auto max-w-5xl px-4">
          {/* 플랜 카드 섹션 */}
          <div className="py-16">
            {/* 로딩 상태 처리 */}
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Spinner size="lg" />
              </div>
            ) : (
              // API 데이터를 기반으로 동적 렌더링
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {plans?.map((plan) => {
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
            )}
          </div>

          {/* 기능 상세 비교 테이블 섹션 (동적 baselineMultiplier 전달) */}
          <PricingComparisonTable
            plans={plans}
            isLoading={isLoading}
            baselineMultiplier={baselineMultiplier}
          />

          {/* FAQ 섹션 */}
          <FaqSection faqItems={faqItems} />
        </div>
        <div className="p-12"></div>
      </div>
    </main>
  );
}
