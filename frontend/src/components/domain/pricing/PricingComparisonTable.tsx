// file: frontend/src/components/domain/PricingComparisonTable.tsx

"use client";

import { useTranslations } from "next-intl";
import { Check, X, Code, BarChart3, Bot, Users, Zap } from "lucide-react";
import React, { useMemo } from "react";
import { Spinner } from "@/components/ui/Spinner";

// --- 1. Plan 스키마 타입 정의 (usePlans.ts와 동일하게) ---
interface PlanFeature {
  maxStrategies: number;
  maxCoinsPerBacktest: number;
  liveBotsLimit: number;
  supportedTimeframes: string;
  communityAccess: boolean;
  telegramAlerts: boolean;
  advancedFeaturesAccess: boolean;
  portfolioBacktestAccess: boolean;
}

interface PlanSchema {
  id: string;
  name: "Basic" | "Trader" | "Pro";
  price: number;
  features: PlanFeature;
}

// --- 2. 컴포넌트 Props 타입 정의 ---
interface PricingComparisonTableProps {
  plans: PlanSchema[] | undefined;
  isLoading: boolean;
}

export const PricingComparisonTable = ({
  plans,
  isLoading,
}: PricingComparisonTableProps) => {
  // 👈 3. 두 개의 t 함수를 올바른 범위로 가져옵니다.
  const t = useTranslations("Pricing.comparison");
  const tCommon = useTranslations("Pricing.common"); // 👈 [수정] 'common' 범위 추가

  const featureCategories = t.raw("categories");

  // --- 4. API로 받은 plans 데이터를 이름별로 빠르게 찾기 위한 Map 생성 ---
  const planFeatureMap = useMemo(() => {
    const map: Record<string, PlanFeature | undefined> = {
      Basic: undefined,
      Trader: undefined,
      Pro: undefined,
    };
    if (plans) {
      for (const plan of plans) {
        map[plan.name] = plan.features;
      }
    }
    return map;
  }, [plans]);

  // --- (아이콘 맵 - 기존과 동일) ---
  const iconMap: Record<string, JSX.Element> = {
    "전략 구성": <Code className="h-6 w-6" />,
    백테스팅: <BarChart3 className="h-6 w-6" />,
    자동매매: <Bot className="h-6 w-6" />,
    커뮤니티: <Users className="h-6 w-6" />,
    "고급 기능": <Zap className="h-6 w-6" />,
    "Strategy Building": <Code className="h-6 w-6" />,
    Backtesting: <BarChart3 className="h-6 w-6" />,
    "Automated Trading": <Bot className="h-6 w-6" />,
    Community: <Users className="h-6 w-6" />,
    "Advanced Features": <Zap className="h-6 w-6" />,
  };

  // --- 5. [수정] renderValue 함수가 'key'를 받도록 개선 ---
  const renderValue = (
    value: string | number | boolean | undefined,
    featureKey: keyof PlanFeature // 👈 'key'를 받아 로직을 분기
  ) => {
    // 1. Boolean 값 처리 (가장 빠름)
    if (value === true) {
      return <Check className="text-green-400 text-2xl" />;
    }
    if (value === false) {
      return <X className="text-red-500 text-xl" />;
    }
    // 2. Undefined/Null 값 처리
    if (value === undefined || value === null) {
      return <span className="text-muted-foreground">-</span>;
    }

    // 3. 'key'에 따른 동적 포맷팅
    switch (featureKey) {
      // 3-1. 타임프레임 포맷팅
      case "supportedTimeframes":
        // (이 값들은 plan_service.py의 시딩 데이터와 일치해야 함)
        if (value === "1m,5m,15m,30m,1h,4h,1d,1w,1M") {
          return tCommon("allTimeframes"); // 👈 올바른 t 함수 사용
        }
        if (value === "1h,4h,1d") {
          return tCommon("basicTimeframes"); // 👈 올바른 t 함수 사용
        }
        return String(value); // 그 외의 경우

      // 3-2. 수량/제한 포맷팅
      case "maxStrategies":
      case "maxCoinsPerBacktest":
      case "liveBotsLimit":
        if (value === -1 || value === 999999) {
          // -1을 '무제한'으로 가정
          return tCommon("unlimited"); // 👈 올바른 t 함수 사용
        }
        if (value === 0) {
          return tCommon("notSupported"); // 👈 '미지원' 키 사용
        }
        return tCommon("countUnit", { value: value }); // 👈 "{value}개" 템플릿 사용

      // 3-3. 그 외의 모든 값 (숫자, 문자열)
      default:
        return String(value);
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="container mx-auto max-w-5xl py-12">
        {/* 테이블 헤더 (기존과 동일) */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 mb-6 text-xl font-bold border-b border-border pb-4 sticky top-0 z-10">
          <div className="text-muted-foreground">
            {t("tableHeader.features")}
          </div>
          <div className="text-center text-muted-foreground">
            {t("basicLabel")}
          </div>
          <div className="text-center text-muted-foreground">
            {t("traderLabel")}
          </div>
          <div className="text-center text-primary">{t("proLabel")}</div>
        </div>

        {/* --- 6. 로딩 상태 처리 (기존과 동일) --- */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        )}

        {/* --- 7. 동적 데이터 렌더링 --- */}
        {!isLoading &&
          plans &&
          featureCategories.map((category: any, catIndex: number) => (
            <div key={catIndex} className="mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3 border-l-4 border-primary pl-4">
                {iconMap[category.category as keyof typeof iconMap]}{" "}
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.features.map((feature: any, featIndex: number) => {
                  // 8. i18n의 'key'를 사용해 DB feature 객체에 접근
                  const featureKey = feature.key as keyof PlanFeature;
                  const basicValue = planFeatureMap.Basic?.[featureKey];
                  const traderValue = planFeatureMap.Trader?.[featureKey];
                  const proValue = planFeatureMap.Pro?.[featureKey];

                  return (
                    <div
                      key={featIndex}
                      className="grid grid-cols-[1fr] md:grid-cols-[2fr_1fr_1fr_1fr] items-center p-4 rounded-xl bg-card border border-border"
                    >
                      <div className="font-semibold text-foreground">
                        {feature.name}
                      </div>
                      <div className="flex justify-between md:justify-center items-center md:text-center text-muted-foreground md:col-span-1 border-t md:border-t-0 border-border pt-2 md:pt-0">
                        <span className="md:hidden font-bold text-foreground">
                          {t("basicLabel")}:
                        </span>
                        {/* 👈 [수정] renderValue에 featureKey 전달 */}
                        {renderValue(basicValue, featureKey)}
                      </div>
                      <div className="flex justify-between md:justify-center items-center md:text-center text-muted-foreground md:col-span-1 border-t md:border-t-0 border-border pt-2 md:pt-0">
                        <span className="md:hidden font-bold text-foreground">
                          {t("traderLabel")}:
                        </span>
                        {/* 👈 [수정] renderValue에 featureKey 전달 */}
                        {renderValue(traderValue, featureKey)}
                      </div>
                      <div className="flex justify-between md:justify-center items-center md:text-center text-primary font-bold md:col-span-1 border-t md:border-t-0 border-border pt-2 md:pt-0">
                        <span className="md:hidden font-bold text-foreground">
                          {t("proLabel")}:
                        </span>
                        {/* 👈 [수정] renderValue에 featureKey 전달 */}
                        {renderValue(proValue, featureKey)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
