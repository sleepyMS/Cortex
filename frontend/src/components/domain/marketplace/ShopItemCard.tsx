"use client";

import { useTranslations } from "next-intl";
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
import { cn } from "@/lib/utils";
import { ShopItem } from "@/types/marketplace";
import * as LucideIcons from "lucide-react"; // Lucide 아이콘 전체를 import

interface ShopItemCardProps {
  item: ShopItem;
  onPurchase: (itemId: string) => void;
  isPurchasing: boolean;
}

// 백엔드에서 받은 아이콘 이름(string)을 실제 아이콘 컴포넌트로 매핑하는 객체
const ICON_MAP: { [key: string]: React.ElementType } = {
  TestTubeDiagonal: LucideIcons.TestTubeDiagonal,
  Tag: LucideIcons.Tag,
  Gift: LucideIcons.Gift, // 향후 '향수 아이템' 등을 위한 아이콘 예시
  Zap: LucideIcons.Zap,
  // 필요에 따라 Lucide 아이콘을 계속 추가
};

export const ShopItemCard = ({
  item,
  onPurchase,
  isPurchasing,
}: ShopItemCardProps) => {
  const t = useTranslations("Marketplace");

  // 백엔드에서 받은 아이콘 이름으로 실제 아이콘 컴포넌트를 동적으로 선택
  const IconComponent =
    ICON_MAP[item.displayProperties.icon] || LucideIcons.HelpCircle;

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

  return (
    <Card className="flex flex-col h-full border-2 border-transparent hover:border-primary transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{item.name}</CardTitle>
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
      <CardContent className="flex-grow space-y-3 text-sm">
        {/* ▼▼▼ [핵심] 백엔드에서 보내준 stats 배열을 동적으로 렌더링 ▼▼▼ */}
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
        {/* ▲▲▲ [완료] ▲▲▲ */}
      </CardContent>
      <CardFooter className="flex-col items-stretch pt-4 border-t">
        <div className="text-3xl font-bold text-right mb-4">
          ${item.price.toFixed(2)}
        </div>
        <Button onClick={() => onPurchase(item.id)} disabled={isPurchasing}>
          {isPurchasing ? t("purchasing") : t("purchaseButton")}
        </Button>
      </CardFooter>
    </Card>
  );
};
