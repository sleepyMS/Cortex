// file: frontend/src/components/domain/PricingCard.tsx

"use client";

import { motion } from "framer-motion";
import { Check, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PricingCardProps {
  planName: string;
  price: string;
  features: string[];
  isHighlighted?: boolean;
  isFree?: boolean;
}

export const PricingCard = ({
  planName,
  price,
  features,
  isHighlighted = false,
  isFree = false,
}: PricingCardProps) => {
  const isTrader = planName === "Trader";
  const isPro = planName === "Pro";

  // 플랜별 네온 스타일을 결정하는 조건부 클래스
  let cardStyles = "bg-white/5 border border-white/10 shadow-md"; // Basic 스타일 (기본)
  let headerTextColor = "text-foreground";
  let buttonStyle = "bg-white/10 text-foreground hover:bg-white/20";

  if (isTrader) {
    // Trader 스타일: 은은한 황금색 네온 효과
    cardStyles =
      "bg-gradient-to-br from-yellow-400/10 to-yellow-500/5 border border-yellow-400/30 shadow-[0_0_20px_rgba(255,215,0,0.2)]";
    headerTextColor = "text-yellow-400";
    buttonStyle = "bg-yellow-400 text-black hover:bg-yellow-400/80";
  } else if (isPro) {
    // Pro 스타일: 보라색 네온 효과 (기존대로 유지)
    cardStyles =
      "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/50 shadow-[0_0_40px_rgba(var(--primary-rgb),0.5)]";
    headerTextColor = "text-primary";
    buttonStyle = "bg-primary text-black hover:bg-primary/80";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`relative flex flex-col justify-between rounded-2xl p-8 backdrop-blur-md transition-transform duration-300 hover:scale-[1.03]
        ${cardStyles}
      `}
    >
      {isTrader && (
        <div className="absolute top-0 right-0 -mt-3 -mr-3 px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full rotate-6">
          <Sparkles className="inline h-3 w-3 mr-1" /> 추천
        </div>
      )}

      <div className="relative z-10 flex-grow">
        <div className="flex flex-col space-y-4 mb-8">
          <h3 className={`text-4xl font-bold ${headerTextColor}`}>
            {planName}
          </h3>
          <p className="text-xl font-medium text-muted-foreground">
            퀀트 투자의{" "}
            {planName === "Basic"
              ? "시작"
              : planName === "Trader"
              ? "성장"
              : "완성"}
          </p>
          <div className="mt-2 text-6xl font-extrabold text-foreground">
            {isFree ? (
              "Free"
            ) : (
              <>
                {price}
                <span className="text-xl font-medium text-gray-500">/월</span>
              </>
            )}
          </div>
        </div>

        <div className="h-px w-full bg-white/20 mb-8" />

        <ul className="space-y-4 text-lg text-muted-foreground">
          {features.map((feature, index) => (
            <li key={index} className="flex space-x-3">
              <div className="mt-1 flex-shrink-0">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <span className="leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        className={`w-full mt-10 text-lg font-semibold
          ${buttonStyle}
        `}
      >
        {isFree ? "시작하기" : "구독하기"}
      </Button>
    </motion.div>
  );
};
