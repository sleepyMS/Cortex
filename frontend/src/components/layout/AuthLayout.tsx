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
      {/* Animated Aurora Background - 과도하게 튀어나온 부분을 조정 */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {" "}
        {/* overflow-hidden 추가 */}
        <div className="absolute bottom-0 left-[-10%] right-auto top-[-5%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(139,92,26,0.1),rgba(255,255,255,0))] animate-[spin_20s_linear_infinite] opacity-70"></div>{" "}
        {/* 크기, 위치, 투명도 조정 */}
        <div className="absolute bottom-[-20%] right-[-10%] top-auto h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(139,92,246,0.05),rgba(255,255,255,0))] animate-[spin_25s_linear_infinite_reverse] opacity-70"></div>{" "}
        {/* 크기, 위치, 투명도 조정 */}
      </div>

      {/* Main Content Grid - max-w-5xl 및 중앙 정렬 강화 */}
      {/* container 클래스에 max-w-5xl을 추가하여 헤더/푸터와 너비를 일치시킵니다. */}
      {/* px-4는 모바일 기본 패딩, md:px-8은 태블릿/데스크톱에서 좌우 패딩을 더 줍니다. */}
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-16 max-w-5xl px-4 md:px-8">
        {/* Left Side: Branding/Quote */}
        <div className="hidden md:flex flex-col gap-4 text-left">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tighter text-foreground">
            {t.rich("title", { br: () => <br /> })}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* Right Side: Form (children) - 중앙 정렬 또는 우측 정렬 유지, 패딩 조정 */}
        <div className="flex justify-center md:justify-start">
          {" "}
          {/* md:justify-start로 변경하여 폼이 그리드의 2번째 컬럼 안에서 시작하도록 함 */}
          <div className="w-full max-w-sm rounded-xl border border-border/40 bg-background/80 p-6 sm:p-8 shadow-2xl backdrop-blur-lg">
            {" "}
            {/* padding 조정 */}
            {children} {/* LoginForm 또는 SignupForm이 이 자리에 들어옵니다. */}
          </div>
        </div>
      </div>
    </div>
  );
}
