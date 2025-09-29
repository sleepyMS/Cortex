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
import { Wallet, ShoppingBag, Gift, AlertCircle } from "lucide-react";

// 차트 라이브러리
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";

// API 응답 타입 정의 (schemas.py 기반)
interface CreditBalanceSummary {
  totalBalance: number;
  cashCreditBalance: number; // 유료 크레딧
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
  const purchasedCredits = creditData?.cashCreditBalance ?? 0;
  const bonusCredits = (creditData?.totalBalance ?? 0) - purchasedCredits;

  const chartData = [
    { name: t("purchased"), value: purchasedCredits },
    { name: t("bonus"), value: bonusCredits },
  ];

  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))"];

  return (
    <TooltipProvider>
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
                <RechartsTooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
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
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-pointer">{t("bonus")}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("bonusTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-semibold">
                {bonusCredits.toLocaleString()}
              </span>
            </div>
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
