import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BarChart3, Bot, Users } from "lucide-react";
// getTranslator 대신 getTranslations를 import 합니다.
import { getTranslations } from "next-intl/server";

export const FeatureSection = async () => {
  // getTranslations에는 locale을 전달할 필요가 없습니다.
  const t = await getTranslations("Landing.FeatureSection");

  const featuresData = [
    {
      icon: <BarChart3 className="h-8 w-8 text-violet-400" />,
      key: "backtesting",
    },
    {
      icon: <Bot className="h-8 w-8 text-violet-400" />,
      key: "autoTrading",
    },
    {
      icon: <Users className="h-8 w-8 text-violet-400" />,
      key: "community",
    },
  ];

  return (
    <section id="features" className="w-full bg-white/5 py-12 md:py-24">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-xl">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {featuresData.map((feature) => (
            <Card key={feature.key}>
              <CardHeader>
                {feature.icon}
                <CardTitle>{t(`features.${feature.key}.title`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t(`features.${feature.key}.description`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
