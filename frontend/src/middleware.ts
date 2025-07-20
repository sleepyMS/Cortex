// file: frontend/src/middleware.ts

import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, pathnames } from "./i18n/i18n";

export default createMiddleware({
  locales,
  defaultLocale,
  pathnames,
  localePrefix: "as-needed",
});

export const config = {
  // ✅ 더 효율적이고 안전한 matcher로 개선
  // 1. /api, /_next 경로 전체를 제외
  // 2. .(점)이 포함된 모든 경로(모든 정적 파일)를 제외
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
