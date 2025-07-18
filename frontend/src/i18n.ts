// file: frontend/src/i18n.ts

import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

const locales = ["ko", "en"];

export default getRequestConfig(async ({ locale }) => {
  // 들어온 locale 파라미터가 유효한지 확인합니다.
  // 이 부분이 이전 코드와 동일하게 보일 수 있지만, next-intl 내부적으로
  // 이 함수에서 locale을 반환하는지 여부를 중요하게 체크합니다.
  if (!locales.includes(locale as any)) notFound();

  return {
    // 1. messages를 반환합니다.
    messages: (await import(`./messages/${locale}.json`)).default,
    // 2. (가장 중요) next-intl의 최신 요구사항에 따라 locale 값을 명시적으로 반환합니다.
    locale: locale,
  };
});
