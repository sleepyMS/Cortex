"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import apiClient from "@/lib/apiClient";
import { useUserStore } from "@/store/userStore";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";

// Zod 스키마: 비밀번호 유효성 검사 및 일치 여부 확인
const createPasswordSchema = (t: any) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(8, t("validation.currentPasswordRequired")),
      newPassword: z.string().min(8, t("validation.newPasswordMinLength")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("validation.passwordsMustMatch"),
      path: ["confirmPassword"], // 에러 메시지를 '비밀번호 확인' 필드에 표시
    });

export function ChangePasswordForm() {
  const t = useTranslations("Dashboard.settings.password");
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useUserStore((state) => state.logout);

  const formSchema = createPasswordSchema(t);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      // 백엔드 API 호출하여 비밀번호 변경 요청
      return apiClient.put("/users/me/password", {
        oldPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      // 1. 사용자에게 성공 및 다음 행동(재로그인)을 명확히 안내
      toast.success(t("updateSuccessRedirect"));

      // 2. Zustand 스토어의 사용자 상태를 깨끗하게 초기화
      logout();

      // 3. React Query의 캐시를 모두 삭제하여 이전 사용자 데이터가 남지 않도록 보장
      queryClient.clear();

      // 4. toast 메시지를 읽을 시간을 준 뒤, 로그인 페이지로 안전하게 이동
      setTimeout(() => {
        router.push("/login");
        console.log("test");
      }, 1500); // 1.5초 후 이동
    },
    onError: (error: any) => {
      // 실패 시 에러 메시지 표시
      toast.error(
        t("updateError", {
          error: error.response?.data?.detail || error.message,
        })
      );
    },
  });

  // 폼 제출 시 실행될 함수
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updatePasswordMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("currentPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("newPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("confirmPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={updatePasswordMutation.isPending}>
            {updatePasswordMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("saveButton")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
