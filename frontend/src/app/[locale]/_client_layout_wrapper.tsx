// file: frontend/src/app/[locale]/_client_layout_wrapper.tsx (변동 없음)

"use client";

import { NextIntlClientProvider } from "next-intl";
import { AbstractIntlMessages } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

type ClientLayoutWrapperProps = {
  messages: AbstractIntlMessages; // 이 타입은 유지
  locale: string;
  children: ReactNode;
};

export default function ClientLayoutWrapper({
  messages,
  locale,
  children,
}: ClientLayoutWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages} // messages가 이제 AbstractIntlMessages 타입으로 전달됨
      timeZone="Asia/Seoul"
      now={new Date()}
    >
      <div className={inter.className}>
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
