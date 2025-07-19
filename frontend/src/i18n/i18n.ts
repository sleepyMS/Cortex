// file: frontend/src/i18n/i18n.ts

import { getRequestConfig } from "next-intl/server";
import { Pathnames } from "next-intl/navigation";

export const locales = ["en", "ko"] as const;
export const defaultLocale = "ko" as const; // 기본 로케일이 'ko'인지 확인

export const pathnames = {
  "/": "/",
  "/login": "/login",
  "/signup": "/signup",
  "/dashboard": "/dashboard",
  // 여기에 애플리케이션의 모든 주요 경로를 추가하세요.
} satisfies Pathnames<typeof locales>;

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}.json`)).default,
}));
