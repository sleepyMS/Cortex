// file: frontend/src/hooks/useStrategyMutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { Strategy } from "@/types/strategy";

// =================================================================
// #1. 마켓플레이스 등록/수정 뮤테이션
// =================================================================
interface ListStrategyPayload {
  strategyId: string;
  price: number;
  category: string;
  positionType: "LongOnly" | "ShortOnly" | "LongShort";
  representativeBacktestId?: string;
}

const listStrategyApiFn = (listingData: ListStrategyPayload) => {
  return apiClient.post(`/marketplace/listings`, listingData);
};

export const useListStrategyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: listStrategyApiFn,
    onSuccess: () => {
      toast.success(
        "전략이 마켓플레이스에 성공적으로 등록/업데이트되었습니다."
      );
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
      queryClient.invalidateQueries({ queryKey: ["marketplaceProducts"] });
    },
    onError: (error: any) => {
      // FastAPI 422 에러는 error.response.data.detail에 배열 형태로 정보가 담겨옵니다.
      // 그 외의 에러는 error.response.data.detail에 문자열이 담겨옵니다.
      let errorMessage = "마켓 등록 중 오류가 발생했습니다.";
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // 첫 번째 에러 메시지를 사용합니다. 예: "price: 가격은 0 이상이어야 합니다."
          const firstError = error.response.data.detail[0];
          errorMessage = `${firstError.loc.join(".")}: ${firstError.msg}`;
        } else {
          errorMessage = error.response.data.detail;
        }
      }
      toast.error(errorMessage);
    },
  });
};

// =================================================================
// #2. 마켓플레이스 판매 중단 뮤테이션
// =================================================================
const unlistStrategyApiFn = (productId: string) => {
  return apiClient.delete(`/marketplace/listings/${productId}`);
};

export const useUnlistStrategyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unlistStrategyApiFn,
    onSuccess: () => {
      toast.success("전략이 마켓플레이스에서 판매 중단 처리되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
      queryClient.invalidateQueries({ queryKey: ["marketplaceProducts"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail ||
          "판매 중단 처리 중 오류가 발생했습니다."
      );
    },
  });
};

// =================================================================
// #3. [신규] 전략 삭제 뮤테이션
// =================================================================
const deleteStrategyApiFn = (strategyId: string) => {
  return apiClient.delete(`/strategies/${strategyId}`);
};

export const useDeleteStrategyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStrategyApiFn,
    onSuccess: () => {
      toast.success("전략이 성공적으로 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "전략 삭제 중 오류가 발생했습니다."
      );
    },
  });
};

// =================================================================
// #4. [신규] 전략 공개/비공개 전환 뮤테이션
// =================================================================
interface TogglePublicPayload {
  strategyId: string;
  isPublic: boolean;
}

const togglePublicApiFn = ({ strategyId, isPublic }: TogglePublicPayload) => {
  return apiClient.put(`/strategies/${strategyId}`, { isPublic: !isPublic });
};

export const useTogglePublicStrategyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: togglePublicApiFn,
    onSuccess: (response: any) => {
      const updatedStrategy = response.data;
      toast.success(
        updatedStrategy.isPublic
          ? "전략이 '공개' 상태로 변경되었습니다."
          : "전략이 '비공개' 상태로 변경되었습니다."
      );
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "상태 변경 중 오류가 발생했습니다."
      );
    },
  });
};
