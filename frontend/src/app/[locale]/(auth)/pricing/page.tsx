// file: src/app/[locale]/pricing/page.tsx

"use client";

import { FaqSection } from "@/components/domain/pricing/FaqSection";
import { PricingCard } from "@/components/domain/pricing/PricingCard";
import { PricingComparisonTable } from "@/components/domain/pricing/PricingComparisonTable";
import { PricingHeroSection } from "@/components/domain/pricing/PricingHeroSection";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import React from "react";
import { usePlans, PlanFeature } from "@/hooks/usePlans"; // 👈 1. API 호출 훅 및 타입 임포트
import { Spinner } from "@/components/ui/Spinner"; // 👈 2. 로딩 스피너 임포트

// --- 배경 애니메이션 관련 코드 (기존과 동일) ---
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
  // 3. 월/연간 토글 관련 state 및 핸들러 제거

  // 4. i18n 훅을 최상위에서 호출
  const t = useTranslations("Pricing");
  const tFeatures = useTranslations("Pricing.planFeatures");
  const tCommon = useTranslations("Pricing.common");

  // 5. API로부터 플랜 데이터를 동적으로 가져옵니다.
  const { data: plans, isLoading } = usePlans();

  // 6. i18n에서 정적 데이터(FAQ)를 로드합니다.
  const faqItems = t.raw("faq.items");

  // 7. API 데이터와 i18n 템플릿을 조합해 동적 기능 목록을 생성하는 함수
  const getFeaturesForPlan = (planFeatures: PlanFeature): string[] => {
    const features: string[] = [];

    // maxStrategies
    features.push(
      tFeatures("maxStrategies", {
        value:
          planFeatures.maxStrategies === -1
            ? tCommon("unlimited")
            : planFeatures.maxStrategies,
      })
    );

    // maxCoinsPerBacktest
    features.push(
      tFeatures("maxCoinsPerBacktest", {
        value:
          planFeatures.maxCoinsPerBacktest === -1
            ? tCommon("unlimited")
            : planFeatures.maxCoinsPerBacktest,
      })
    );

    // liveBotsLimit
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

    // supportedTimeframes
    let timeframeValue = planFeatures.supportedTimeframes;
    // (이 값들은 plan_service.py의 시딩 데이터와 일치해야 함)
    if (timeframeValue === "1m,5m,15m,30m,1h,4h,1d,1w,1M") {
      timeframeValue = tCommon("allTimeframes");
    } else if (timeframeValue === "1h,4h,1d") {
      timeframeValue = tCommon("basicTimeframes");
    }
    features.push(tFeatures("supportedTimeframes", { value: timeframeValue }));

    // Booleans (i18n 파일에 정의된 순서대로)
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

  // 8. 배경 애니메이션 메모이제이션 (기존과 동일)
  const floatingCircles = useMemo(() => createFloatingElements(15, false), []);
  const floatingBlobs = useMemo(() => createFloatingElements(5, true), []);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Animated Aurora Background (기존과 동일) */}
      <div className="absolute inset-0 -z-20">
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(100,50,200,0.5),rgba(255,255,255,0))] animate-[spin_20s_linear_infinite]"></div>
        <div className="absolute bottom-[-40%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(80,40,180,0.55),rgba(255,255,255,0))] animate-[spin_25s_linear_infinite_reverse]"></div>
      </div>

      {/* Floating Circles and Blobs Overlay (기존과 동일) */}
      <div className="absolute inset-0 -z-10">
        {floatingCircles}
        {floatingBlobs}
      </div>

      {/* Main content wrapper */}
      <div className="relative z-0 flex min-h-screen flex-col">
        <div className="p-12"></div>

        {/* 9. 월/연간 토글 props가 제거된 Hero 섹션 */}
        <PricingHeroSection />

        <div className="container mx-auto max-w-5xl px-4">
          {/* 플랜 카드 섹션 */}
          <div className="py-16">
            {/* 10. 로딩 상태 처리 */}
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Spinner size="lg" />
              </div>
            ) : (
              // 11. API 데이터를 기반으로 동적 렌더링
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {plans?.map((plan) => {
                  // 12. API 데이터와 i18n 정적/동적 데이터 결합
                  const staticTagline = t(`plans.${plan.name}.tagline`);
                  const dynamicFeatures = getFeaturesForPlan(plan.features);

                  return (
                    <PricingCard
                      key={plan.id}
                      planId={plan.id} // 👈 [Dynamic] DB의 고유 UUID
                      planName={plan.name} // 👈 [Dynamic] DB의 이름 ("Basic", "Trader", "Pro")
                      price={plan.price} // 👈 [Dynamic] DB의 가격 (숫자)
                      tagline={staticTagline} // 👈 [Static] i18n의 태그라인
                      features={dynamicFeatures} // 👈 [Dynamic] 조합된 기능 목록
                      isFree={plan.price === 0}
                      isHighlighted={plan.name === "Trader"}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* 13. 기능 상세 비교 테이블 섹션 (API 데이터 전달) */}
          <PricingComparisonTable plans={plans} isLoading={isLoading} />

          {/* 14. FAQ 섹션 (i18n 기반으로 기존과 동일하게 작동) */}
          <FaqSection faqItems={faqItems} />
        </div>
        <div className="p-12"></div>
      </div>
    </main>
  );
}
