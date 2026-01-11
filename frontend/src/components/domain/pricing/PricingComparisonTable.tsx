// file: frontend/src/components/domain/PricingComparisonTable.tsx

"use client";

import { useTranslations } from "next-intl";
import {
  Check,
  X,
  Code,
  BarChart3,
  Bot,
  Users,
  Zap,
  Sparkles, // 👈 크레딧 혜택 아이콘 추가
} from "lucide-react";
import React, { useMemo } from "react";
import { Spinner } from "@/components/ui/Spinner";

// --- 1. Plan 스키마 타입 정의 (usePlans.ts와 동일하게) ---
// (types/api.ts 파일이 없으므로 여기에 직접 정의합니다)
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
  creditSurchargeMultiplier: number;
  monthlyCreditReward: number;
}

// --- 2. 컴포넌트 Props 타입 정의 (baselineMultiplier 추가) ---
interface PricingComparisonTableProps {
  plans: PlanSchema[] | undefined;
  isLoading: boolean;
  baselineMultiplier: number;
}

export const PricingComparisonTable = ({
  plans,
  isLoading,
  baselineMultiplier,
}: PricingComparisonTableProps) => {
  // 3. i18n 훅을 올바른 범위로 분리
  const t = useTranslations("Pricing.comparison");
  const tCommon = useTranslations("Pricing.common");

  const featureCategories = t.raw("categories");

  // 4. API로 받은 plans 객체 전체를 이름별로 매핑
  const planMap = useMemo(() => {
    const map: Record<string, PlanSchema | undefined> = {
      Basic: undefined,
      Trader: undefined,
      Pro: undefined,
    };
    if (plans) {
      for (const plan of plans) {
        map[plan.name] = plan; // Plan 객체 전체를 저장
      }
    }
    return map;
  }, [plans]);

  // 5. 아이콘 맵 (크레딧 혜택 추가)
  const iconMap: Record<string, JSX.Element> = {
    "전략 구성": <Code className="h-6 w-6" />,
    백테스팅: <BarChart3 className="h-6 w-6" />,
    자동매매: <Bot className="h-6 w-6" />,
    커뮤니티: <Users className="h-6 w-6" />,
    "고급 기능": <Zap className="h-6 w-6" />,
    "크레딧 혜택": <Sparkles className="h-6 w-6" />,
    "Strategy Building": <Code className="h-6 w-6" />,
    Backtesting: <BarChart3 className="h-6 w-6" />,
    "Automated Trading": <Bot className="h-6 w-6" />,
    Community: <Users className="h-6 w-6" />,
    "Advanced Features": <Zap className="h-6 w-6" />,
    "Credit Benefits": <Sparkles className="h-6 w-6" />,
  };

  // --- 6. renderValue 함수: 동적 포맷팅 로직 ---
  const renderValue = (
    plan: PlanSchema | undefined,
    featureKey: string // i18n에서 받은 key (e.g., "maxStrategies")
  ) => {
    // 플랜 데이터가 없으면 "-"
    if (!plan) {
      return <span className="text-muted-foreground">-</span>;
    }

    // 7. key가 PlanSchema 최상위에 있는지 확인
    if (
      featureKey === "creditSurchargeMultiplier" ||
      featureKey === "monthlyCreditReward"
    ) {
      if (featureKey === "monthlyCreditReward") {
        if (plan.monthlyCreditReward === 0) {
          return tCommon("notSupported"); // "미지원"
        }
        const formattedReward = new Intl.NumberFormat().format(
          plan.monthlyCreditReward
        );
        // "3,000C 지급"
        return tCommon("creditReward", { value: formattedReward });
      }

      if (featureKey === "creditSurchargeMultiplier") {
        // props로 받은 동적 baselineMultiplier 사용
        const discountRate =
          ((baselineMultiplier - plan.creditSurchargeMultiplier) /
            baselineMultiplier) *
          100;
        if (discountRate === 0) {
          return <span className="text-muted-foreground">0%</span>;
        }
        // "25% 할인"
        return tCommon("creditDiscount", { value: discountRate.toFixed(0) });
      }
    }

    // 8. key가 중첩된 features 객체 내부에 있는지 확인
    // key를 PlanFeature의 키로 타입 단언
    const key = featureKey as keyof PlanFeature;
    if (key in plan.features) {
      const value = plan.features[key];

      switch (key) {
        case "supportedTimeframes":
          const tf = String(value);
          if (tf === "1m,5m,15m,30m,1h,4h,1d,1w,1M") {
            return tCommon("allTimeframes"); // "모든 타임프레임"
          }
          if (tf === "1h,4h,1d") {
            return tCommon("basicTimeframes"); // "1h, 4h, 1d"
          }
          return tf;

        case "maxStrategies":
        case "maxCoinsPerBacktest":
        case "liveBotsLimit":
          if (value === -1 || value === 999999) {
            return tCommon("unlimited"); // "무제한"
          }
          if (value === 0) {
            return tCommon("notSupported"); // "미지원"
          }
          return tCommon("countUnit", { value: value }); // "{value}개"

        case "communityAccess":
        case "telegramAlerts":
        case "advancedFeaturesAccess":
        case "portfolioBacktestAccess":
          if (value === true) {
            return <Check className="text-green-400 text-2xl" />;
          }
          if (value === false) {
            return <X className="text-red-500 text-xl" />;
          }
          break; // 알 수 없는 boolean 값일 경우 default로
      }
      return String(value); // 그 외
    }

    // 9. 키를 어디에서도 찾지 못한 경우
    return <span className="text-muted-foreground">?</span>;
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="container mx-auto max-w-5xl py-12">
        {/* Glass Pane Wrapper - backdrop-blur 제거하고 반투명 배경 사용 (성능 ↑↑) */}
        <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/90 dark:bg-black/70 p-6 md:p-8 shadow-2xl">
          {/* 테이블 헤더 */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 mb-6 text-xl font-bold border-b border-black/5 dark:border-white/10 pb-4 sticky top-0 z-10">
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

          {/* 로딩 상태 처리 */}
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Spinner size="lg" />
            </div>
          )}

          {/* 동적 데이터 렌더링 */}
          {!isLoading &&
            plans &&
            featureCategories.map((category: any, catIndex: number) => (
              <div key={catIndex} className="mb-8 last:mb-0">
                <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3 border-l-4 border-primary pl-4">
                  {iconMap[category.category as keyof typeof iconMap]}{" "}
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.features.map((feature: any, featIndex: number) => {
                    // i18n의 'key' (e.g., "maxStrategies")
                    const featureKey = feature.key;
                    // API 데이터 (e.g., PlanSchema for "Basic")
                    const basicPlan = planMap.Basic;
                    const traderPlan = planMap.Trader;
                    const proPlan = planMap.Pro;

                    return (
                      <div
                        key={featIndex}
                        className="grid grid-cols-[1fr] md:grid-cols-[2fr_1fr_1fr_1fr] items-center p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      >
                        <div className="font-semibold text-foreground">
                          {feature.name}
                        </div>
                        <div className="flex justify-between md:justify-center items-center md:text-center text-muted-foreground md:col-span-1 border-t md:border-t-0 border-black/5 dark:border-white/10 pt-2 md:pt-0">
                          <span className="md:hidden font-bold text-foreground">
                            {t("basicLabel")}:
                          </span>
                          {renderValue(basicPlan, featureKey)}
                        </div>
                        <div className="flex justify-between md:justify-center items-center md:text-center text-muted-foreground md:col-span-1 border-t md:border-t-0 border-black/5 dark:border-white/10 pt-2 md:pt-0">
                          <span className="md:hidden font-bold text-foreground">
                            {t("traderLabel")}:
                          </span>
                          {renderValue(traderPlan, featureKey)}
                        </div>
                        <div className="flex justify-between md:justify-center items-center md:text-center text-primary font-bold md:col-span-1 border-t md:border-t-0 border-black/5 dark:border-white/10 pt-2 md:pt-0">
                          <span className="md:hidden font-bold text-foreground">
                            {t("proLabel")}:
                          </span>
                          {renderValue(proPlan, featureKey)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
