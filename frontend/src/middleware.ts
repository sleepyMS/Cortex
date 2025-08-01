// file: frontend/src/middleware.ts

import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, pathnames } from "../i18n";

export default createMiddleware({
  locales,
  defaultLocale,
  pathnames,
  localePrefix: "as-needed",
});

export const config = {
  // 매처는 라우팅을 처리할 경로를 정의합니다.
  // 이전에 논의했던 복잡한 매처를 사용합니다.
  matcher: ["/((?!api|_next|.*\\..*).*)"], // /api, /_next, 정적 파일 등을 제외
};
