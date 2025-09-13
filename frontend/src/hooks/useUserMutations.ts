"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { useUserStore } from "@/store/userStore";
import { useRouter } from "@/i18n/navigation";

// ... (기존 다른 뮤테이션 훅)

/**
 * 현재 로그인된 사용자의 계정을 영구 삭제하는 뮤테이션 훅
 */
export const useDeleteAccountMutation = () => {
  const t = useTranslations("Dashboard.settings.dangerZone");
  const logout = useUserStore((state) => state.logout);
  const router = useRouter();

  return useMutation({
    mutationFn: () => apiClient.delete("/users/me"),
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      // [핵심] 삭제 성공 시, 즉시 모든 클라이언트 상태를 초기화하고 로그아웃 처리
      logout();
      // 홈페이지로 리디렉션
      router.push("/");
    },
    onError: (error: any) => {
      toast.error(
        t("deleteError", {
          error: error.response?.data?.detail || error.message,
        })
      );
    },
  });
};
