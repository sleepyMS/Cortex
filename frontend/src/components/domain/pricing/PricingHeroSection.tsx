// file: frontend/src/components/domain/PricingHeroSection.tsx

"use client";

import { useTranslations } from "next-intl";
import { motion, Variants } from "framer-motion";
import { PricingToggle } from "./PricingToggle";

interface PricingHeroSectionProps {
  isMonthlySelected: boolean;
  onSelectPeriod: (isMonthly: boolean) => void;
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

export const PricingHeroSection = ({
  isMonthlySelected,
  onSelectPeriod,
}: PricingHeroSectionProps) => {
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

        <motion.div variants={itemVariants}>
          <PricingToggle
            isMonthlySelected={isMonthlySelected}
            onSelectPeriod={onSelectPeriod}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};
