// file: frontend/src/components/domain/FeatureSection.tsx

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BarChart3, Bot, Users } from "lucide-react";
import { getTranslations } from "next-intl/server"; // 2. 서버용 getTranslations 임포트
// 3. 애니메이션 컴포넌트 임포트
import { FeatureAnimatedCard } from "./FeatureAnimatedCard";
// 4. framer-motion 관련 임포트 모두 제거

// 5. async 함수로 변경
const FeatureSection = async () => {
  // 6. 서버에서 직접 번역 텍스트를 가져옴
  const t = await getTranslations("Landing.FeatureSection");

  const featuresData = [
    {
      icon: <BarChart3 className="h-8 w-8 text-violet-400" />,
      key: "backtesting",
    },
    { icon: <Bot className="h-8 w-8 text-violet-400" />, key: "autoTrading" },
    { icon: <Users className="h-8 w-8 text-violet-400" />, key: "community" },
  ];

  return (
    <section id="features" className="w-full bg-white/5 py-12 md:py-24">
      <div className="container mx-auto max-w-5xl px-4">
        {/* 7. 제목/부제는 애니메이션 없이 정적 HTML로 즉시 렌더링 (SEO에 유리)
            (필요하다면 여기도 별도 클라이언트 컴포넌트로 감쌀 수 있음) */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-xl">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {featuresData.map((feature, index) => (
            // 8. 클라이언트 컴포넌트에 정적 텍스트를 props로 전달
            <FeatureAnimatedCard
              key={feature.key}
              index={index}
              icon={feature.icon}
              title={t(`features.${feature.key}.title`)}
              description={t(`features.${feature.key}.description`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export { FeatureSection };
