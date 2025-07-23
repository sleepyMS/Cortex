"use client";

import { useState } from "react";
import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // 👈 1. QueryClient 관련 모듈 임포트
import React from "react";
import { useReAuth } from "@/hooks/useReAuth";

export function Providers({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}) {
  // 👈 2. QueryClient 인스턴스 생성 (컴포넌트 리렌더링 시 재생성 방지)
  const [queryClient] = useState(() => new QueryClient());

  useReAuth();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {/* 👇 3. QueryClientProvider로 하위 컴포넌트들을 감싸줍니다. */}
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
