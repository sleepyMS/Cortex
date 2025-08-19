// file: src/components/domain/pricing/PricingToggle.tsx

"use client";

import { useTranslations } from "next-intl";
import { motion, LayoutGroup } from "framer-motion";

interface PricingToggleProps {
  isMonthlySelected: boolean;
  onSelectPeriod: (isMonthly: boolean) => void;
  className?: string;
}

export const PricingToggle = ({
  isMonthlySelected,
  onSelectPeriod,
  className,
}: PricingToggleProps) => {
  const t = useTranslations("Pricing");

  return (
    <LayoutGroup>
      <div
        className={`relative flex items-center rounded-full p-1 max-w-sm mx-auto shadow-md
          bg-muted/50 border border-border
          dark:bg-white/5 dark:border-white/10
          ${className}
        `}
      >
        {/* 애니메이션 슬라이더 - 버튼 아래에 위치하도록 z-index를 조정합니다. */}
        <motion.div
          layoutId="pricing-toggle-pill"
          className={`absolute inset-y-1 rounded-full bg-primary z-10 w-[calc(50%-4px)]`}
          initial={false}
          animate={{ x: isMonthlySelected ? "0" : "100%" }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />

        {/* 버튼들 - 슬라이더 위에 위치하도록 z-index를 조정하고, 배경색을 투명하게 설정합니다. */}
        <button
          onClick={() => onSelectPeriod(true)}
          aria-pressed={isMonthlySelected}
          className={`w-1/2 rounded-full px-4 py-2 font-semibold text-sm relative z-20 bg-transparent transition-colors
            ${
              isMonthlySelected
                ? "text-primary-foreground"
                : "text-gray-400 dark:hover:text-white hover:text-foreground"
            }
          `}
        >
          {t("toggle.monthly")}
        </button>
        <button
          onClick={() => onSelectPeriod(false)}
          aria-pressed={!isMonthlySelected}
          className={`w-1/2 rounded-full px-4 py-2 font-semibold text-sm relative z-20 bg-transparent transition-colors
            ${
              !isMonthlySelected
                ? "text-primary-foreground"
                : "text-gray-400 dark:hover:text-white hover:text-foreground"
            }
          `}
        >
          {t("toggle.yearly")}
        </button>
      </div>
    </LayoutGroup>
  );
};
