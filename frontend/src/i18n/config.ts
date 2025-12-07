// file: frontend/src/i18n/config.ts

import { locales } from "../../i18n";

// 각 로케일에 대한 표시 정보 (새 언어 추가 시 여기만 수정)
export const localeConfig: Record<
  (typeof locales)[number],
  { name: string; nativeName: string; flag: string }
> = {
  ko: { name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  en: { name: "English", nativeName: "English", flag: "🇺🇸" },
  // 새 언어 추가 예시:
  // ja: { name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  // zh: { name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
};

export type Locale = (typeof locales)[number];
