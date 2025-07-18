// file: src/i18n.ts

import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

const locales = ["ko", "en"];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    // 경로를 '../' 에서 './' 로 수정합니다.
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
