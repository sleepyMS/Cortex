// file: frontend/src/components/domain/ForgotPasswordForm.tsx

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import apiClient from "@/lib/apiClient";

export default function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const router = useRouter();

  const formSchema = z.object({
    email: z
      .string()
      .min(1, t("errors.emailRequired"))
      .email(t("errors.invalidEmail")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // 백엔드의 비밀번호 재설정 요청 API 호출
      await apiClient.post("/auth/request-password-reset", values);

      // 성공 시, 사용자에게 다음 단계를 안내하는 check-email 페이지로 리디렉션
      router.push(
        `/auth/check-email?email=${encodeURIComponent(values.email)}`
      );
    } catch (error: any) {
      // 백엔드는 이메일 존재 여부를 알려주지 않으므로, 실패 시 제네릭 에러를 표시합니다.
      // 실제로는 성공 응답과 동일하게 처리하여 사용자 경험을 통일하는 것이 더 좋습니다.
      // 여기서는 만약의 경우를 대비해 에러 핸들링을 추가합니다.
      const errorMessage =
        error.response?.data?.detail || t("forgotPasswordFailedGeneric");
      alert(`${t("forgotPasswordFailedPrefix")}: ${errorMessage}`);
    }
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{t("forgotPasswordTitle")}</h1>
        <p className="text-muted-foreground">{t("forgotPasswordSubtitle")}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email">{t("emailLabel")}</label>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            disabled={isSubmitting}
            placeholder="name@example.com"
          />
          {form.formState.errors.email && (
            <p className="mt-1 text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner size="sm" className="mr-2" />}
          {t("sendResetLinkButton")}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          {t("rememberPassword")}{" "}
          <Link href="/login" passHref>
            <span className="font-semibold text-primary hover:underline">
              {t("loginLink")}
            </span>
          </Link>
        </p>
      </div>
    </>
  );
}
