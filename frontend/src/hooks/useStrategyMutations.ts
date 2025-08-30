// file: frontend/src/hooks/useStrategyMutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";

// --- 마켓 등록/수정 뮤테이션 ---
interface ListStrategyPayload {
  strategyId: string;
  listingData: {
    price: number;
    category: string;
    positionType: "LongOnly" | "ShortOnly" | "LongShort";
  };
}

const listStrategyApiFn = ({
  strategyId,
  listingData,
}: ListStrategyPayload) => {
  return apiClient.post(`/strategies/${strategyId}/list`, listingData);
};

export const useListStrategyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: listStrategyApiFn,
    onSuccess: () => {
      toast.success(
        "전략이 마켓플레이스에 성공적으로 등록/업데이트되었습니다."
      );
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] }); // 나의 전략 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["marketplaceStrategies"] }); // 마켓 목록 새로고침
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "처리 중 오류가 발생했습니다."
      );
    },
  });
};

// --- 여기에 기존 StrategyCard에 있던 삭제, 공개/비공개 뮤테이션 로직도 옮겨오면 좋습니다 ---
