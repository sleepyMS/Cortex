// frontend/middleware.ts

import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  // 지원하는 언어 목록
  locales: ["ko", "en"],

  // URL에 언어 코드가 없을 때 사용할 기본 언어
  // 이 설정이 '/'를 '/ko'로 자동 이동시키는 역할을 합니다.
  defaultLocale: "ko",
});

export const config = {
  // 미들웨어를 실행할 경로를 지정합니다.
  // 아래 정규식은 API 경로, Next.js 내부 파일 경로 등을 제외한
  // 모든 페이지 경로에서 미들웨어가 동작하도록 합니다.
  // 이 방식이 가장 안정적입니다.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
