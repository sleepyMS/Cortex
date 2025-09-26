"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();

  // 1. URL로부터 결제 승인에 필요한 파라미터를 가져옵니다.
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  // 2. [추가] 백엔드에 결제 승인을 요청하는 Mutation을 정의합니다.
  const { mutate: confirmPayment, isPending: isConfirming } = useMutation({
    mutationFn: (variables: {
      paymentKey: string;
      orderId: string;
      amount: number;
    }) => apiClient.post("/marketplace/payments/confirm", variables),
    onSuccess: () => {
      // 승인 요청이 성공하면, 서버에서 Celery 작업이 시작됩니다.
      // 이제 주문의 최종 상태를 알기 위해 쿼리를 무효화하여 다시 가져오게 합니다.
      toast.success(t("approvalSuccessToast"));
      queryClient.invalidateQueries({ queryKey: ["orderStatus", orderId] });
    },
    onError: (error: any) => {
      // 승인 요청 자체가 실패한 경우 (네트워크, 금액 불일치 등)
      toast.error(t("approvalErrorToast"), {
        description: error.response?.data?.detail || error.message,
      });
      // 에러 발생 시에도 주문 상태는 계속 확인합니다.
      queryClient.invalidateQueries({ queryKey: ["orderStatus", orderId] });
    },
  });

  // 3. [수정] 주문의 최종 상태를 확인하기 위한 Query (기존 폴링 로직 활용)
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
    // 웹훅 처리 및 Celery 작업 시간을 고려하여, 상태가 'PENDING' 또는 'PAID'이면
    // 2초마다 다시 조회합니다.
    refetchInterval: (query) => {
      const orderData = query.state.data as Order | undefined;
      return ["PENDING", "PAID"].includes(orderData?.status ?? "")
        ? 2000
        : false;
    },
    enabled: !!orderId, // orderId가 URL에 존재할 때만 쿼리 실행
    retry: 2,
  });

  // 4. [추가] 페이지 로드 시, URL 파라미터가 유효하면 결제 승인 요청을 한 번만 보냅니다.
  useEffect(() => {
    // 이미 승인 요청을 보냈거나, 파라미터가 없으면 실행하지 않습니다.
    if (isConfirming || !paymentKey || !orderId || !amount) {
      return;
    }

    confirmPayment({
      paymentKey,
      orderId,
      amount: parseInt(amount, 10),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentKey, orderId, amount]);

  // --- 렌더링 로직 ---

  // 결제 승인 요청 중이거나, 최종 주문 정보를 로딩 중일 때
  if (isConfirming || (isOrderLoading && !order)) {
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
