// file: src/app/[locale]/pricing/page.tsx

"use client";

import { FaqSection } from "@/components/domain/pricing/FaqSection";
import { PricingCard } from "@/components/domain/pricing/PricingCard";
import { PricingComparisonTable } from "@/components/domain/pricing/PricingComparisonTable";
import { PricingHeroSection } from "@/components/domain/pricing/PricingHeroSection";
import { useState } from "react";

// 가격 정보를 중앙에서 관리하는 데이터 객체
const pricingData = {
  monthly: {
    basic: {
      price: "Free",
      features: [
        "기본 백테스팅 (10회/일)",
        "단일 자산 전략 (1개)",
        "기본 지표 (10종)",
        "고정 % 손익절",
      ],
    },
    trader: {
      price: "$49.99",
      features: [
        "고급 백테스팅 (100회/일)",
        "자산 분배 전략 (최대 5개)",
        "모든 지표 (50+종)",
        "ATR 기반 손익절",
        "라이브 봇 3개",
        "전략 마켓플레이스 참여",
      ],
    },
    pro: {
      price: "$129.99",
      features: [
        "무제한 백테스팅",
        "포트폴리오 전략 (무제한)",
        "모든 지표",
        "고급 손익절",
        "라이브 봇 10개",
        "전략 마켓플레이스 참여",
        "워크 포워드 & 몬테카를로 분석",
      ],
    },
  },
  yearly: {
    basic: {
      price: "Free",
      features: [
        "기본 백테스팅 (10회/일)",
        "단일 자산 전략 (1개)",
        "기본 지표 (10종)",
        "고정 % 손익절",
      ],
    },
    trader: {
      price: "$499.99",
      features: [
        "고급 백테스팅 (100회/일)",
        "자산 분배 전략 (최대 5개)",
        "모든 지표 (50+종)",
        "ATR 기반 손익절",
        "라이브 봇 3개",
        "전략 마켓플레이스 참여",
      ],
    },
    pro: {
      price: "$1299.99",
      features: [
        "무제한 백테스팅",
        "포트폴리오 전략 (무제한)",
        "모든 지표",
        "고급 손익절",
        "라이브 봇 10개",
        "전략 마켓플레이스 참여",
        "워크 포워드 & 몬테카를로 분석",
      ],
    },
  },
};

const faqItems = [
  {
    question: "구독 플랜은 어떻게 변경하나요?",
    answer:
      "설정 페이지의 '구독 관리' 탭에서 언제든지 플랜을 변경하거나 취소할 수 있습니다.",
  },
  {
    question: "무료 플랜도 라이브 봇을 사용할 수 있나요?",
    answer:
      "아니요, 라이브 봇은 Trader 또는 Pro 플랜 사용자에게만 제공되는 기능입니다. 백테스팅으로 검증된 전략을 실거래에 적용하려면 유료 플랜을 구독해야 합니다.",
  },
  {
    question: "결제는 어떤 방식으로 이루어지나요?",
    answer:
      "저희 서비스는 Stripe(해외) 또는 아임포트(국내)와 같은 결제 게이트웨이를 통해 안전하게 결제를 처리합니다.",
  },
  {
    question: "구독을 취소하면 데이터는 어떻게 되나요?",
    answer:
      "구독을 취소하더라도 계정 및 백테스팅 기록, 전략 등은 유지됩니다. 다만, 플랜에 따라 일부 기능(예: 라이브 봇 실행)은 중단될 수 있습니다.",
  },
];

export default function PricingPage() {
  const [isMonthly, setIsMonthly] = useState(true);

  // 선택된 기간에 따라 상태를 업데이트하는 함수
  const handleSelectPeriod = (isMonthly: boolean) => {
    setIsMonthly(isMonthly);
  };

  const currentPrices = isMonthly ? pricingData.monthly : pricingData.yearly;

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
              planName="Basic"
              price={currentPrices.basic.price}
              features={currentPrices.basic.features}
              isFree
            />
            <PricingCard
              planName="Trader"
              price={currentPrices.trader.price}
              features={currentPrices.trader.features}
            />
            <PricingCard
              planName="Pro"
              price={currentPrices.pro.price}
              features={currentPrices.pro.features}
              isHighlighted
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
