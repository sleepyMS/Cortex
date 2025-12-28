"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import apiClient from "@/lib/apiClient";

// UI & 아이콘
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { Wallet, ShoppingBag, Gift, AlertCircle, Clock } from "lucide-react";

// 차트 라이브러리
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "@/lib/utils";

// API 응답 타입 정의 (schemas.py 기반)
interface CreditBalanceSummary {
  totalBalance: number;
  cashCreditBalance: number;
  breakdown: {
    purchased: number;
    expiringWeekly: number;
    event: { amount: number; expiresAt: string }[];
  };
}

export function CreditSummaryCard() {
  const t = useTranslations("Dashboard.credits.summaryCard");
  const router = useRouter();

  const {
    data: creditData,
    isLoading,
    isError,
  } = useQuery<CreditBalanceSummary>({
    queryKey: ["creditBalance"],
    queryFn: async () => (await apiClient.get("/users/me/credit-balance")).data,
  });

  // 로딩 상태 UI
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48">
          <Skeleton className="h-32 w-32 rounded-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }

  // 에러 상태 UI
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("error.title")}</AlertTitle>
            <AlertDescription>{t("error.description")}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 데이터 기반 차트 및 정보 준비
  const purchasedCredits = creditData?.breakdown.purchased ?? 0;
  const weeklyCredits = creditData?.breakdown.expiringWeekly ?? 0;
  const eventCredits =
    creditData?.breakdown.event.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const totalBonusCredits = weeklyCredits + eventCredits;

  // 차트 데이터는 기존과 같이 '유료'와 '무료(보너스) 전체'로 단순하게 유지합니다.
  const chartData = [
    { name: "purchased", value: purchasedCredits },
    { name: "bonus", value: totalBonusCredits },
  ];

  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))"];

  const CustomTooltip = ({ active, payload, label }: any) => {
    const t = useTranslations("Dashboard.credits.summaryCard");

    if (active && payload && payload.length) {
      const data = payload[0]; // 현재 호버된 데이터 조각
      return (
        <div className="p-3 min-w-36 bg-popover text-popover-foreground border rounded-lg shadow-md">
          <p className="text-xs text-muted-foreground">
            {t("totalBalance")}
            {" : "}
            {(creditData?.totalBalance ?? 0).toLocaleString()}
          </p>
          <span className="text-sm font-semibold">{t(data.name)}</span>
          {" : "}
          <span className="font-mono text-lg font-bold">
            {data.value.toLocaleString()}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative flex items-center justify-center h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value, name) => [
                    typeof value === "number"
                      ? value.toLocaleString()
                      : String(value ?? 0),
                    t(name as "purchased" | "bonus"),
                  ]}
                  wrapperStyle={{ zIndex: 1000 }}
                  content={<CustomTooltip />}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-sm text-muted-foreground">
                {t("totalBalance")}
              </span>
              <span className="text-4xl font-bold tracking-tighter">
                {(creditData?.totalBalance ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {/* 1. 유료 크레딧 */}
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-pointer">{t("purchased")}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("purchasedTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-semibold">
                {purchasedCredits.toLocaleString()}
              </span>
            </div>

            {/* 2. 주간 보상 크레딧 (출석 등) */}
            {weeklyCredits > 0 && (
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-pointer">{t("weeklyBonus")}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("weeklyBonusTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Clock className="h-3 w-3 text-amber-500" />
                </div>
                <span className="font-semibold">
                  {weeklyCredits.toLocaleString()}
                </span>
              </div>
            )}

            {/* 3. 이벤트 크레딧 (쿠폰 등) */}
            {eventCredits > 0 && (
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted-foreground/70" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-pointer">{t("eventBonus")}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("eventBonusTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Clock className="h-3 w-3 text-amber-500" />
                </div>
                <span className="font-semibold">
                  {eventCredits.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => router.push("/marketplace?tab=SHOP_ITEM")}
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            {t("purchaseButton")}
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
