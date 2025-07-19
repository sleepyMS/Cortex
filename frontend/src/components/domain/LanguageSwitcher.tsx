// file: frontend/src/components/domain/LanguageSwitcher.tsx

"use client"; // 클라이언트 컴포넌트임을 명시

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
// window.location.href를 사용할 것이므로 next/navigation의 useRouter, usePathname은 필요 없습니다.
// 하지만 다른 컴포넌트에서 이미 import 되어있을 수 있으므로 주석 처리 또는 유지
// import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { ChevronDown } from "lucide-react";

import { locales } from "@/i18n/i18n";
type Locale = (typeof locales)[number];

const LanguageSwitcher = () => {
  const t = useTranslations("Header");
  const currentLocale = useLocale(); // 현재 활성화된 로케일
  // const router = useRouter(); // 사용하지 않음
  // const pathname = usePathname(); // 사용하지 않음

  const handleLocaleChange = (newLocale: Locale) => {
    // 현재 URL의 경로 부분을 가져옵니다. (로케일 접두사를 제외한)
    // 예: /en/dashboard -> /dashboard
    // 예: /login -> /login
    const currentPathWithoutLocale = window.location.pathname.replace(
      /^\/(en|ko)/,
      ""
    );
    // 루트 경로인 경우 '/'를 유지
    const targetPath =
      currentPathWithoutLocale === "" ? "/" : currentPathWithoutLocale;

    // 새로운 로케일이 기본 로케일(ko)이고 localePrefix가 'as-needed'라면 접두사를 붙이지 않습니다.
    // 그렇지 않다면 새로운 로케일 접두사를 붙입니다.
    const newUrl =
      newLocale === "ko" && currentLocale === "ko" // 만약 이미 ko이고 기본설정이 ko라면
        ? `${window.location.origin}${targetPath}` // 접두사 없이
        : `${window.location.origin}/${newLocale}${targetPath}`;

    // 강제로 전체 페이지를 새로고침하며 리디렉션합니다.
    window.location.href = newUrl;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="capitalize">
          {currentLocale} <ChevronDown className="ml-1 h-4 w-4" />{" "}
          {/* locale 대신 currentLocale */}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => handleLocaleChange("ko")}
        >
          {t("langKorean")}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => handleLocaleChange("en")}
        >
          {t("langEnglish")}
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default LanguageSwitcher;
