// file: frontend/src/hooks/usePayment.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { useTranslations } from "next-intl";

// =================================================================
// [핵심] SDK 함수의 반환값으로부터 정확한 타입을 추론합니다.
// 라이브러리가 타입을 직접 export하지 않을 때 가장 안정적인 방식입니다.
// =================================================================

/**
 * loadTossPayments 함수의 Promise가 resolve하는 타입을 추론하여 명명합니다.
 */
export type TossPaymentsInstance = Awaited<ReturnType<typeof loadTossPayments>>;

/**
 * 위에서 추론한 TossPaymentsInstance 타입의 'widgets' 메소드 반환 타입을 추론하여 명명합니다.
 */
export type WidgetsInstance = ReturnType<TossPaymentsInstance["widgets"]>;

// =================================================================
// 1. 공통 타입 정의 (Interfaces)
// =================================================================

/**
 * 백엔드 API로부터 받는 주문(결제) 정보의 타입입니다.
 */
export interface CheckoutData {
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail: string;
}

/**
 * '결제창' SDK(`usePaymentWindowMutation`) 호출 시 사용되는 인자 타입입니다.
 */
interface PaymentWindowPayload {
  checkoutData: CheckoutData;
  paymentMethod: "카드"; // 필요에 따라 '가상계좌' 등 다른 결제 수단 추가 가능
}

/**
 * '결제 위젯' SDK(`requestPaymentMutation`)의 최종 결제 요청 시 사용되는 인자 타입입니다.
 */
interface PaymentWidgetPayload {
  widgets: WidgetsInstance;
  checkoutData: CheckoutData;
}

// =================================================================
// 2. 결제창 SDK용 훅 (모달/팝업 방식)
// =================================================================

/**
 * 간단한 모달/팝업 형태의 '결제창'을 호출하는 React Query 뮤테이션 훅입니다.
 * @remarks 이 훅을 사용하려면 `.env.local` 파일에 **클라이언트 키(`test_ck_...`)**를 설정해야 합니다.
 */
export const usePaymentWindowMutation = () => {
  const t = useTranslations("Payment");

  return useMutation({
    mutationFn: async ({
      checkoutData,
      paymentMethod,
    }: PaymentWindowPayload) => {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY;
      if (!clientKey || !clientKey.startsWith("test_ck_")) {
        throw new Error(
          "Toss Payments 클라이언트 키(test_ck_...)가 설정되지 않았습니다."
        );
      }

      const tossPayments: TossPaymentsInstance = await loadTossPayments(
        clientKey
      );

      // 결제창을 호출합니다.
      return tossPayments.requestPayment(paymentMethod, {
        orderId: checkoutData.orderId,
        orderName: checkoutData.orderName,
        amount: checkoutData.amount,
        customerName: checkoutData.customerName,
        customerEmail: checkoutData.customerEmail,
        successUrl: `${window.location.origin}/payment/success?orderId=${checkoutData.orderId}`,
        failUrl: `${window.location.origin}/payment/fail?orderId=${checkoutData.orderId}`,
      });
    },
    onError: (error: any) => {
      if (error.code === "USER_CANCEL") {
        toast.info(t("userCancel"));
      } else {
        toast.error(`${t("genericError")}: ${error.message}`);
      }
    },
  });
};

// =================================================================
// 3. 결제 위젯 SDK용 훅 (페이지 삽입 방식)
// =================================================================

/**
 * 페이지에 UI를 직접 삽입하는 '결제 위젯'을 위한 커스텀 훅입니다.
 * 위젯 렌더링 함수와 최종 결제 요청 뮤테이션을 반환합니다.
 * @remarks 이 훅을 사용하려면 `.env.local` 파일에 **브랜드페이 연동 키(`test_gck_...`)**를 설정해야 합니다.
 */
export const usePaymentWidget = () => {
  const t = useTranslations("Payment");
  const clientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY;

  /**
   * 지정된 DOM 요소에 결제 위젯 UI를 렌더링합니다.
   * @param selector - 위젯을 렌더링할 부모 요소의 CSS 선택자 (e.g., "#payment-widget")
   * @param amount - 결제할 금액 (정수)
   * @param customerKey - 고객 식별 키 (기본값: ANONYMOUS)
   * @returns 렌더링된 위젯 인스턴스 (`WidgetsInstance`)
   */
  const renderPaymentWidgets = async (
    selector: string,
    amount: number,
    customerKey: string = ANONYMOUS
  ): Promise<WidgetsInstance> => {
    if (!clientKey || !clientKey.startsWith("test_gck_")) {
      throw new Error(
        "Toss Payments 브랜드페이 연동 키(test_gck_...)가 설정되지 않았습니다."
      );
    }

    const tossPayments: TossPaymentsInstance = await loadTossPayments(
      clientKey
    );
    const widgets: WidgetsInstance = tossPayments.widgets({ customerKey });

    // 위젯에 결제 금액 설정
    await widgets.setAmount({ currency: "KRW", value: amount });

    // 결제 UI와 약관 UI를 동시에 렌더링
    await Promise.all([
      widgets.renderPaymentMethods({
        selector: `${selector}-methods`, // e.g., "#payment-widget-methods"
        variantKey: "DEFAULT",
      }),
      widgets.renderAgreement({
        selector: `${selector}-agreement`, // e.g., "#payment-widget-agreement"
        variantKey: "AGREEMENT",
      }),
    ]);

    return widgets;
  };

  /**
   * 렌더링된 위젯을 사용하여 최종 결제를 요청하는 React Query 뮤테이션
   */
  const requestPaymentMutation = useMutation({
    mutationFn: async ({ widgets, checkoutData }: PaymentWidgetPayload) => {
      return widgets.requestPayment({
        orderId: checkoutData.orderId,
        orderName: checkoutData.orderName,
        customerName: checkoutData.customerName,
        customerEmail: checkoutData.customerEmail,
        successUrl: `${window.location.origin}/payment/success?orderId=${checkoutData.orderId}`,
        failUrl: `${window.location.origin}/payment/fail?orderId=${checkoutData.orderId}`,
      });
    },
    onError: (error: any) => {
      if (error.code === "USER_CANCEL") {
        toast.info(t("userCancel"));
      } else {
        toast.error(`${t("genericError")}: ${error.message}`);
      }
    },
  });

  return { renderPaymentWidgets, requestPaymentMutation };
};
