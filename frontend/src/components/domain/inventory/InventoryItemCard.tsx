// file: frontend/src/components/domain/inventory/InventoryItemCard.tsx
"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { UserInventoryItem } from "@/hooks/useInventory"; // 상세 타입 import
import { ICON_MAP } from "@/lib/iconMap";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

interface InventoryItemCardProps {
  item: UserInventoryItem;
  onUseItem: (instanceId: string) => void; // 아이템 사용 핸들러
  isUsing: boolean; // 아이템 사용 뮤테이션 진행 여부
}

export const InventoryItemCard = ({
  item,
  onUseItem,
  isUsing,
}: InventoryItemCardProps) => {
  const t = useTranslations("Inventory");
  const IconComponent =
    ICON_MAP[item.displayProperties.icon] || ICON_MAP.HelpCircle;

  // 아이템 등급(tier)에 따른 Badge 스타일
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
  const isUsable =
    item.type === "OPTIMIZATION_COUPON" || item.type === "BACKTEST_CREDIT";

  return (
    <Card className={cn("flex flex-col h-full", item.isUsed && "opacity-60")}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg pr-2">{item.name}</CardTitle>
          {item.isUsed && <Badge variant="outline">{t("statusUsed")}</Badge>}
        </div>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{t("quantityLabel")}</span>
          <span className="font-bold text-foreground">{item.quantity}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{t("purchasedAtLabel")}</span>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-bold text-foreground">
                  {format(new Date(item.purchasedAt), "yyyy-MM-dd")}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {format(new Date(item.purchasedAt), "yyyy-MM-dd HH:mm:ss", {
                    locale: ko,
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
      <CardFooter>
        {isUsable && (
          <Button
            className="w-full"
            onClick={() => onUseItem(item.instanceId)}
            disabled={item.isUsed || isUsing}
          >
            {item.isUsed ? t("usedButton") : t("useButton")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
