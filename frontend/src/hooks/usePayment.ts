// file: frontend/src/hooks/usePayment.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

// 백엔드 /checkout API 응답 타입 (schemas.py의 OrderCreateResponse와 일치)
interface CheckoutData {
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail: string;
}

// 결제창 호출 함수
const requestTossPayment = async (checkoutData: CheckoutData) => {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY; // 👈 위젯용 키 사용
  if (!clientKey) {
    throw new Error("Toss Payments 클라이언트 키가 설정되지 않았습니다.");
  }
  const tossPayments = await loadTossPayments(clientKey);
  const widgets = tossPayments.widgets({
    customerKey: checkoutData.customerKey,
  });

  // TODO: 결제 UI 렌더링 후 requestPayment 호출
  // 이 부분은 실제 결제 페이지 UI와 결합되어야 합니다.
  // 문서 예제처럼 renderPaymentMethods, renderAgreement를 먼저 호출해야 합니다.

  return widgets.requestPayment({
    orderId: checkoutData.orderId,
    orderName: checkoutData.orderName,
    successUrl: `${window.location.origin}/payment/success?orderId=${checkoutData.orderId}`,
    failUrl: `${window.location.origin}/payment/fail`,
    customerEmail: checkoutData.customerEmail,
    customerName: checkoutData.customerName,
  });
};

export const usePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestTossPayment,
    onSuccess: () => {
      // 결제창 호출이 성공하면, 사용자는 토스 페이지로 이동합니다.
      // 실제 데이터 무효화는 성공/실패 페이지에서 처리하거나 웹훅을 통해 이루어지므로
      // 여기서는 특별한 동작이 필요 없을 수 있습니다.
      // 필요하다면 관련 쿼리를 무효화합니다.
      queryClient.invalidateQueries({ queryKey: ["userSubscription", "me"] });
      queryClient.invalidateQueries({ queryKey: ["userInventory"] });
    },
    onError: (error) => {
      toast.error(`결제창 호출에 실패했습니다: ${error.message}`);
    },
  });
};
