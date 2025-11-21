// file: frontend/src/hooks/useSubscription.ts
import apiClient from "@/lib/apiClient";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";

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

interface ChangePlanPayload {
  planId: string;
}

/**
 * 구독 플랜 변경 뮤테이션 훅
 */
export const useSubscriptionChangeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ChangePlanPayload) => {
      const response = await apiClient.post(
        "/subscriptions/change-plan",
        payload
      );
      return response.data;
    },
    onSuccess: (updatedSubscription: Subscription) => {
      toast.success("구독 플랜이 성공적으로 변경되었습니다.");
      queryClient.setQueryData(["userSubscription", "me"], updatedSubscription);
    },
    onError: (err: any) => {
      let errorMessage = "플랜 변경 중 오류가 발생했습니다.";
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      toast.error(errorMessage);
    },
  });
};

/**
 * 카드 변경(빌링키 업데이트) 뮤테이션 훅
 * - authKey와 planId를 받아 백엔드에 빌링키 업데이트 요청
 */
export function useUpdateCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { authKey: string; planId: string }) => {
      const response = await apiClient.post(
        "/subscriptions/update-billing-key",
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("결제 수단이 성공적으로 변경되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["userSubscription", "me"] });
    },
    onError: (err: any) => {
      let errorMessage = "결제 수단 변경 중 오류가 발생했습니다.";
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      toast.error(errorMessage);
    },
  });
}

export function useCancelPlanChangeMutation() {
  const queryClient = useQueryClient();
  const updateSubscription = useUserStore((state) => state.updateSubscription);

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(
        "/subscriptions/cancel-plan-change"
      );
      return response.data;
    },
    // Optimistic Update: 서버 응답 전에 UI 즉시 업데이트
    onMutate: async () => {
      // Zustand store에서 현재 subscription 가져오기
      const currentUser = useUserStore.getState().user;
      const previousSubscription = currentUser?.subscription;

      // UI를 즉시 업데이트 (next_plan 제거)
      if (previousSubscription) {
        updateSubscription({
          ...previousSubscription,
          nextPlanId: undefined,
          nextPlan: undefined,
        });
      }

      // 롤백용 컨텍스트 반환
      return { previousSubscription };
    },
    // 성공 시: 서버 응답으로 최종 확인
    onSuccess: (data) => {
      toast.success("플랜 변경 예약이 취소되었습니다.");

      // 서버에서 받은 최신 subscription 데이터로 업데이트
      if (data.subscription) {
        updateSubscription(data.subscription);
      }

      // React Query 캐시도 무효화 (다른 곳에서 사용할 수 있으므로)
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    // 실패 시: Optimistic Update 롤백
    onError: (error: any, variables, context) => {
      // 이전 데이터로 복원
      if (context?.previousSubscription) {
        updateSubscription(context.previousSubscription);
      }

      const errorMessage =
        error?.response?.data?.detail || "플랜 변경 예약 취소에 실패했습니다.";
      toast.error(errorMessage);
    },
  });
}
