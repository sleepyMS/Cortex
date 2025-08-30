"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { useRouter } from "@/i18n/navigation";

// 구매할 아이템의 타입과 ID를 인자로 받기 위한 타입 정의
interface PurchaseInput {
  type: "item" | "strategy";
  id: string;
}

// API 호출 함수
const purchaseApiFn = async ({ type, id }: PurchaseInput): Promise<any> => {
  const endpoint =
    type === "item"
      ? "/marketplace/purchase"
      : `/marketplace/strategies/${id}/purchase`;
  const payload = type === "item" ? { itemId: id } : {};
  const { data } = await apiClient.post(endpoint, payload);
  return data;
};

export const usePurchaseMutation = () => {
  const t = useTranslations("Marketplace");
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: purchaseApiFn,
    onSuccess: (data, variables) => {
      if (variables.type === "item") {
        toast.success(t("purchaseSuccessItem"));
        // 사용자의 인벤토리(보유 아이템) 관련 쿼리를 무효화하여 새로고침
        queryClient.invalidateQueries({ queryKey: ["userInventory"] });
      } else if (variables.type === "strategy") {
        toast.success(t("purchaseSuccessStrategy"));
        // 사용자의 전략 목록 관련 쿼리를 무효화하여 새로고침
        queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
        // 구매 성공 후 '나의 전략' 페이지로 이동
        router.push("/strategies");
      }
      // 공통적으로 사용자 정보(예: 보유 크레딧)를 갱신
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
    onError: (err: any) => {
      toast.error(
        t("purchaseError", {
          error: err.response?.data?.detail || err.message,
        })
      );
    },
  });
};
