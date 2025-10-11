// file: frontend/src/components/domain/PricingCard.tsx

"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSubscriptionCheckoutMutation } from "@/hooks/useSubscription";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { toast } from "sonner";

interface PricingCardProps {
  planId: string;
  planName: string;
  price: string;
  tagline: string;
  features: string[];
  isHighlighted?: boolean;
  isFree?: boolean;
}

export const PricingCard = ({
  planId,
  planName,
  price,
  tagline,
  features,
  isHighlighted = false,
  isFree = false,
}: PricingCardProps) => {
  const t = useTranslations("Pricing.card");
  const { user } = useUserSubscription();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const checkoutMutation = useSubscriptionCheckoutMutation();

  const isTrader = planName === "Trader";
  const isPro = planName === "Pro";
  const isBasic = planName === "Basic";

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  let cardStyles = "";
  let headerTextColor = "";
  let buttonStyle = "";

  if (isBasic) {
    if (!isDark) {
      cardStyles = `bg-gradient-to-br from-basic-secondary to-background border border-basic-primary/50 shadow-[0_0_15px_theme(colors.basic-primary)/30]`;
      headerTextColor = "text-basic-primary";
      buttonStyle = "bg-amber-700/80 text-white hover:bg-amber-700/60";
    } else {
      cardStyles =
        "bg-gradient-to-br from-basic-primary/20 to-basic-secondary/10 border border-basic-primary/50 shadow-[0_0_25px_theme(colors.basic-primary)/30]";
      headerTextColor = "text-basic-primary";
      buttonStyle = "bg-amber-700/80 text-foreground hover:bg-amber-700/70";
    }
  } else if (isTrader) {
    if (!isDark) {
      cardStyles =
        "bg-gradient-to-br from-trader-secondary to-background border border-trader-primary/50 shadow-[0_0_20px_theme(colors.trader-primary)/20]";
      headerTextColor = "text-trader-primary";
      buttonStyle = "bg-trader-primary text-black hover:bg-trader-primary/80";
    } else {
      cardStyles =
        "bg-gradient-to-br from-yellow-400/10 to-yellow-500/5 border border-yellow-400/30 shadow-[0_0_20px_rgba(255,215,0,0.2)]";
      headerTextColor = "text-yellow-400";
      buttonStyle = "bg-yellow-500 text-black hover:bg-yellow-500/80";
    }
  } else if (isPro) {
    if (!isDark) {
      cardStyles =
        "bg-gradient-to-br from-pro-secondary to-background border border-pro-primary/50 shadow-[0_0_40px_theme(colors.pro-primary)/50]";
      headerTextColor = "text-pro-primary";
      buttonStyle = "bg-pro-primary text-black hover:bg-pro-primary/80";
    } else {
      cardStyles =
        "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/50 shadow-[0_0_40px_rgba(var(--primary-rgb),0.5)]";
      headerTextColor = "text-primary";
      buttonStyle = "bg-primary text-black hover:bg-primary/80";
    }
  }

  const handleSubscribeClick = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setIsRedirecting(true);
    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY!;
      const customerKey = String(user.id);

      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey });

      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/payment/success-billing?planId=${planId}`,
        failUrl: `${window.location.origin}/payment/fail-billing`,
        customerEmail: user.email,
        customerName: user.username || user.email,
      });
    } catch (error: any) {
      if (error.code === "USER_CANCEL") {
        toast.info("카드 등록을 취소했습니다.");
      } else {
        toast.error(`오류가 발생했습니다: ${error.message}`);
      }
      setIsRedirecting(false);
    }
  };

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
        <div
          className={`absolute top-0 right-0 -mt-3 -mr-3 px-3 py-1 text-xs font-bold rounded-full rotate-6 ${
            isDark
              ? "bg-yellow-400 text-black"
              : "bg-trader-primary text-foreground"
          }`}
        >
          <Sparkles className="inline h-3 w-3 mr-1" /> {t("recommendation")}
        </div>
      )}

      <div className="relative z-10 flex-grow">
        <div className="flex flex-col space-y-4 mb-8">
          <h3 className={`text-4xl font-bold ${headerTextColor}`}>
            {planName}
          </h3>
          <p className="text-xl font-medium text-muted-foreground">{tagline}</p>
          <div className="mt-2 text-3xl font-extrabold text-foreground">
            {isFree ? (
              price
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
        onClick={handleSubscribeClick} // 이제 이 함수는 비동기로 동작
        className={`w-full mt-10 text-lg font-semibold ${buttonStyle}`}
        disabled={checkoutMutation.isPending}
      >
        {checkoutMutation.isPending
          ? t("button.processing")
          : isFree
          ? t("button.start")
          : t("button.subscribe")}
      </Button>
    </motion.div>
  );
};
