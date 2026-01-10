// file: frontend/i18n.ts

import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { Pathnames } from "next-intl/routing";

export const locales = ["ko", "en"] as const;
export const defaultLocale = "ko" as const;

export const pathnames = {
  "/": "/",
  "/login": "/login",
  "/signup": "/signup",
  "/dashboard": "/dashboard",
  "/strategies": "/strategies",
  "/strategies/[strategyId]": "/strategies/[strategyId]",
  "/backtester": "/backtester",
  "/backtester/new": "/backtester/new",
  "/backtester/[backtestId]": "/backtester/[backtestId]",
  "/settings/profile": "/settings/profile",
  "/settings/subscription": "/settings/subscription",
  "/settings/keys": "/settings/keys",
  "/admin/dashboard_summary": "/admin/dashboard_summary",
  "/admin/users": "/admin/users",
} satisfies Pathnames<typeof locales>;

export const timeZone = "Asia/Seoul";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  const requested = await requestLocale;

  // Ensure that the incoming locale is valid
  const validatedLocale = locales.includes(requested as any)
    ? requested
    : defaultLocale;

  if (!locales.includes(validatedLocale as any)) {
    console.error(
      `Locale '${validatedLocale}' is not supported. Redirecting to notFound.`
    );
    notFound();
  }

  return {
    locale: validatedLocale,
    messages: (await import(`./src/messages/${validatedLocale}.json`)).default,
    timeZone,
  };
});
