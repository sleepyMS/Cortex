// frontend/src/hooks/useSubscription.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { Plan, Subscription } from "@/types/subscription"; // (새로운 타입 정의 필요)

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
    // API 명세서(06_API_Specification.md)의 POST /subscriptions/checkout 엔드포인트 사용
    mutationFn: async (planId: string) => {
      const response = await apiClient.post("/subscriptions/checkout", {
        planId,
      });
      return response.data; // 백엔드는 여기서 결제에 필요한 정보를 반환해야 함
    },
    onSuccess: (checkoutData) => {
      // 1. 백엔드로부터 받은 checkoutData로 토스 페이먼츠 SDK를 호출
      // 예시: TossPayments.requestPayment('카드', checkoutData);
      console.log("결제창을 띄우기 위한 데이터:", checkoutData);
      toast.info("결제 페이지로 이동합니다...");

      // 실제 결제 성공 여부는 백엔드 웹훅(Webhook)이 처리하므로,
      // 프론트엔드는 결제창 호출 후 사용자의 구독 상태를 다시 조회하여 UI를 업데이트합니다.
      queryClient.invalidateQueries({ queryKey: ["userSubscription", "me"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || "결제 요청 중 오류가 발생했습니다."
      );
    },
  });
};
