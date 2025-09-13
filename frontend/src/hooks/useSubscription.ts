// file: frontend/src/hooks/useSubscription.ts
import apiClient from "@/lib/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Subscription {
  id: string;
  planId: string;
  status: string;
  startedAt: string;
  expiredAt: string | null;
}

interface RegisterCardPayload {
  authKey: string;
  planId: string;
}

/**
 * 현재 로그인한 사용자의 구독 정보 조회
 */
export const useUserSubscriptionQuery = () => {
  return useQuery<Subscription>({
    queryKey: ["userSubscription", "me"],
    queryFn: async () => {
      const response = await apiClient.get("/subscriptions/me");
      return response.data;
    },
  });
};

/**
 * 구독 결제 세션을 생성하고 결제를 시작하는 뮤테이션 훅
 * - mutateAsync 기반으로 동작
 * - 성공/실패 시 토스트 메시지와 캐시 업데이트 포함
 */
export const useSubscriptionCheckoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RegisterCardPayload) => {
      const response = await apiClient.post(
        "/subscriptions/register-card",
        payload
      );
      return response.data;
    },
    onSuccess: (updatedSubscription: Subscription) => {
      // 카드 등록 및 첫 결제 요청이 성공적으로 서버에 전달되었습니다.
      // 실제 구독 상태는 웹훅에 의해 확정되므로 약간의 지연이 있을 수 있음.
      toast.success(
        "카드가 성공적으로 등록되었으며, 첫 구독료 결제가 시작되었습니다."
      );

      // 최신 구독 정보로 캐시 즉시 업데이트
      queryClient.setQueryData(["userSubscription", "me"], updatedSubscription);
    },
    onError: (err: any) => {
      let errorMessage = "카드 등록 중 오류가 발생했습니다.";

      // FastAPI 422 오류 등 Validation 에러 처리
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
