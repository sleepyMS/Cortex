// file: frontend/src/components/domain/LoginForm.tsx

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { motion, Variants } from "framer-motion";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import SocialLogins from "./SocialLogins";
import { useRouter } from "@/i18n/navigation";
import apiClient from "@/lib/apiClient";

export default function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Form 데이터 형식으로 변환
      const formData = new URLSearchParams();
      formData.append("username", values.email);
      formData.append("password", values.password);

      const response = await apiClient.post("/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (response.data.access_token) {
        const { access_token, refresh_token } = response.data; // refresh_token도 구조 분해 할당
        localStorage.setItem("accessToken", access_token);
        if (refresh_token) {
          // refresh_token이 있다면 저장 (옵션이므로 확인)
          localStorage.setItem("refreshToken", refresh_token);
        }

        // alert(t("loginSuccess");
        router.push("/dashboard"); // 로그인 성공 시 대시보드로 이동
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Login error";
      alert(`Login error: ${errorMessage}`);
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">{t("loginTitle")}</h1>
        <p className="text-muted-foreground">{t("loginSubtitle")}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email">{t("emailLabel")}</label>
          <Input id="email" type="email" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div>
          <div className="flex justify-between items-baseline">
            <label htmlFor="password">{t("passwordLabel")}</label>
            <Link href="/forgot-password" passHref>
              <span className="text-xs text-primary hover:underline">
                {t("forgotPassword")}
              </span>
            </Link>
          </div>
          <Input id="password" type="password" {...form.register("password")} />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full">
          {t("loginButton")}
        </Button>
      </form>

      <SocialLogins />

      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/signup" passHref>
            <span className="text-primary hover:underline font-semibold">
              {t("signupLink")}
            </span>
          </Link>
        </p>
      </div>
    </>
  );
}
