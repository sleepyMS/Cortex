// file: frontend/src/components/domain/PricingCard.tsx

"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  useSubscriptionCheckoutMutation,
  useSubscriptionChangeMutation,
} from "@/hooks/useSubscription";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { toast } from "sonner";

interface PricingCardProps {
  planId: string;
  planName: string;
  price: number;
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
  const tCard = useTranslations("Pricing.card");
  const tDashboard = useTranslations("Dashboard.overview");

  const { user, subscription } = useUserSubscription();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const checkoutMutation = useSubscriptionCheckoutMutation();
  const changePlanMutation = useSubscriptionChangeMutation();

  const isTrader = planName === "Trader";
  const isPro = planName === "Pro";
  const isBasic = planName === "Basic";

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 다크 모드 초기 상태 설정
    setIsDark(document.documentElement.classList.contains("dark"));

    // 다크 모드 변경 감지
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
      buttonStyle = "!bg-basic-primary text-white hover:!bg-basic-primary/80";
    } else {
      cardStyles =
        "bg-gradient-to-br from-basic-primary/20 to-basic-secondary/10 border border-basic-primary/50 shadow-[0_0_25px_theme(colors.basic-primary)/30]";
      headerTextColor = "text-basic-primary";
      buttonStyle =
        "!bg-basic-primary text-foreground hover:!bg-basic-primary/80";
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
      toast.error(tCard("loginRequired"));
      return;
    }

    // 이미 빌링키가 있는 경우 (카드 등록됨) -> 확인 다이얼로그 표시
    if (subscription?.paymentGatewayCustomerKey) {
      setShowConfirmDialog(true);
      return;
    }

    setIsRedirecting(true);
    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY!;
      // user.id는 UUID일 수 있으므로(models.py 참고), 문자열로 변환
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
        toast.info(tCard("paymentCanceled"));
      } else {
        toast.error(tCard("paymentError", { error: error.message }));
      }
      setIsRedirecting(false);
    }
  };

  const handleConfirmPlanChange = async () => {
    setShowConfirmDialog(false);
    try {
      await changePlanMutation.mutateAsync({ planId });
      // 성공 처리는 hook 내부 onSuccess에서 처리됨 (toast 등)
    } catch (error) {
      // 에러 처리는 hook 내부 onError에서 처리됨
    }
  };

  // 가격 포맷팅 로직
  const formattedPrice = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    minimumFractionDigits: 0,
  }).format(price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`relative flex flex-col justify-between rounded-2xl p-8 transition-transform duration-300 hover:scale-[1.03]
        ${cardStyles}
      `}
      style={{
        // GPU 레이어 프로모션 + backdrop-blur 대신 반투명 배경 사용 (성능 ↑↑)
        transform: "translateZ(0)",
        contain: "layout style",
        backgroundColor: isDark
          ? "rgba(0, 0, 0, 0.6)"
          : "rgba(255, 255, 255, 0.85)",
      }}
    >
      {isTrader && (
        <div
          className={`absolute top-0 right-0 -mt-3 -mr-3 px-3 py-1 text-xs font-bold rounded-full rotate-6 ${
            isDark
              ? "bg-yellow-400 text-black"
              : "bg-trader-primary text-foreground"
          }`}
        >
          <Sparkles className="inline h-3 w-3 mr-1" /> {tCard("recommendation")}
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
              tDashboard("free")
            ) : (
              <>
                {formattedPrice}
                <span className="text-xl font-medium text-gray-500">
                  {tCard("perMonth")}
                </span>
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
        variant={isPro ? "primary" : "secondary"}
        onClick={handleSubscribeClick}
        className={`w-full mt-10 text-lg font-semibold ${
          !isPro ? buttonStyle : ""
        }`}
        disabled={
          checkoutMutation.isPending ||
          changePlanMutation.isPending ||
          isRedirecting
        }
      >
        {checkoutMutation.isPending ||
        changePlanMutation.isPending ||
        isRedirecting
          ? tCard("button.processing")
          : isFree
          ? tCard("button.start")
          : tCard("button.subscribe")}{" "}
      </Button>

      {/* 플랜 변경 확인 다이얼로그 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tCard("confirmDialog.title", { planName })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tCard("confirmDialog.description", {
                planName,
                price: formattedPrice,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {tCard("confirmDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPlanChange}>
              {tCard("confirmDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};
