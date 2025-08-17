// frontend/src/components/providers/Providers.tsx
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
