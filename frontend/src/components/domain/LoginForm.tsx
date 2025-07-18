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
import useAuthStore from "@/store/authStore"; // useAuthStore 임포트

export default function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const { login } = useAuthStore(); // login 액션 가져오기

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
      const formData = new URLSearchParams();
      formData.append("username", values.email);
      formData.append("password", values.password);

      const response = await apiClient.post("/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (response.data.access_token) {
        const { access_token, refresh_token } = response.data;

        // 백엔드 로그인 API의 응답 스키마가 사용자 정보를 포함하도록 확장했다면 여기서 사용
        // 그렇지 않다면, 로그인 성공 후 /users/me 를 호출하여 사용자 정보를 가져오는 것이 좋습니다.
        // 현재는 로그인 API가 userInfo를 직접 주지 않으므로 임시 UserInfo 객체 사용
        const tempUserInfo = {
          id: 0, // 실제 ID는 로그인 후 /users/me 호출로 가져와야 함
          email: values.email,
          role: "basic", // 로그인 시 기본 역할 설정 (추후 DB에서 가져오도록 변경)
        };

        // Zustand 스토어에 로그인 정보 저장
        login(tempUserInfo, access_token, refresh_token);

        // localStorage에는 이제 Zustand persist 미들웨어가 자동으로 저장합니다.
        // 따라서 아래 두 줄은 필요하지 않습니다.
        // localStorage.setItem("accessToken", access_token);
        // if (refreshToken) { localStorage.setItem("refreshToken", refresh_token); }

        // alert(t("loginSuccess"));
        router.push("/dashboard");
      }
    } catch (error: any) {
      // 이곳에서 로그인 실패 알림을 처리합니다.
      // 백엔드에서 받은 detail 메시지를 그대로 표시합니다.
      const errorMessage =
        error.response?.data?.detail || t("loginFailedGeneric"); // 새로운 언어팩 키 추가
      alert(`${t("loginFailedPrefix")}: ${errorMessage}`); // "로그인 실패: [오류 메시지]"
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
