// file: frontend/src/components/domain/PricingComparisonTable.tsx

"use client";

import { useTranslations } from "next-intl";
import { Check, X, Code, BarChart3, Bot, Users, Zap } from "lucide-react";

// 기능 분류 항목을 정의하는 데이터
const featureCategories = [
  {
    category: "전략 구성",
    icon: <Code />,
    features: [
      {
        name: "전략당 투자 가능 코인 수",
        basic: "1개 (단일 자산)",
        trader: "최대 5개 (자산 분배)",
        pro: "무제한 (포트폴리오)",
      },
      {
        name: "TP/SL (손익절) 방식",
        basic: "고정 %만 가능",
        trader: "고정 % + ATR 기반",
        pro: "고정 % + ATR 기반",
      },
      {
        name: "저장 가능한 전략 개수",
        basic: "3개",
        trader: "20개",
        pro: "무제한",
      },
      {
        name: "사용 가능 지표",
        basic: "기본 지표 (10종)",
        trader: "모든 지표 (50+종)",
        pro: "모든 지표 (50+종)",
      },
    ],
  },
  {
    category: "백테스팅",
    icon: <BarChart3 />,
    features: [
      {
        name: "사용 가능 타임프레임",
        basic: "1시간(1h) 봉만",
        trader: "모든 타임프레임",
        pro: "모든 타임프레임",
      },
      {
        name: "일일 백테스팅 횟수",
        basic: "10회",
        trader: "100회",
        pro: "무제한",
      },
    ],
  },
  {
    category: "자동매매",
    icon: <Bot />,
    features: [
      { name: "라이브 봇 (실거래)", basic: false, trader: "3개", pro: "10개" },
    ],
  },
  {
    category: "커뮤니티",
    icon: <Users />,
    features: [
      {
        name: "전략 마켓플레이스 이용",
        basic: false,
        trader: "구매/판매 가능",
        pro: "구매/판매 가능",
      },
      {
        name: "리더보드 & 공개 프로필",
        basic: "조회만 가능",
        trader: "참여 가능",
        pro: "참여 가능",
      },
    ],
  },
  {
    category: "고급 기능",
    icon: <Zap />,
    features: [
      {
        name: "워크 포워드 & 몬테카를로",
        basic: false,
        trader: false,
        pro: true,
      },
      { name: "포트폴리오 백테스팅", basic: false, trader: false, pro: true },
      { name: "고급 자금 관리 모델", basic: false, trader: false, pro: true },
      {
        name: "고급 알림 (텔레그램, 디스코드)",
        basic: false,
        trader: "제한적 사용",
        pro: "무제한 사용",
      },
    ],
  },
];

const renderValue = (value: string | boolean) => {
  if (value === true) {
    return <Check className="text-green-400 text-2xl" />;
  }
  if (value === false) {
    return <X className="text-red-500 text-xl" />;
  }
  return value;
};

export const PricingComparisonTable = () => {
  const t = useTranslations("Pricing");

  return (
    <div className="w-full overflow-x-auto">
      <div className="container mx-auto max-w-5xl py-12">
        {/* 테이블 헤더 - 데스크톱용 */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 mb-6 text-xl font-bold border-b border-gray-700 pb-4 sticky top-0 bg-background z-10">
          <div className="text-gray-400">기능</div>
          <div className="text-center">Basic</div>
          <div className="text-center">Trader</div>
          <div className="text-center text-primary">Pro</div>
        </div>

        {/* 기능별 목록 */}
        {featureCategories.map((category, catIndex) => (
          <div key={catIndex} className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 border-l-4 border-primary pl-4">
              {category.icon} {category.category}
            </h3>
            <div className="space-y-2">
              {category.features.map((feature, featIndex) => (
                <div
                  key={featIndex}
                  className="grid grid-cols-[1fr] md:grid-cols-[2fr_1fr_1fr_1fr] items-center p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="font-semibold text-gray-200">
                    {feature.name}
                  </div>
                  <div className="flex justify-between md:justify-center items-center md:text-center text-gray-400 md:col-span-1 border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                    <span className="md:hidden font-bold">Basic:</span>
                    {renderValue(feature.basic)}
                  </div>
                  <div className="flex justify-between md:justify-center items-center md:text-center text-gray-400 md:col-span-1 border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                    <span className="md:hidden font-bold">Trader:</span>
                    {renderValue(feature.trader)}
                  </div>
                  <div className="flex justify-between md:justify-center items-center md:text-center text-primary font-bold md:col-span-1 border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                    <span className="md:hidden font-bold">Pro:</span>
                    {renderValue(feature.pro)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
