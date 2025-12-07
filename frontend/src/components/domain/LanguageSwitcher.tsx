// file: frontend/src/components/domain/LanguageSwitcher.tsx

"use client"; // 클라이언트 컴포넌트임을 명시

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { ChevronDown } from "lucide-react";
import { locales } from "i18n";

type Locale = (typeof locales)[number];

const LanguageSwitcher = () => {
  const t = useTranslations("Header");
  const currentLocale = useLocale(); // 현재 활성화된 로케일
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleLocaleChange = (newLocale: Locale) => {
    // 쿼리 스트링을 유지하면서 언어 전환
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace(fullPath as any, { locale: newLocale });
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
