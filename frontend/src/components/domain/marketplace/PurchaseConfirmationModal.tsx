// file: frontend/src/components/domain/marketplace/PurchaseConfirmationModal.tsx
"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import {
  MarketplaceStrategy,
  ShopItem,
  AIModelProduct,
} from "@/types/marketplace";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
  DialogClose,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import {
  Brain,
  LineChart,
  ShoppingBag,
  Coins,
  AlertCircle,
  Gem,
  ChevronRight,
  TrendingUp,
  Percent,
  Activity,
  Target,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface PurchaseConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  product: MarketplaceStrategy | ShopItem | AIModelProduct | null;
  isPending: boolean;
}

export const PurchaseConfirmationModal = ({
  isOpen,
  onOpenChange,
  onConfirm,
  product,
  isPending,
}: PurchaseConfirmationModalProps) => {
  const t = useTranslations("Marketplace");
  const tConf = useTranslations("Marketplace.purchaseConfirmation");
  const tCommon = useTranslations("Common");

  const { creditBalance } = useCreditBalance();
  const [isAnimated, setIsAnimated] = useState(false);

  // Animation trigger on modal open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsAnimated(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [isOpen]);

  if (!product) return null;

  const getProductTypeInfo = () => {
    switch (product.productType) {
      case "STRATEGY":
        return {
          icon: <LineChart className="h-7 w-7" />,
          label: tConf("productTypes.strategy"),
          gradient: "from-blue-500 via-blue-600 to-indigo-600",
          glowColor: "shadow-blue-500/25",
          iconBg: "bg-blue-500/20",
          accentColor: "text-blue-400",
          badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        };
      case "AI_MODEL":
        return {
          icon: <Brain className="h-7 w-7" />,
          label: tConf("productTypes.aiModel"),
          gradient: "from-violet-500 via-purple-600 to-fuchsia-600",
          glowColor: "shadow-violet-500/25",
          iconBg: "bg-violet-500/20",
          accentColor: "text-violet-400",
          badgeClass: "bg-violet-500/10 text-violet-400 border-violet-500/30",
        };
      case "SHOP_ITEM":
        return {
          icon: <ShoppingBag className="h-7 w-7" />,
          label: tConf("productTypes.shopItem"),
          gradient: "from-emerald-500 via-green-600 to-teal-600",
          glowColor: "shadow-emerald-500/25",
          iconBg: "bg-emerald-500/20",
          accentColor: "text-emerald-400",
          badgeClass:
            "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "CREDIT_PACK":
        return {
          icon: <Gem className="h-7 w-7" />,
          label: tConf("productTypes.creditPack"),
          gradient: "from-cyan-500 via-sky-600 to-blue-600",
          glowColor: "shadow-cyan-500/25",
          iconBg: "bg-cyan-500/20",
          accentColor: "text-cyan-400",
          badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        };
      default:
        return {
          icon: <ShoppingBag className="h-7 w-7" />,
          label: tConf("productTypes.default"),
          gradient: "from-gray-500 via-gray-600 to-slate-600",
          glowColor: "shadow-gray-500/25",
          iconBg: "bg-gray-500/20",
          accentColor: "text-gray-400",
          badgeClass: "bg-gray-500/10 text-gray-400 border-gray-500/30",
        };
    }
  };

  const typeInfo = getProductTypeInfo();
  const isFree = product.price === 0;
  const isPaidCreditOnly =
    product.productType === "STRATEGY" || product.productType === "AI_MODEL";

  const currentBalance = isPaidCreditOnly
    ? creditBalance?.cashCreditBalance || 0
    : creditBalance?.totalBalance || 0;

  const estimatedBalance = currentBalance - product.price;
  const isInsufficient = estimatedBalance < 0;

  // Render Strategy Stats with enhanced design
  const renderStrategyStats = (strategy: MarketplaceStrategy) => {
    const stats = strategy.latestBacktestSummary;
    if (!stats) return null;

    const statItems = [
      {
        label: tConf("stats.return"),
        value: `${(stats.totalReturnPct || 0).toFixed(1)}%`,
        icon: <TrendingUp className="h-4 w-4" />,
        isPositive: (stats.totalReturnPct || 0) >= 0,
        colorClass:
          (stats.totalReturnPct || 0) >= 0
            ? "text-emerald-400"
            : "text-red-400",
      },
      {
        label: tConf("stats.mdd"),
        value: `${(stats.mddPct || 0).toFixed(1)}%`,
        icon: <Activity className="h-4 w-4" />,
        colorClass: "text-amber-400",
      },
      {
        label: tConf("stats.winRate"),
        value: `${(stats.winRatePct || 0).toFixed(1)}%`,
        icon: <Percent className="h-4 w-4" />,
        colorClass: "text-blue-400",
      },
    ];

    return (
      <div className="grid grid-cols-3 gap-2">
        {statItems.map((item, i) => (
          <div
            key={i}
            className={`
              relative overflow-hidden p-3 rounded-xl
              bg-gradient-to-br from-muted/60 to-muted/30
              border border-border/50 backdrop-blur-sm
              transition-all duration-300
              hover:border-border hover:shadow-lg hover:shadow-black/5
              ${isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
            `}
            style={{ transitionDelay: `${150 + i * 75}ms` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`${item.colorClass} opacity-80`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </span>
            </div>
            <div
              className={`text-lg font-bold tracking-tight ${item.colorClass}`}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render AI Model Stats with enhanced design
  const renderAIStats = (model: AIModelProduct) => (
    <div className="grid grid-cols-2 gap-2">
      {[
        {
          label: tConf("stats.accuracy"),
          value: model.accuracy
            ? `${(model.accuracy * 100).toFixed(1)}%`
            : "N/A",
          icon: <Target className="h-4 w-4" />,
          colorClass: "text-violet-400",
        },
        {
          label: tConf("stats.symbol"),
          value: model.productMetadata.trainingSymbol || tConf("stats.generic"),
          icon: <Activity className="h-4 w-4" />,
          colorClass: "text-foreground",
        },
      ].map((item, i) => (
        <div
          key={i}
          className={`
            relative overflow-hidden p-3 rounded-xl
            bg-gradient-to-br from-muted/60 to-muted/30
            border border-border/50 backdrop-blur-sm
            transition-all duration-300
            hover:border-border hover:shadow-lg hover:shadow-black/5
            ${isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
          `}
          style={{ transitionDelay: `${150 + i * 75}ms` }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`${item.colorClass} opacity-80`}>{item.icon}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </span>
          </div>
          <div
            className={`text-lg font-bold tracking-tight ${item.colorClass}`}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("purchaseConfirmTitle")}</DialogTitle>
        </DialogHeader>

        {/* Hero Header with Gradient */}
        <div
          className={`
            relative px-6 pt-8 pb-6 overflow-hidden
            bg-gradient-to-br ${typeInfo.gradient}
          `}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_50%)]" />
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-black/10 rounded-full blur-xl" />

          <div className="relative flex items-start gap-4">
            {/* Icon container with glass effect */}
            <div
              className={`
                p-3.5 rounded-2xl ${typeInfo.iconBg}
                backdrop-blur-md border border-white/20
                shadow-lg ${typeInfo.glowColor}
                transition-all duration-500
                ${isAnimated ? "scale-100 opacity-100" : "scale-90 opacity-0"}
              `}
            >
              <span className="text-white">{typeInfo.icon}</span>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <Badge
                variant="outline"
                className={`
                  text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wider
                  bg-white/10 text-white/90 border-white/20 backdrop-blur-sm
                  transition-all duration-500 delay-75
                  ${isAnimated ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}
                `}
              >
                {typeInfo.label}
                {product.productType === "AI_MODEL" &&
                  (product as AIModelProduct).modelType && (
                    <span className="ml-1.5 border-l border-white/30 pl-1.5">
                      {(product as AIModelProduct).modelType.toUpperCase()}
                      {(product as AIModelProduct).taskType && (
                        <span className="ml-1 opacity-80">
                          ·{" "}
                          {(product as AIModelProduct).taskType ===
                          "classification"
                            ? tConf("aiModelBadge.classification")
                            : tConf("aiModelBadge.regression")}
                        </span>
                      )}
                    </span>
                  )}
              </Badge>
              <h3
                className={`
                  text-xl font-bold tracking-tight text-white leading-tight
                  transition-all duration-500 delay-100
                  ${isAnimated ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}
                `}
              >
                {product.name}
              </h3>

              {/* Author line */}
            </div>
          </div>
        </div>

        <DialogBody className="px-6 pt-5 pb-4 space-y-5">
          {/* Performance Stats Section */}
          {(product.productType === "STRATEGY" ||
            product.productType === "AI_MODEL") && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                {tConf("productIntelligence")}
              </h4>

              {product.productType === "STRATEGY" &&
                renderStrategyStats(product as MarketplaceStrategy)}
              {product.productType === "AI_MODEL" &&
                renderAIStats(product as AIModelProduct)}
            </div>
          )}

          {product.productType === "SHOP_ITEM" && (
            <div
              className={`
                p-4 rounded-xl bg-muted/30 border border-border/50
                text-sm italic text-muted-foreground/80 text-center
                transition-all duration-500 delay-150
                ${isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
              `}
            >
              {tConf("stats.noPerformance")}
            </div>
          )}

          {/* Payment Details Section */}
          <div
            className={`
              space-y-3
              transition-all duration-500 delay-200
              ${isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
            `}
          >
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 flex items-center gap-2">
              <Coins className="h-3 w-3" />
              {tConf("paymentDetails")}
            </h4>

            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm">
              {/* Receipt content */}
              <div className="p-4 space-y-3">
                {/* Price row */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {tConf("receipt.unitPrice")}
                  </span>
                  <span className="font-semibold">
                    {isFree ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5" />
                        {tConf("receipt.free")}
                      </span>
                    ) : (
                      `${product.price.toLocaleString()} CC`
                    )}
                  </span>
                </div>

                {/* Current balance row */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {tConf("receipt.currentBalance")}
                  </span>
                  <span className="font-medium">
                    {currentBalance.toLocaleString()} CC
                  </span>
                </div>

                {/* Estimated balance row */}
                {!isFree && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {tConf("receipt.estimatedBalance")}
                    </span>
                    <span
                      className={`font-medium ${
                        isInsufficient ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {estimatedBalance.toLocaleString()} CC
                    </span>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-border/50 my-2" />

                {/* Total row with emphasis */}
                <div className="flex justify-between items-center pt-1">
                  <span className="font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    {isFree
                      ? tConf("receipt.free")
                      : tConf("receipt.totalCharge")}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-bold tracking-tight ${
                        isFree ? "text-emerald-400" : "text-foreground"
                      }`}
                    >
                      {isFree ? "0" : product.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">
                      CC
                    </span>
                  </div>
                </div>
              </div>

              {/* Type badge */}
              <div className="px-4 py-2.5 bg-muted/30 border-t border-border/30 flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {product.inventoryType === "UNLOCK"
                    ? tConf("inventoryType.unlock")
                    : tConf("inventoryType.consumable")}
                </span>
                {isPaidCreditOnly && !isFree && (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-5 px-1.5 bg-amber-500/10 text-amber-500 border-amber-500/30"
                  >
                    {tConf("warnings.paidCredit")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Warning messages */}
          {isInsufficient && (
            <div
              className={`
                p-4 rounded-xl border flex gap-3 items-start
                bg-red-500/5 border-red-500/20
                transition-all duration-500 delay-250
                ${isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
              `}
            >
              <div className="p-1.5 rounded-lg bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-xs leading-relaxed text-red-500/90 font-medium">
                {t("insufficientCredit")}
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-3">
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="flex-1 h-12 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all rounded-xl"
            >
              {tCommon("cancel")}
            </Button>
          </DialogClose>

          <Button
            onClick={onConfirm}
            disabled={isPending || isInsufficient}
            className={`
              relative flex-1 h-12 text-xs font-black uppercase tracking-widest rounded-xl
              transition-all duration-300 overflow-hidden group
              ${
                isInsufficient
                  ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                  : isFree
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02]"
                    : `bg-gradient-to-r ${typeInfo.gradient} text-white shadow-lg ${typeInfo.glowColor} hover:shadow-xl hover:scale-[1.02]`
              }
            `}
          >
            {/* Button shine effect */}
            {!isInsufficient && !isPending && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}

            {isPending ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4 text-current" />
                <span className="animate-pulse">
                  {tConf("buttons.processing")}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 relative">
                {isFree ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {tConf("buttons.claimNow")}
                  </>
                ) : (
                  <>
                    {tConf("buttons.confirmPurchase")}
                    {!isInsufficient && (
                      <ChevronRight className="h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </>
                )}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
