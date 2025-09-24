"use client";

import { useTranslations } from "next-intl";
import { MarketplaceStrategyDetail } from "@/types/marketplace";
import { useUserStore } from "@/store/userStore";
import { format, isValid } from "date-fns";

// --- UI 컴포넌트 ---
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

// --- 아이콘 ---
import {
  Tag,
  UserCircle,
  ShoppingCart,
  CheckCircle,
  CalendarDays,
  Coins,
  CircleAlert,
} from "lucide-react";

interface StrategyDetailHeaderProps {
  /** 표시할 전략의 상세 데이터 */
  strategy: MarketplaceStrategyDetail;
  /** 구매 버튼 클릭 시 호출될 함수 */
  onPurchase: () => void;
  /** 현재 이 아이템의 구매가 진행 중인지 여부 */
  isPurchasing: boolean;
  /** 사용자가 이 전략을 소유하고 있는지 여부 */
  isOwned: boolean;
  /** 크레딧 충전 버튼 클릭 시 호출될 함수 */
  onChargeCredits: () => void;
}

export const StrategyDetailHeader = ({
  strategy,
  onPurchase,
  isPurchasing,
  isOwned,
  onChargeCredits,
}: StrategyDetailHeaderProps) => {
  const t = useTranslations("Marketplace.strategyDetail");
  const { creditBalance } = useUserStore();

  // 전략은 '유료 크레딧'으로만 구매 가능하므로 cashCreditBalance를 확인합니다.
  const hasEnoughCredits = creditBalance
    ? creditBalance.cashCreditBalance >= strategy.price
    : false;

  // 대표 백테스트에서 날짜 정보를 추출하고 포맷팅하는 로직
  const backtestParams = strategy.representativeBacktest?.parameters;
  const startDate = backtestParams?.startDate
    ? new Date(backtestParams.startDate)
    : null;
  const endDate = backtestParams?.endDate
    ? new Date(backtestParams.endDate)
    : null;
  const dateRangeString =
    startDate && isValid(startDate) && endDate && isValid(endDate)
      ? `${format(startDate, "yyyy.MM.dd")} - ${format(endDate, "yyyy.MM.dd")}`
      : null;

  /**
   * isOwned, isPurchasing, creditBalance 상태에 따라
   * 올바른 구매 버튼을 렌더링하는 함수
   */
  const renderPurchaseButton = () => {
    // 1. 이미 소유한 경우
    if (isOwned) {
      return (
        <Button size="lg" disabled className="w-full md:w-auto">
          <CheckCircle className="mr-2 h-5 w-5" />
          {t("ownedButton")}
        </Button>
      );
    }

    // 2. 크레딧 정보를 불러오는 중인 경우 (UX 개선)
    if (!creditBalance) {
      return (
        <Button
          size="lg"
          disabled
          className="w-full md:w-48 h-12 animate-pulse"
        />
      );
    }

    // 3. 유료 크레딧이 부족한 경우 (크레딧 충전 유도)
    if (!hasEnoughCredits) {
      return (
        <div className="flex flex-col items-stretch md:items-end gap-2">
          <Button
            size="lg"
            variant="secondary"
            onClick={onChargeCredits}
            className="w-full md:w-auto"
          >
            <Coins className="mr-2 h-5 w-5" />
            {t("chargeCreditButton")}
          </Button>
          <p className="text-xs text-destructive flex items-center justify-center md:justify-end gap-1">
            <CircleAlert className="h-3 w-3" />
            {t("insufficientPaidCredit")}
          </p>
        </div>
      );
    }

    // 4. 구매 가능한 경우
    return (
      <Button
        size="lg"
        onClick={onPurchase}
        disabled={isPurchasing}
        className="w-full md:w-auto"
      >
        {isPurchasing ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <ShoppingCart className="mr-2 h-5 w-5" />
        )}
        {isPurchasing
          ? t("purchasingButton")
          : t("purchaseForPaidCredit", {
              price: strategy.price.toLocaleString(),
            })}
      </Button>
    );
  };

  return (
    <div className="bg-card border rounded-xl p-6 md:p-8 mb-8">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">
        {/* 왼쪽 정보 영역 */}
        <div className="flex-grow">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              <span>
                {t("authorPrefix")} {strategy.author.username}
              </span>
            </div>
            {dateRangeString && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {t("backtestPeriod")}: {dateRangeString}
                </span>
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {strategy.name}
          </h1>
          {strategy.productMetadata?.category && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="text-sm py-1">
                <Tag className="mr-2 h-4 w-4" />
                {strategy.productMetadata.category}
              </Badge>
              <Badge variant="outline" className="text-sm py-1">
                {strategy.productMetadata.positionType}
              </Badge>
            </div>
          )}
        </div>

        {/* 오른쪽 가격 및 구매 버튼 영역 */}
        <div className="md:text-right flex-shrink-0">
          <p className="text-sm text-muted-foreground">{t("priceLabel")}</p>
          <div className="flex items-center justify-start md:justify-end text-4xl font-bold text-primary mb-4">
            <Coins className="h-8 w-8 text-yellow-500 mr-2" />
            {strategy.price.toLocaleString()}
            <span className="text-2xl font-medium text-muted-foreground ml-1">
              CC
            </span>
          </div>
          {renderPurchaseButton()}
        </div>
      </div>
      {strategy.description && (
        <p className="text-muted-foreground mt-6 pt-6 border-t">
          {strategy.description}
        </p>
      )}
    </div>
  );
};
