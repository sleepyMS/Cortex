// file: frontend/src/components/domain/marketplace/ShopItemCard.tsx
"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart, Coins, CircleAlert, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation"; // useRouter 추가
import { useUserStore } from "@/store/userStore"; // Zustand 스토어 import
import { cn } from "@/lib/utils";
import { ShopItem } from "@/types/marketplace";
import { ICON_MAP } from "@/lib/iconMap"; // 아이콘 맵 import

// UI 컴포넌트 import
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

/**
 * ShopItemCard 컴포넌트에 전달될 props 타입 정의
 */
interface ShopItemCardProps {
  item: ShopItem;
  isOwned: boolean;
  onPurchase: () => void;
  isPurchasing: boolean;
  onChargeCredits: () => void;
}

export const ShopItemCard = ({
  item,
  isOwned,
  onPurchase,
  isPurchasing,
  onChargeCredits,
}: ShopItemCardProps) => {
  const t = useTranslations("Marketplace");
  const tCommon = useTranslations("Common");
  const { creditBalance } = useUserStore(); // 스토어에서 크레딧 잔액 가져오기
  const router = useRouter();

  // 아이템(소모성)은 전체 크레딧으로 구매 가능
  const hasEnoughCredits = creditBalance
    ? creditBalance.totalBalance >= item.price
    : false;

  // 백엔드에서 받은 아이콘 이름으로 실제 아이콘 컴포넌트를 동적으로 선택
  const IconComponent =
    ICON_MAP[item.productMetadata.icon] || ICON_MAP.HelpCircle;

  // 아이템 등급(tier)에 따라 다른 Badge 스타일을 반환하는 함수
  const getTierClass = (tier?: string) => {
    switch (tier) {
      case "GOLD":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case "SILVER":
        return "bg-gray-500/20 text-gray-600 border-gray-500/30";
      case "BRONZE":
        return "bg-orange-700/20 text-orange-800 border-orange-700/30";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  /**
   * 아이템의 inventoryType과 isOwned 상태에 따라 올바른 구매 버튼을 렌더링하는 함수
   */
  const renderPurchaseButton = () => {
    if (item.inventoryType === "UNLOCK" && isOwned) {
      return (
        <Button disabled className="w-full">
          <CheckCircle className="mr-2 h-4 w-4" />
          {t("ownedButton")}
        </Button>
      );
    }

    // 1. 크레딧 잔액 정보가 아직 로드되지 않았다면 스켈레톤 UI 표시
    if (!creditBalance) {
      return <Button disabled className="w-full h-10 animate-pulse" />;
    }

    // 2. 크레딧이 부족할 경우
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

    // 3. 크레딧이 충분할 경우
    return (
      <Button onClick={onPurchase} disabled={isPurchasing} className="w-full">
        {isPurchasing ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <ShoppingCart className="mr-2 h-4 w-4" />
        )}
        {isPurchasing
          ? t("purchasing")
          : // 버튼 텍스트에 크레딧 가격 표시
            t("purchaseForCredit", { price: item.price.toLocaleString() })}
      </Button>
    );
  };

  return (
    <Card className="flex flex-col h-full border-2 border-transparent hover:border-primary transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg pr-2">{item.name}</CardTitle>
          {/* [수정] displayProperties를 productMetadata로 변경 */}
          {item.productMetadata.tier && (
            <Badge
              className={cn(
                "shrink-0",
                getTierClass(item.productMetadata.tier)
              )}
            >
              {item.productMetadata.tier}
            </Badge>
          )}
        </div>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end space-y-3 text-sm">
        {/* [수정] displayProperties를 productMetadata로 변경 */}
        {item.productMetadata.stats?.map((stat, index) => (
          <div
            key={index}
            className="flex items-center gap-3 text-muted-foreground"
          >
            <IconComponent className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">{stat.label}:</span>
            <span className="font-bold text-foreground ml-auto">
              {stat.value}
            </span>
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex-col items-stretch pt-4 border-t bg-muted/50">
        <div className="flex items-center justify-end text-3xl font-bold text-right mb-4">
          <Coins className="h-6 w-6 text-yellow-500 mr-2" />
          {item.price.toLocaleString()}
          <span className="text-xl font-medium text-muted-foreground ml-1">
            CC
          </span>
        </div>
        {renderPurchaseButton()}
      </CardFooter>
    </Card>
  );
};
