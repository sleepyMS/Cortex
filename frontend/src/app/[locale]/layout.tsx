// src/app/[locale]/layout.tsx

import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider, useMessages } from "next-intl";

import Header from "@/src/components/layout/Header";
// import Footer from "@/components/layout/Footer";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Project: Cortex - 데이터 기반 퀀트 플랫폼",
  description: "나만의 투자 전략을 검증하고 자동매매를 실행하세요.",
};

export default function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const messages = useMessages();

  return (
    <html lang={locale}>
      <body className={`${notoSansKr.className} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header />
          <main className="min-h-screen">{children}</main>
          {/* <Footer /> */}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
