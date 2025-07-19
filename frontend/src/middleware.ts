// file: frontend/src/middleware.ts

import createMiddleware from "next-intl/middleware";
// i18n/i18n.ts 파일에서 정의한 locales, defaultLocale, pathnames를 임포트합니다.
import { locales, defaultLocale, pathnames } from "./i18n/i18n";

export default createMiddleware({
  locales,
  defaultLocale,
  pathnames, // 미들웨어에 pathnames 전달
  localePrefix: "as-needed", // 'ko'일 때 접두사를 제거하고, 'en'일 때 /en 접두사를 붙입니다.
});

// 미들웨어가 어떤 경로에 대해 실행될지 정의하는 Next.js의 필수 설정입니다.
// 정적 파일, API 라우트 등을 제외합니다.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|png|jpg|jpeg|svg|css|js).*)",
  ],
};
