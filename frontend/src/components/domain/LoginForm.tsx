"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
// motion과 Variants는 사용되지 않으므로 import 문을 정리합니다.
// import { motion, Variants } from "framer-motion";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import SocialLogins from "./SocialLogins";
import { useRouter } from "@/i18n/navigation";
import apiClient from "@/lib/apiClient";
import { useUserStore } from "@/store/userStore";

export default function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  // 1. 'setTokens' 대신 'loginAndUpdateUser' 액션을 가져옵니다.
  const loginAndUpdateUser = useUserStore((state) => state.loginAndUpdateUser);

  const formSchema = z.object({
    email: z
      .string()
      .min(1, t("errors.emailRequired"))
      .email(t("errors.invalidEmail")),
    password: z.string().min(1, t("errors.passwordRequired")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const formData = new URLSearchParams();
      formData.append("username", values.email);
      formData.append("password", values.password);

      const response = await apiClient.post("/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const tokens = response.data;

      if (tokens.access_token) {
        // 2. [핵심 개선] 토큰 저장과 사용자 정보 로딩을 한번에 처리하는 중앙 액션을 호출합니다.
        await loginAndUpdateUser({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });

        // 3. 스토어에서 모든 인증 상태 준비가 끝난 후 대시보드로 이동합니다.
        router.push("/dashboard");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || t("loginFailedGeneric");
      // UI/UX 개선을 위해 alert 대신 toast를 사용하는 것을 권장합니다.
      alert(`${t("loginFailedPrefix")}: ${errorMessage}`);
    }
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{t("loginTitle")}</h1>
        <p className="text-muted-foreground">{t("loginSubtitle")}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email">{t("emailLabel")}</label>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            disabled={isSubmitting}
          />
          {form.formState.errors.email && (
            <p className="mt-1 text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password">{t("passwordLabel")}</label>
            <Link href="/forgot-password" passHref>
              <span className="text-xs text-primary hover:underline">
                {t("forgotPassword")}
              </span>
            </Link>
          </div>
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner size="sm" className="mr-2" />}
          {t("loginButton")}
        </Button>
      </form>

      <SocialLogins />

      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/signup" passHref>
            <span className="font-semibold text-primary hover:underline">
              {t("signupLink")}
            </span>
          </Link>
        </p>
      </div>
    </>
  );
}
