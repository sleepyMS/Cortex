"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import apiClient from "@/lib/apiClient";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { BarChart2, DollarSign, User, Calendar, Inbox } from "lucide-react";

// UI 컴포넌트
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AlertTriangle } from "lucide-react";
import { PurchasedStrategy } from "@/hooks/useInventory";

// API 호출 함수
const fetchPurchasedStrategies = async (): Promise<PurchasedStrategy[]> => {
  const { data } = await apiClient.get("/users/me/purchased-strategies");
  return data;
};

/**
 * 단일 구매 전략 카드를 렌더링하는 내부 컴포넌트
 */
const PurchasedStrategyCard = ({
  strategy,
}: {
  strategy: PurchasedStrategy;
}) => {
  const t = useTranslations("Inventory.purchasedStrategies");
  const router = useRouter();

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg">{strategy.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm">
        <div className="flex items-center text-muted-foreground">
          <User className="h-4 w-4 mr-2" />
          <span>
            {t("authorLabel")}:{" "}
            <span className="font-semibold text-foreground">
              {strategy.authorUsername}
            </span>
          </span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <DollarSign className="h-4 w-4 mr-2" />
          <span>
            {t("pricePaidLabel")}:{" "}
            <span className="font-semibold text-foreground">
              ${strategy.pricePaid.toFixed(2)}
            </span>
          </span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <Calendar className="h-4 w-4 mr-2" />
          <span>
            {t("purchasedAtLabel")}:{" "}
            <span className="font-semibold text-foreground">
              {format(new Date(strategy.purchasedAt), "yyyy-MM-dd")}
            </span>
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={() =>
            router.push(`/backtester?strategyId=${strategy.strategyId}`)
          }
        >
          <BarChart2 className="h-4 w-4 mr-2" />
          {t("runBacktestButton")}
        </Button>
      </CardFooter>
    </Card>
  );
};

/**
 * 구매한 전략 목록 전체를 렌더링하는 메인 컴포넌트
 */
export function PurchasedStrategiesView() {
  const t = useTranslations("Inventory.purchasedStrategies");
  const {
    data: strategies,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["purchasedStrategies"],
    queryFn: fetchPurchasedStrategies,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="mt-8 max-w-lg mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("loadErrorTitle")}</AlertTitle>
        <AlertDescription>{error?.message}</AlertDescription>
        <Button onClick={() => refetch()} className="mt-4">
          {t("retryButton")}
        </Button>
      </Alert>
    );
  }

  return (
    <div>
      {strategies && strategies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {strategies.map((strategy) => (
            <PurchasedStrategyCard
              key={strategy.purchaseId}
              strategy={strategy}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/50 rounded-lg flex flex-col items-center">
          <Inbox className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-semibold mt-4">{t("emptyTitle")}</h3>
          <p className="text-muted-foreground mt-2">{t("emptyDescription")}</p>
        </div>
      )}
    </div>
  );
}
