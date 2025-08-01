// frontend/src/components/providers/Providers.tsx (수정)

"use client";

import React, { useState } from "react";
import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReAuth } from "@/hooks/useReAuth";
import { Toaster } from "sonner";

export function Providers({
  children,
  locale,
  messages,
  timeZone, // 👈 timeZone prop 추가
}: {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone: string; // 👈 timeZone prop 타입 정의
}) {
  const [queryClient] = useState(() => new QueryClient());

  useReAuth();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {/* 👈 NextIntlClientProvider에 timeZone prop 전달 */}
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone={timeZone}
        >
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
