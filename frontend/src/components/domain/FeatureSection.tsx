// file: frontend/src/components/domain/FeatureSection.tsx

"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BarChart3, Bot, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, Variants } from "framer-motion"; // Variants 타입을 import

const FeatureSection = () => {
  const t = useTranslations("Landing.FeatureSection");

  const featuresData = [
    {
      icon: <BarChart3 className="h-8 w-8 text-violet-400" />,
      key: "backtesting",
    },
    { icon: <Bot className="h-8 w-8 text-violet-400" />, key: "autoTrading" },
    { icon: <Users className="h-8 w-8 text-violet-400" />, key: "community" },
  ];

  // Variants 타입을 명시적으로 지정하고, transition에 type: "tween"을 추가합니다.
  const cardVariants: Variants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "tween", duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section id="features" className="w-full bg-white/5 py-12 md:py-24">
      <div className="container mx-auto max-w-5xl px-4">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-xl">
            {t("subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {featuresData.map((feature, index) => (
            <motion.div
              key={feature.key}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:border-violet-500/50 hover:bg-white/10 transition-colors duration-300">
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { FeatureSection };
