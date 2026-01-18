"use client";

import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  Coins,
  CircleAlert,
  CheckCircle,
  Brain,
  TrendingUp,
  Calendar,
  Activity,
  Clock,
} from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { MarketplaceAIModel } from "@/types/marketplace";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Separator } from "@/components/ui/Separator";

interface MarketplaceAIModelCardProps {
  model: MarketplaceAIModel;
  isOwned: boolean;
  onPurchase: () => void;
  isPurchasing: boolean;
  onChargeCredits: () => void;
}

export const MarketplaceAIModelCard = ({
  model,
  isOwned,
  onPurchase,
  isPurchasing,
  onChargeCredits,
}: MarketplaceAIModelCardProps) => {
  const t = useTranslations("Marketplace");
  const { creditBalance } = useUserStore();

  const hasEnoughCredits = creditBalance
    ? creditBalance.totalBalance >= model.price
    : false;

  const renderPurchaseButton = () => {
    if (isOwned) {
      return (
        <Button disabled className="w-full">
          <CheckCircle className="mr-2 h-4 w-4" />
          {t("ownedButton")}
        </Button>
      );
    }

    if (!creditBalance) {
      return <Button disabled className="w-full h-10 animate-pulse" />;
    }

    if (!hasEnoughCredits) {
      return (
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={onChargeCredits}
            className="w-full"
          >
            <Coins className="mr-2 h-4 w-4" />
            {t("chargeCreditButton")}
          </Button>
          <p className="text-xs text-destructive text-center flex items-center justify-center gap-1">
            <CircleAlert className="h-3 w-3" />
            {t("insufficientCredit")}
          </p>
        </div>
      );
    }

    return (
      <Button onClick={onPurchase} disabled={isPurchasing} className="w-full">
        {isPurchasing ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <ShoppingCart className="mr-2 h-4 w-4" />
        )}
        {isPurchasing
          ? t("purchasing")
          : t("purchaseForCredit", { price: model.price.toLocaleString() })}
      </Button>
    );
  };

  return (
    <Card className="flex flex-col h-full border-2 border-transparent hover:border-violet-500/50 transition-all duration-300 hover:shadow-lg group">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-colors">
              <Brain className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">{model.name}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {model.modelType && (
              <Badge
                variant="outline"
                className="shrink-0 uppercase text-violet-400 border-violet-500/50 bg-violet-500/10"
              >
                {model.modelType}
              </Badge>
            )}
            {model.taskType && (
              <Badge
                variant="outline"
                className={`shrink-0 text-xs ${
                  model.taskType === "classification"
                    ? "text-blue-400 border-blue-500/50 bg-blue-500/10"
                    : "text-emerald-400 border-emerald-500/50 bg-emerald-500/10"
                }`}
              >
                {model.taskType === "classification" ? "분류" : "회귀"}
              </Badge>
            )}
          </div>
        </div>
        {/* Description removed for cleaner look */}
      </CardHeader>
      <CardContent className="flex-grow space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded">
            <Activity
              className={`h-4 w-4 ${
                model.taskType === "regression"
                  ? "text-amber-500"
                  : "text-violet-500"
              }`}
            />
            <span className="text-xs">
              {model.taskType === "regression" ? "RMSE" : "정확도"}
            </span>
            <span className="ml-auto font-medium text-foreground">
              {model.taskType === "regression"
                ? model.rmse
                  ? model.rmse.toFixed(4)
                  : "N/A"
                : model.accuracy
                  ? `${(model.accuracy * 100).toFixed(1)}%`
                  : "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs">타겟</span>
            <span className="ml-auto font-medium text-foreground text-xs">
              {model.productMetadata?.trainingSymbol || "Unknown"}
              {model.trainingTimeframe && ` · ${model.trainingTimeframe}`}
            </span>
          </div>
        </div>

        {model.trainingStartDate && model.trainingEndDate && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              학습 기간
            </div>
            <div className="text-xs bg-muted/30 p-2 rounded text-center">
              {model.trainingStartDate.slice(0, 10)} ~{" "}
              {model.trainingEndDate.slice(0, 10)}
            </div>
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>판매자</span>
          <span className="font-medium text-foreground">
            {model.author?.username || "Unknown"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch pt-4 border-t bg-muted/50">
        <div className="flex items-center justify-end text-3xl font-bold text-right mb-4">
          <Coins className="h-6 w-6 text-yellow-500 mr-2" />
          {model.price.toLocaleString()}
          <span className="text-xl font-medium text-muted-foreground ml-1">
            CC
          </span>
        </div>
        {renderPurchaseButton()}
      </CardFooter>
    </Card>
  );
};
