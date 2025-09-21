// file: src/app/[locale]/pricing/page.tsx

"use client";

import { FaqSection } from "@/components/domain/pricing/FaqSection";
import { PricingCard } from "@/components/domain/pricing/PricingCard";
import { PricingComparisonTable } from "@/components/domain/pricing/PricingComparisonTable";
import { PricingHeroSection } from "@/components/domain/pricing/PricingHeroSection";
import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import React from "react";

// HeroSection.tsx에서 가져온 배경 애니메이션 관련 코드
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

export default function PricingPage() {
  const [isMonthly, setIsMonthly] = useState(true);
  const t = useTranslations("Pricing");

  const handleSelectPeriod = (isMonthly: boolean) => {
    setIsMonthly(isMonthly);
  };

  const pricingData = t.raw("data.plans");
  const faqItems = t.raw("data.faq.items");

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

      {/* Main content wrapper with higher z-index */}
      <div className="relative z-0 flex min-h-screen flex-col">
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
                planId="7a7e9191-6af0-4200-97df-c14bb02cfe13"
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
                planId="89628f4b-fd31-47f2-bbb4-f62c077ab0c3"
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
                planId="e858fdc8-217a-47eb-93a6-0921123d8bf4"
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
      </div>
    </main>
  );
}
