// file: frontend/src/components/domain/PricingComparisonTable.tsx

"use client";

import { useTranslations } from "next-intl";
import { Check, X, Code, BarChart3, Bot, Users, Zap } from "lucide-react";

export const PricingComparisonTable = () => {
  const t = useTranslations("Pricing.comparison");
  // 언어팩에서 기능 분류 데이터 로드
  const featureCategories = t.raw("categories");

  const iconMap: Record<string, JSX.Element> = {
    "전략 구성": <Code className="h-6 w-6" />,
    백테스팅: <BarChart3 className="h-6 w-6" />,
    자동매매: <Bot className="h-6 w-6" />,
    커뮤니티: <Users className="h-6 w-6" />,
    "고급 기능": <Zap className="h-6 w-6" />,
    // 영문 키 추가 (언어팩에서 영문 category 값을 사용하기 위함)
    "Strategy Building": <Code className="h-6 w-6" />,
    Backtesting: <BarChart3 className="h-6 w-6" />,
    "Automated Trading": <Bot className="h-6 w-6" />,
    Community: <Users className="h-6 w-6" />,
    "Advanced Features": <Zap className="h-6 w-6" />,
  };

  const renderValue = (value: string | boolean) => {
    if (value === true) {
      return <Check className="text-green-400 text-2xl" />;
    }
    if (value === false) {
      return <X className="text-red-500 text-xl" />;
    }
    return value;
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="container mx-auto max-w-5xl py-12">
        {/* 테이블 헤더 - 데스크톱용 */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 mb-6 text-xl font-bold border-b border-border pb-4 sticky top-0 bg-background z-10">
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

        {/* 기능별 목록 */}
        {featureCategories.map((category, catIndex) => (
          <div key={catIndex} className="mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3 border-l-4 border-primary pl-4">
              {iconMap[category.category as keyof typeof iconMap]}{" "}
              {category.category}
            </h3>
            <div className="space-y-2">
              {category.features.map((feature, featIndex) => (
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
                    {renderValue(feature.basic)}
                  </div>
                  <div className="flex justify-between md:justify-center items-center md:text-center text-muted-foreground md:col-span-1 border-t md:border-t-0 border-border pt-2 md:pt-0">
                    <span className="md:hidden font-bold text-foreground">
                      {t("traderLabel")}:
                    </span>
                    {renderValue(feature.trader)}
                  </div>
                  <div className="flex justify-between md:justify-center items-center md:text-center text-primary font-bold md:col-span-1 border-t md:border-t-0 border-border pt-2 md:pt-0">
                    <span className="md:hidden font-bold text-foreground">
                      {t("proLabel")}:
                    </span>
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
