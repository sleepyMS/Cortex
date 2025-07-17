import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ko"], // 필요한 경우 원하는 언어 추가
  defaultLocale: "ko",
});
