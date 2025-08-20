// file: src/app/[locale]/pricing/page.tsx

"use client";

import { FaqSection } from "@/components/domain/pricing/FaqSection";
import { PricingCard } from "@/components/domain/pricing/PricingCard";
import { PricingComparisonTable } from "@/components/domain/pricing/PricingComparisonTable";
import { PricingHeroSection } from "@/components/domain/pricing/PricingHeroSection";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function PricingPage() {
  const [isMonthly, setIsMonthly] = useState(true);
  const t = useTranslations("Pricing");

  const handleSelectPeriod = (isMonthly: boolean) => {
    setIsMonthly(isMonthly);
  };

  const pricingData = t.raw("data.plans");
  const faqItems = t.raw("data.faq.items");

  return (
    <main className="flex min-h-screen flex-col">
      <div className="p-12"></div>
      {/* 1. 가격 페이지 헤더 섹션 */}
      <PricingHeroSection
        isMonthlySelected={isMonthly}
        onSelectPeriod={handleSelectPeriod}
      />

      {/* 2. 모든 콘텐츠를 감싸는 컨테이너: 너비 통일 */}
      <div className="container mx-auto max-w-5xl px-4">
        {/* 플랜 카드 섹션 */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            <PricingCard
              planName={pricingData.basic.planName}
              tagline={pricingData.basic.tagline}
              features={pricingData.basic.features}
              price={
                isMonthly
                  ? pricingData.basic.price.monthly
                  : pricingData.basic.price.yearly
              }
              isFree
            />
            <PricingCard
              planName={pricingData.trader.planName}
              tagline={pricingData.trader.tagline}
              features={pricingData.trader.features}
              price={
                isMonthly
                  ? pricingData.trader.price.monthly
                  : pricingData.trader.price.yearly
              }
              isHighlighted
            />
            <PricingCard
              planName={pricingData.pro.planName}
              tagline={pricingData.pro.tagline}
              features={pricingData.pro.features}
              price={
                isMonthly
                  ? pricingData.pro.price.monthly
                  : pricingData.pro.price.yearly
              }
            />
          </div>
        </div>

        {/* 기능 상세 비교 테이블 섹션 */}
        <PricingComparisonTable />

        {/* FAQ 섹션 통합 */}
        <FaqSection faqItems={faqItems} />
      </div>
      <div className="p-12"></div>
    </main>
  );
}
