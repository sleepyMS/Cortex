// file: frontend/src/components/domain/marketplace/PurchaseConfirmationModal.tsx
"use client";

import { useTranslations } from "next-intl";
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
import { Separator } from "@/components/ui/Separator";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import {
  Brain,
  LineChart,
  ShoppingBag,
  User,
  Coins,
  AlertCircle,
  Gem,
  ChevronRight,
  TrendingUp,
  Percent,
  Activity,
  Target,
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

  if (!product) return null;

  const getProductTypeInfo = () => {
    switch (product.productType) {
      case "STRATEGY":
        return {
          icon: <LineChart className="h-6 w-6 text-blue-500" />,
          label: tConf("productTypes.strategy"),
          colorClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        };
      case "AI_MODEL":
        return {
          icon: <Brain className="h-6 w-6 text-violet-500" />,
          label: tConf("productTypes.aiModel"),
          colorClass: "bg-violet-500/10 text-violet-500 border-violet-500/20",
        };
      case "SHOP_ITEM":
        return {
          icon: <ShoppingBag className="h-6 w-6 text-emerald-500" />,
          label: tConf("productTypes.shopItem"),
          colorClass:
            "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        };
      case "CREDIT_PACK":
        return {
          icon: <Gem className="h-6 w-6 text-cyan-500" />,
          label: tConf("productTypes.creditPack"),
          colorClass: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
        };
      default:
        return {
          icon: <ShoppingBag className="h-6 w-6 text-muted-foreground" />,
          label: tConf("productTypes.default"),
          colorClass: "bg-muted/10 text-muted-foreground border-muted/20",
        };
    }
  };

  const typeInfo = getProductTypeInfo();
  const isFree = product.price === 0;
  // C2C 거래(전략, AI 모델)는 유료 크레딧만 사용 가능
  const isPaidCreditOnly =
    product.productType === "STRATEGY" || product.productType === "AI_MODEL";

  // Balance Calculation
  const currentBalance = isPaidCreditOnly
    ? creditBalance?.cashCreditBalance || 0
    : creditBalance?.totalBalance || 0;

  const estimatedBalance = currentBalance - product.price;
  const isInsufficient = estimatedBalance < 0;

  // Render Strategy Stats
  const renderStrategyStats = (strategy: MarketplaceStrategy) => {
    const stats = strategy.latestBacktestSummary;
    if (!stats) return null;

    return (
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: tConf("stats.return"),
            value: `${(stats.totalReturnPct || 0).toFixed(1)}%`,
            icon: <TrendingUp className="h-3 w-3" />,
            color:
              (stats.totalReturnPct || 0) >= 0
                ? "text-emerald-500"
                : "text-red-500",
          },
          {
            label: tConf("stats.mdd"),
            value: `${(stats.mddPct || 0).toFixed(1)}%`,
            icon: <Activity className="h-3 w-3" />,
            color: "text-red-400",
          },
          {
            label: tConf("stats.winRate"),
            value: `${(stats.winRatePct || 0).toFixed(1)}%`,
            icon: <Percent className="h-3 w-3" />,
            color: "text-blue-400",
          },
        ].map((item, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/30 border border-border/40"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80">
              {item.icon}
              {item.label}
            </div>
            <div className={`text-sm font-bold tracking-tight ${item.color}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render AI Model Stats
  const renderAIStats = (model: AIModelProduct) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/30 border border-border/40">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80">
          <Target className="h-3 w-3" />
          {tConf("stats.accuracy")}
        </div>
        <div className="text-sm font-bold tracking-tight text-violet-400">
          {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : "N/A"}
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/30 border border-border/40">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80">
          <Activity className="h-3 w-3" />
          {tConf("stats.symbol")}
        </div>
        <div className="text-sm font-bold tracking-tight text-foreground">
          {model.productMetadata.trainingSymbol || tConf("stats.generic")}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-background border-border/60 shadow-2xl ring-1 ring-white/5">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("purchaseConfirmTitle")}</DialogTitle>
        </DialogHeader>

        <DialogBody className="px-7 pt-8 pb-6 space-y-7">
          {/* 1. Header Section */}
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-2xl border ${typeInfo.colorClass} shadow-inner`}
            >
              {typeInfo.icon}
            </div>
            <div className="space-y-1">
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 border-border/60 font-medium tracking-tight text-muted-foreground capitalize"
              >
                {typeInfo.label}
              </Badge>
              <h3 className="text-xl font-bold tracking-tight text-foreground leading-none">
                {product.name}
              </h3>
            </div>
          </div>

          {/* 2. Product Intelligence / Performance stats */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 flex items-center gap-2">
              {tConf("productIntelligence")}
              <Separator className="flex-1 opacity-20" />
            </h4>

            {product.productType === "STRATEGY" &&
              renderStrategyStats(product as MarketplaceStrategy)}
            {product.productType === "AI_MODEL" &&
              renderAIStats(product as AIModelProduct)}
            {product.productType === "SHOP_ITEM" && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-sm italic text-muted-foreground/80 text-center">
                {tConf("stats.noPerformance")}
              </div>
            )}

            {/* Author Line */}
            <div className="flex items-center justify-between pt-2 px-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-muted to-muted-foreground/20 border flex items-center justify-center">
                  <User className="h-2.5 w-2.5" />
                </div>
                <span>
                  {product.author.username || tConf("author.anonymous")}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="text-[10px] bg-muted/50 text-muted-foreground font-medium border-none px-1.5 h-4"
              >
                {product.inventoryType === "UNLOCK"
                  ? tConf("inventoryType.unlock")
                  : tConf("inventoryType.consumable")}
              </Badge>
            </div>
          </div>

          {/* 3. Pricing & Verification */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 flex items-center gap-2">
              {tConf("paymentDetails")}
              <Separator className="flex-1 opacity-20" />
            </h4>

            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-500" />
                {tConf("receipt.totalCharge")}
              </h4>
              <div className="space-y-2 text-sm">
                {/* Unit Price */}
                <div className="flex justify-between text-muted-foreground">
                  <span>{tConf("receipt.unitPrice")}</span>
                  <span className="text-foreground font-medium">
                    {isFree
                      ? tConf("receipt.free")
                      : `${product.price.toLocaleString()} CC`}
                  </span>
                </div>
                {/* Current Balance */}
                <div className="flex justify-between text-muted-foreground">
                  <span>{tConf("receipt.currentBalance")}</span>
                  <span className="text-foreground font-medium">
                    {currentBalance.toLocaleString()} CC
                  </span>
                </div>
                {/* Estimated Remaining */}
                {!isFree && (
                  <div
                    className={`flex justify-between ${isInsufficient ? "text-red-400" : "text-emerald-400"}`}
                  >
                    <span>{tConf("receipt.estimatedBalance")}</span>
                    <span>{estimatedBalance.toLocaleString()} CC</span>
                  </div>
                )}
                <Separator className="my-2" />
                {/* Total */}
                <div className="flex justify-between font-bold">
                  <span
                    className={isFree ? "text-emerald-500" : "text-foreground"}
                  >
                    {isFree
                      ? tConf("receipt.free")
                      : tConf("receipt.totalCharge")}
                  </span>
                  <span
                    className={`text-lg ${isFree ? "text-emerald-500" : "text-foreground"}`}
                  >
                    {isFree ? "0" : product.price.toLocaleString()} CC
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning for paid credits or insufficient funds */}
          {(isInsufficient || (isPaidCreditOnly && !isFree)) && (
            <div
              className={`p-3.5 rounded-xl border flex gap-3 ${
                isInsufficient
                  ? "bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-500"
                  : "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-500"
              }`}
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed font-medium">
                {isInsufficient
                  ? t("insufficientCredit")
                  : tConf("warnings.paidCreditOnly")}
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="px-7 pb-8 pt-2 flex flex-col sm:flex-row gap-3">
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="flex-1 h-11 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              {tCommon("cancel")}
            </Button>
          </DialogClose>
          <Button
            onClick={onConfirm}
            disabled={isPending || isInsufficient}
            className={`flex-1 h-11 text-xs font-black uppercase tracking-widest shadow-lg transition-all ${
              isInsufficient
                ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                : isFree
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/10"
            }`}
          >
            {isPending ? (
              <Spinner className="h-4 w-4 text-current" />
            ) : (
              <span className="flex items-center gap-2">
                {isFree
                  ? tConf("buttons.claimNow")
                  : tConf("buttons.confirmPurchase")}
                {!isInsufficient && (
                  <ChevronRight className="h-3 w-3 opacity-50" />
                )}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
