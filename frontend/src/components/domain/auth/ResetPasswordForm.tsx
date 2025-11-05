// file: frontend/src/components/domain/ResetPasswordForm.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import apiClient from "@/lib/apiClient";

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Zod 스키마에 비밀번호 확인 로직 추가
  const formSchema = z
    .object({
      password: z.string().min(8, t("errors.passwordLength")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("errors.passwordMismatch"),
      path: ["confirmPassword"], // 에러 메시지를 confirmPassword 필드에 표시
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    try {
      await apiClient.post("/auth/reset-password", {
        token: token,
        newPassword: values.password,
      });

      // 성공 시 알림 후 로그인 페이지로 이동
      alert(t("resetSuccessMessage"));
      router.push("/login");
    } catch (err: any) {
      setError(err.response?.data?.detail || t("resetFailedGeneric"));
    }
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{t("resetPasswordTitle")}</h1>
        <p className="text-muted-foreground">{t("resetPasswordSubtitle")}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t("resetFailedPrefix")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div>
          <label htmlFor="password">{t("newPasswordLabel")}</label>
          <Input
            id="password"
            type="password"
            {...form.register("password")}
            disabled={isSubmitting}
          />
          {form.formState.errors.password && (
            <p className="mt-1 text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</label>
          <Input
            id="confirmPassword"
            type="password"
            {...form.register("confirmPassword")}
            disabled={isSubmitting}
          />
          {form.formState.errors.confirmPassword && (
            <p className="mt-1 text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner size="sm" className="mr-2" />}
          {t("resetPasswordButton")}
        </Button>
      </form>
    </>
  );
}
