// file: frontend/i18n.ts (최종 통합 설정 파일 - 모든 경고 해결)

import { notFound } from "next/navigation";
// 👈 requestLocale 임포트 (locale 파라미터 deprecation 해결)
import {
  getRequestConfig,
  unstable_setRequestLocale as requestLocale,
} from "next-intl/server";
// 👈 Pathnames는 next-intl/routing에서 임포트 (Pathnames deprecation 해결)
import { Pathnames } from "next-intl/routing";

export const locales = ["en", "ko"] as const;
export const defaultLocale = "ko" as const;

export const pathnames = {
  "/": "/",
  "/login": "/login",
  "/signup": "/signup",
  "/dashboard": "/dashboard",
  "/backtester": "/backtester",
  "/backtester/[backtestId]": "/backtester/[backtestId]",
  "/strategies/new": "/strategies/new",
  "/strategies": "/strategies",
  "/settings/profile": "/settings/profile",
  "/settings/subscription": "/settings/subscription",
  "/settings/keys": "/settings/keys",
  "/admin/dashboard_summary": "/admin/dashboard_summary",
  "/admin/users": "/admin/users",
} satisfies Pathnames<typeof locales>;

export const timeZone = "Asia/Seoul";

export default getRequestConfig(async (props) => {
  // 👈 인자를 props로 받습니다.
  const locale = props.locale;

  const validatedLocale = locales.includes(locale as any)
    ? locale
    : defaultLocale;
  if (!locales.includes(validatedLocale as any)) {
    console.error(
      `Locale '${validatedLocale}' is not supported. Redirecting to notFound.`
    );
    notFound();
  }

  return {
    messages: (await import(`./src/messages/${validatedLocale}.json`)).default,
    timeZone,
    locale: validatedLocale,
  };
});
