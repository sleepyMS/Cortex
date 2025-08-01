// frontend/src/app/[locale]/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { useMessages } from "next-intl";
import { Providers } from "@/providers/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageWrapper } from "@/components/layout/PageWrapper";
import "../globals.css";

import { timeZone } from "../../../i18n"; // i18n.ts가 frontend/i18n.ts에 있다면 경로를 맞춰야 합니다.

const inter = Inter({ subsets: ["latin"] });

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
  // 여기서 메시지를 먼저 로드합니다.
  const messages = useMessages();

  return (
    <html lang={locale} className="h-full">
      <body
        className={`${inter.className} flex min-h-full flex-col bg-background text-foreground`}
      >
        {/* 로드한 messages를 Providers에 prop으로 전달합니다. */}
        <Providers locale={locale} messages={messages} timeZone={timeZone}>
          <Header />
          <PageWrapper>
            <main>{children}</main>
          </PageWrapper>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
