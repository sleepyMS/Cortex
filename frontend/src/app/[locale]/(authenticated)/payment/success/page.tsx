"use client";

import React, { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

import apiClient from "@/lib/apiClient";
import { Order } from "@/types/marketplace";
import { useUserStore } from "@/store/userStore";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const SuccessPageContent = () => {
  const t = useTranslations("PaymentSuccessPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const hasConfirmed = useRef(false);

  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const syncCreditBalance = useUserStore((state) => state.syncCreditBalance);

  const { mutate: confirmPayment, isPending: isConfirming } = useMutation({
    mutationFn: (variables: {
      paymentKey: string;
      orderId: string;
      amount: number;
    }) => apiClient.post("/marketplace/payments/confirm", variables),
    onSuccess: () => {
      toast.success(t("approvalSuccessToast"));
      queryClient.invalidateQueries({ queryKey: ["orderStatus", orderId] });
    },
    onError: (error: any) => {
      toast.error(t("approvalErrorToast"), {
        description: error.response?.data?.detail || error.message,
      });
      queryClient.invalidateQueries({ queryKey: ["orderStatus", orderId] });
    },
  });

  const {
    data: order,
    isLoading: isOrderLoading,
    isError,
    error,
  } = useQuery<Order>({
    queryKey: ["orderStatus", orderId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/marketplace/orders/${orderId}`);
      return data;
    },
    refetchInterval: (query) => {
      const orderData = query.state.data as Order | undefined;
      return ["PENDING", "PAID"].includes(orderData?.status ?? "")
        ? 2000
        : false;
    },
    enabled: !!orderId,
    retry: 2,
  });

  useEffect(() => {
    // order 데이터가 있고, 상태가 'COMPLETED'일 때만 실행합니다.
    if (order?.status === "COMPLETED") {
      console.log("✅ Order is COMPLETED. Syncing global credit balance now.");
      // 전역 스토어의 크레딧 잔액을 갱신합니다.
      syncCreditBalance();
    }
    // order.status가 변경될 때마다 이 로직을 다시 확인합니다.
  }, [order?.status, syncCreditBalance]);

  useEffect(() => {
    if (hasConfirmed.current || !paymentKey || !orderId || !amount) return;
    hasConfirmed.current = true;
    confirmPayment({
      paymentKey,
      orderId,
      amount: parseInt(amount, 10),
    });
  }, [paymentKey, orderId, amount, confirmPayment]);

  // --- [최종 개선] 렌더링 로직 ---

  // [수정] 초기 로딩 조건: isConfirming 또는 isOrderLoading 상태이면서,
  // 아직 order 데이터가 없을 때만 스피너를 보여줍니다.
  if ((isConfirming || isOrderLoading) && !order) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <Spinner size="lg" />
        <h2 className="mt-4 text-2xl font-semibold">
          {isConfirming ? t("approvingTitle") : t("verifyingTitle")}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {isConfirming ? t("approvingDescription") : t("verifyingDescription")}
        </p>
      </div>
    );
  }

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

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {order?.status === "COMPLETED" && (
        <>
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-3xl font-bold">{t("successTitle")}</h2>
          <p className="mt-2 text-muted-foreground">
            {t("successDescription")}
          </p>
          <div className="mt-6 w-full max-w-md rounded-md border p-4 text-left text-sm">
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

      {(order?.status === "FAILED" || order?.status === "CANCELED") && (
        <>
          <XCircle className="h-16 w-16 text-destructive" />
          <h2 className="mt-4 text-3xl font-bold">{t("failureTitle")}</h2>
          <p className="mt-2 text-muted-foreground">
            {t("failureDescription")}
          </p>
        </>
      )}

      {(order?.status === "PENDING" || order?.status === "PAID") && (
        <div className="flex flex-col items-center justify-center text-center">
          <Spinner size="lg" />
          <h2 className="mt-4 text-2xl font-semibold">{t("verifyingTitle")}</h2>
          <p className="mt-2 text-muted-foreground">
            {t("verifyingDescription")}
          </p>
        </div>
      )}

      {order && ["COMPLETED", "FAILED", "CANCELED"].includes(order.status) && (
        <div className="mt-8 flex gap-4">
          <Button onClick={() => router.push("/inventory")}>
            {t("goToInventory")}
          </Button>
          <Button variant="outline" onClick={() => router.push("/marketplace")}>
            {t("continueShopping")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default function PaymentSuccessPage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
      <Suspense fallback={<Spinner size="lg" />}>
        <SuccessPageContent />
      </Suspense>
    </div>
  );
}
