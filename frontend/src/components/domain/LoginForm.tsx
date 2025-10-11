"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useRouter } from "@/i18n/navigation";
import apiClient from "@/lib/apiClient";
import { useUserStore } from "@/store/userStore";
import SocialLogins from "./SocialLogins";
import EmailVerificationDialog from "./EmailVerificationDialog";

export default function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const loginAndUpdateUser = useUserStore((state) => state.loginAndUpdateUser);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] =
    useState(false);
  const [userEmail, setUserEmail] = useState("");

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

      if (tokens.accessToken) {
        await loginAndUpdateUser({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
        router.push("/dashboard");
      }
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const status = error.response?.status;

      if (status === 403 && detail === "EMAIL_NOT_VERIFIED") {
        // 백엔드에서 보낸 '이메일 미인증' 신호를 받으면 Dialog를 엽니다.
        setUserEmail(values.email);
        setIsVerificationDialogOpen(true);
      } else {
        // 그 외 다른 모든 에러는 기존처럼 처리합니다.
        const errorMessage = detail || t("loginFailedGeneric");
        alert(`${t("loginFailedPrefix")}: ${errorMessage}`);
      }
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

      <EmailVerificationDialog
        isOpen={isVerificationDialogOpen}
        onOpenChange={setIsVerificationDialogOpen}
        email={userEmail}
      />
    </>
  );
}
