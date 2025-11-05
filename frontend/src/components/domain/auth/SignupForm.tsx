"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner"; // 👈 1. Spinner 임포트
import SocialLogins from "./SocialLogins";
import apiClient from "@/lib/apiClient";

export default function SignupForm() {
  const t = useTranslations("Auth");
  const router = useRouter();

  const formSchema = z.object({
    email: z
      .string()
      .min(1, t("errors.emailRequired"))
      .email(t("errors.invalidEmail")),
    password: z.string().min(8, t("errors.passwordLength")),
    // username 필드가 필요하다면 여기에 추가
    // username: z.string().min(2, t("errors.usernameRequired")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState; // 2. 폼 제출 상태 가져오기

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await apiClient.post("/auth/signup", values);

      if (response.status === 201) {
        router.push(
          `/auth/check-email?email=${encodeURIComponent(values.email)}`
        );
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || t("signupFailedGeneric");
      alert(`${t("signupFailedPrefix")}: ${errorMessage}`);
    }
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{t("signupTitle")}</h1>
        <p className="text-muted-foreground">{t("signupSubtitle")}</p>
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
          <label htmlFor="password">{t("passwordLabel")}</label>
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
          {/* 👇 3. 로딩 상태 UI 추가 */}
          {isSubmitting && <Spinner size="sm" className="mr-2" />}
          {t("signupButton")}
        </Button>
      </form>

      <SocialLogins />

      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          {t("hasAccount")}{" "}
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
