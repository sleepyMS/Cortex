// file: frontend/src/components/layout/AuthLayout.tsx

import { getTranslations, getLocale } from "next-intl/server";
import React from "react";

// 이 컴포넌트는 자식 컴포넌트(LoginForm 또는 SignupForm)를 받아서
// 공통 레이아웃 안에 렌더링해주는 역할을 합니다.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Landing.Hero" });

  return (
    <div className="relative flex min-h-[calc(100vh-80px)] w-full items-center justify-center overflow-hidden">
      {/* Animated Aurora Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(139,92,26,0.1),rgba(255,255,255,0))] animate-[spin_20s_linear_infinite]"></div>
        <div className="absolute bottom-[-40%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(139,92,246,0.05),rgba(255,255,255,0))] animate-[spin_25s_linear_infinite_reverse]"></div>
      </div>

      {/* Main Content Grid */}
      <div className="container grid grid-cols-1 md:grid-cols-2 items-center gap-16">
        {/* Left Side: Branding/Quote */}
        <div className="hidden md:flex flex-col gap-4 text-left">
          <h1 className="text-5xl font-bold leading-tight tracking-tighter">
            {t.rich("title", { br: () => <br /> })}
          </h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Right Side: Form (children) */}
        <div className="flex justify-center md:justify-end">
          <div className="w-full max-w-sm rounded-xl border border-border/40 bg-background/80 p-8 shadow-2xl backdrop-blur-lg">
            {children} {/* LoginForm 또는 SignupForm이 이 자리에 들어옵니다. */}
          </div>
        </div>
      </div>
    </div>
  );
}
