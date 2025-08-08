import type { Metadata } from "next";
// 👈 1. Inter 대신 Noto_Sans_KR을 임포트합니다.
import { Noto_Sans_KR as FontSans } from "next/font/google";
import { useMessages } from "next-intl";

import { Providers } from "@/providers/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { cn } from "@/lib/utils";
import { timeZone } from "i18n";
import "../globals.css";

// 👈 2. Noto Sans KR 폰트를 설정합니다. (일반, 굵은 굵기 포함)
const fontSans = FontSans({
  subsets: ["latin"],
  weight: ["400", "700"], // 👈 일반(400)과 굵은(700) 굵기를 지정
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
    <html lang={locale} className="h-full" suppressHydrationWarning={true}>
      <body
        className={cn(
          "min-h-full bg-background font-sans text-foreground flex flex-col",
          fontSans.variable
        )}
      >
        <Providers locale={locale} messages={messages} timeZone={timeZone}>
          <Header />
          <PageWrapper>
            <main className="flex-grow">{children}</main>
          </PageWrapper>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
