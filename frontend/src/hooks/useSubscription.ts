// frontend/src/hooks/useSubscription.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { Plan, Subscription } from "@/types/subscription";
import { usePaymentMutation } from "./usePayment";

// 1. 뮤테이션에 전달할 데이터 타입을 정의합니다.
interface RegisterCardPayload {
  planId: string;
  authKey: string;
}

// 1. 모든 구독 플랜 목록을 가져오는 훅
export const usePlans = () => {
  return useQuery<Plan[]>({
    queryKey: ["plans"],
    // API 명세서(06_API_Specification.md)에 정의된 GET /plans 엔드포인트 사용
    queryFn: async () => (await apiClient.get("/plans")).data,
  });
};

// 2. 현재 사용자의 구독 상태를 가져오는 훅
export const useUserSubscription = () => {
  return useQuery<Subscription>({
    queryKey: ["userSubscription", "me"],
    // API 명세서(06_API_Specification.md)에 정의된 GET /subscriptions/me 엔드포인트 사용
    queryFn: async () => (await apiClient.get("/subscriptions/me")).data,
    retry: false, // 구독하지 않았을 경우 404 에러가 정상일 수 있으므로 재시도 방지
  });
};

// 3. 구독 결제 세션을 생성하고 결제를 시작하는 뮤테이션 훅
export const useSubscriptionCheckoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // 2. mutationFn이 새로운 payload 타입을 받도록 수정합니다.
    mutationFn: async (payload: RegisterCardPayload) => {
      // 3. API 엔드포인트 주소를 '/register-card'로 변경합니다.
      const response = await apiClient.post(
        "/subscriptions/register-card",
        payload
      );
      return response.data;
    },
    onSuccess: (updatedSubscription) => {
      // 카드 등록 및 첫 결제 요청이 성공적으로 서버에 전달되었습니다.
      // 실제 구독 상태는 웹훅이 처리하므로, 잠시 후 상태가 갱신될 것입니다.
      toast.success(
        "카드가 성공적으로 등록되었으며, 첫 구독료 결제가 시작되었습니다."
      );

      // 서버로부터 받은 최신 구독 정보로 캐시를 즉시 업데이트합니다.
      queryClient.setQueryData(["userSubscription", "me"], updatedSubscription);
    },
    onError: (err: any) => {
      let errorMessage = "카드 등록 중 오류가 발생했습니다.";

      // FastAPI 422 오류 등 상세 메시지가 있는 경우, 첫 번째 메시지를 사용
      if (
        err.response?.data?.detail &&
        Array.isArray(err.response.data.detail)
      ) {
        errorMessage = err.response.data.detail[0].msg;
      }
      // 일반적인 오류 메시지가 있는 경우
      else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }

      toast.error(errorMessage);
    },
  });
};
