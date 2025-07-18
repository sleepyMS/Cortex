// file: src/i18n.ts
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

// 지원하는 언어 목록
const locales = ["ko", "en"];

export default getRequestConfig(async ({ locale }) => {
  // URL에서 받은 locale 파라미터가 유효한지 확인
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
