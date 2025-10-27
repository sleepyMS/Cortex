// file: frontend/src/components/domain/PricingHeroSection.tsx

"use client";

import { useTranslations } from "next-intl";
import { motion, Variants } from "framer-motion";
// 1. PricingToggle 임포트 제거
// import { PricingToggle } from "./PricingToggle";

// 2. Props 인터페이스에서 불필요한 props 제거
interface PricingHeroSectionProps {
  // isMonthlySelected: boolean;  <-- 제거
  // onSelectPeriod: (isMonthly: boolean) => void; <-- 제거
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "tween",
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
};

// 3. 컴포넌트 시그니처에서 props 제거
export const PricingHeroSection = ({}: PricingHeroSectionProps) => {
  const t = useTranslations("Pricing");

  return (
    <section className="relative w-full overflow-hidden">
      <motion.div
        className="container mx-auto max-w-4xl px-4 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl mb-4"
          variants={itemVariants}
        >
          <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
            {t("hero.title")}
          </span>
        </motion.h1>

        <motion.p
          className="max-w-2xl mx-auto text-lg text-muted-foreground md:text-xl mb-8"
          variants={itemVariants}
        >
          {t("hero.subtitle")}
        </motion.p>

        {/* 4. PricingToggle 컴포넌트 제거 */}
        {/*
        <motion.div variants={itemVariants}>
          <PricingToggle
            isMonthlySelected={isMonthlySelected}
            onSelectPeriod={onSelectPeriod}
          />
          <div className="p-1"></div>
        </motion.div>
        */}
      </motion.div>
    </section>
  );
};
