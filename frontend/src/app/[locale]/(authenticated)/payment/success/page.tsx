// file: frontend/src/app/[locale]/payment/success/page.tsx
"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";

import apiClient from "@/lib/apiClient";
import { Order } from "@/types/marketplace";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

// --- 실제 로직을 처리할 내부 컴포넌트 ---
const SuccessPageContent = () => {
  const t = useTranslations("PaymentSuccessPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  // 1. URL의 orderId를 사용하여 백엔드에 주문 상태를 조회하는 쿼리
  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useQuery<Order>({
    queryKey: ["orderStatus", orderId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/marketplace/orders/${orderId}`);
      return data;
    },
    // 웹훅 처리 시간을 고려하여, 상태가 'PENDING'이면 2초마다 다시 조회 (폴링)
    refetchInterval: (query) => {
      const orderData = query.state.data as Order | undefined;
      return orderData?.status === "PENDING" ? 2000 : false;
    },
    enabled: !!orderId, // orderId가 URL에 존재할 때만 쿼리 실행
    retry: 2,
  });

  // --- 렌더링 로직 ---

  // 로딩 중이거나, 아직 주문 정보가 없을 때
  if (isLoading || !order) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <Spinner size="lg" />
        <h2 className="mt-4 text-2xl font-semibold">{t("verifyingTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("verifyingDescription")}
        </p>
      </div>
    );
  }

  // 쿼리 에러 발생 시
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>
          {(error as any)?.response?.data?.detail || error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // 최종 주문 상태에 따라 다른 UI 렌더링
  return (
    <div className="flex flex-col items-center justify-center text-center">
      {order.status === "COMPLETED" && (
        <>
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-3xl font-bold">{t("successTitle")}</h2>
          <p className="mt-2 text-muted-foreground">
            {t("successDescription")}
          </p>
          <div className="mt-6 p-4 border rounded-md text-left text-sm w-full max-w-md">
            <p>
              <strong>{t("orderIdLabel")}:</strong> {order.id}
            </p>
            <p>
              <strong>{t("totalAmountLabel")}:</strong>{" "}
              {new Intl.NumberFormat("ko-KR").format(order.totalAmount)}원
            </p>
          </div>
        </>
      )}

      {order.status === "FAILED" ||
        (order.status === "CANCELED" && (
          <>
            <XCircle className="h-16 w-16 text-destructive" />
            <h2 className="mt-4 text-3xl font-bold">{t("failureTitle")}</h2>
            <p className="mt-2 text-muted-foreground">
              {t("failureDescription")}
            </p>
          </>
        ))}

      <div className="mt-8 flex gap-4">
        <Button onClick={() => router.push("/inventory")}>
          {t("goToInventory")}
        </Button>
        <Button variant="outline" onClick={() => router.push("/marketplace")}>
          {t("continueShopping")}
        </Button>
      </div>
    </div>
  );
};

// --- 페이지 진입점 ---
export default function PaymentSuccessPage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
      <Suspense fallback={<Spinner size="lg" />}>
        <SuccessPageContent />
      </Suspense>
    </div>
  );
}
