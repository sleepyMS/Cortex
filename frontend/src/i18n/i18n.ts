// file: frontend/src/i18n/i18n.ts

import { getRequestConfig } from "next-intl/server";
import { Pathnames } from "next-intl/navigation";
import { notFound } from "next/navigation";

export const locales = ["en", "ko"] as const;
export const defaultLocale = "ko" as const; // 기본 로케일이 'ko'인지 확인

export const pathnames = {
  "/": "/",
  "/login": "/login",
  "/signup": "/signup",
  "/dashboard": "/dashboard",
  // 여기에 애플리케이션의 모든 주요 경로를 추가하세요.
} satisfies Pathnames<typeof locales>;

export default getRequestConfig(async ({ locale }) => {
  // 요청된 로케일이 유효한지 확인
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    // 시간대를 명시적으로 설정하여 서버와 클라이언트 간의 렌더링 불일치 방지
    timeZone: "Asia/Seoul",
  };
});
