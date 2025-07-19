"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { motion, Variants } from "framer-motion";

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
  const { setTokens } = useUserStore();

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

      if (response.data.access_token) {
        // 1. 스토어에 토큰만 저장합니다.
        setTokens({
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        });

        // 2. 대시보드로 리디렉션합니다.
        // 사용자 정보 fetch는 전역 useReAuth 훅이 자동으로 처리합니다.
        router.push("/dashboard");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || t("loginFailedGeneric");
      alert(`${t("loginFailedPrefix")}: ${errorMessage}`);
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

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
