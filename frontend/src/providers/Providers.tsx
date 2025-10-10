// frontend/src/components/providers/Providers.tsx
"use client";

import React, { useState } from "react";
import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReAuth } from "@/hooks/useReAuth";
import { Toaster } from "sonner";
import { pick } from "lodash";

export function Providers({
  children,
  locale,
  messages,
  timeZone,
}: {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone: string;
}) {
  const [queryClient] = useState(() => new QueryClient());

  useReAuth();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider
          locale={locale}
          messages={pick(
            messages,
            Object.keys(messages).filter((key) => key !== "formats")
          )}
          timeZone={timeZone}
          // messages 객체에서 formats 키를 명시적으로 추출하여 별도의 prop으로 전달합니다.
          formats={messages.formats as any}
        >
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
