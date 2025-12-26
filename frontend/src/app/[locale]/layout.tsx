// file: frontend/src/app/[locale]/layout.tsx

import type { Metadata } from "next";
import localFont from "next/font/local";
import { useMessages } from "next-intl";

import { Providers } from "@/providers/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Background } from "@/components/layout/Background";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { cn } from "@/lib/utils";
import { timeZone } from "i18n";
import "../globals.css";
import { ThemeScript } from "@/lib/ThemeScript";

const fontSans = localFont({
  src: "../../../public/fonts/PretendardJPVariable.woff2",
  display: "swap",
  weight: "400 500 700",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Project: Cortex",
  description: "데이터 기반 투자 전략 검증 및 자동매매 올인원 퀀트 플랫폼",
};

export default function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = useMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground flex flex-col",
          fontSans.variable
        )}
      >
        <Providers locale={locale} messages={messages} timeZone={timeZone}>
          <Background />
          <Header />
          <PageWrapper>
            <main className="flex-grow flex flex-col">{children}</main>
          </PageWrapper>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
