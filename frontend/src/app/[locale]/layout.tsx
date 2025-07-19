// file: frontend/src/app/[locale]/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation"; // notFound를 상단에 명시적으로 임포트
import "../globals.css";
import { getMessages } from "next-intl/server";
import { AbstractIntlMessages } from "next-intl"; // AbstractIntlMessages 타입 임포트

// 지원하는 로케일 목록을 i18n/i18n.ts에서 임포트합니다.
import { locales } from "@/i18n/i18n";

// 클라이언트 컴포넌트 래퍼를 임포트합니다.
import ClientLayoutWrapper from "./_client_layout_wrapper";

const inter = Inter({ subsets: ["latin"] });

// metadata는 서버 컴포넌트에서만 내보낼 수 있습니다.
export const metadata: Metadata = {
  title: "Project: Cortex",
  description: "데이터 기반 투자 플랫폼",
};

// RootLayout은 async 함수로 서버에서 실행됩니다.
export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // 1. 유효하지 않은 로케일인 경우 404 페이지를 렌더링합니다.
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // 2. getMessages 함수를 호출하여 메시지 객체를 가져옵니다.
  // messages 변수를 `AbstractIntlMessages` 타입으로 명시적으로 선언하고,
  // 오류가 발생하면 notFound()가 호출되므로, 이 지점에 도달하면 messages는 정의됩니다.
  let messages: AbstractIntlMessages; // 타입 명시

  try {
    messages = (await getMessages()) as AbstractIntlMessages; // 타입 단언 (안전하다고 가정)
  } catch (error) {
    console.error(`Error loading messages for locale ${locale}:`, error);
    notFound(); // 메시지 로딩 실패 시 404
  }

  return (
    <html lang={locale} className="dark">
      <body className={inter.className}>
        <ClientLayoutWrapper messages={messages} locale={locale}>
          {" "}
          {/* messages는 이제 undefined가 아님 */}
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
