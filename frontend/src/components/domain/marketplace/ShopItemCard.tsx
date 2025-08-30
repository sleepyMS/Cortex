// file: frontend/src/components/domain/marketplace/ShopItemCard.tsx
"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
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
  /** 표시할 아이템의 데이터 */
  item: ShopItem;
  /** 사용자가 이 아이템을 하나 이상 보유하고 있는지 여부 */
  isOwned: boolean;
  /** 구매 버튼 클릭 시 호출될 함수 */
  onPurchase: () => void;
  /** 현재 이 아이템의 구매가 진행 중인지 여부 */
  isPurchasing: boolean;
}

export const ShopItemCard = ({
  item,
  isOwned,
  onPurchase,
  isPurchasing,
}: ShopItemCardProps) => {
  const t = useTranslations("Marketplace");

  // 백엔드에서 받은 아이콘 이름으로 실제 아이콘 컴포넌트를 동적으로 선택
  const IconComponent =
    ICON_MAP[item.displayProperties.icon] || ICON_MAP.HelpCircle;

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
    // 1. 'UNLOCK' 타입 아이템이고, 이미 보유 중이라면 '보유 중' 버튼 표시
    if (item.inventoryType === "UNLOCK" && isOwned) {
      return (
        <Button disabled className="w-full">
          {t("ownedButton")}
        </Button>
      );
    }

    // 2. 그 외 모든 경우 ('CONSUMABLE' 타입 또는 아직 구매 안 한 'UNLOCK' 타입)
    return (
      <Button onClick={onPurchase} disabled={isPurchasing} className="w-full">
        {isPurchasing ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <ShoppingCart className="mr-2 h-4 w-4" />
        )}
        {isPurchasing ? t("purchasing") : t("purchaseButton")}
      </Button>
    );
  };

  return (
    <Card className="flex flex-col h-full border-2 border-transparent hover:border-primary transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg pr-2">{item.name}</CardTitle>
          {item.displayProperties.tier && (
            <Badge
              className={cn(
                "shrink-0",
                getTierClass(item.displayProperties.tier)
              )}
            >
              {item.displayProperties.tier}
            </Badge>
          )}
        </div>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end space-y-3 text-sm">
        {/* 백엔드에서 보내준 stats 배열을 동적으로 렌더링 */}
        {item.displayProperties.stats.map((stat, index) => (
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
        <div className="text-3xl font-bold text-right mb-4">
          ${item.price.toFixed(2)}
        </div>
        {renderPurchaseButton()}
      </CardFooter>
    </Card>
  );
};
