// file: frontend/src/components/domain/SignupForm.tsx

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await apiClient.post("/auth/signup", values);

      if (response.status === 201) {
        alert("회원가입 성공! 로그인 페이지로 이동합니다.");
        router.push("/login");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "회원가입 중 오류가 발생했습니다.";
      alert(`회원가입 실패: ${errorMessage}`);
    }
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">{t("signupTitle")}</h1>
        <p className="text-muted-foreground">{t("signupSubtitle")}</p>
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
          <label htmlFor="password">{t("passwordLabel")}</label>
          <Input id="password" type="password" {...form.register("password")} />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full">
          {t("signupButton")}
        </Button>
      </form>

      <SocialLogins />

      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" passHref>
            <span className="text-primary hover:underline font-semibold">
              {t("loginLink")}
            </span>
          </Link>
        </p>
      </div>
    </>
  );
}
