"use client";
import * as React from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Globe, Check } from "lucide-react";
import { locales } from "i18n";
import { localeConfig, type Locale } from "@/i18n/config";
const LanguageSwitcher = () => {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handleLocaleChange = (newLocale: Locale) => {
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(fullPath as any, { locale: newLocale });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* 트리거 버튼: GangNaengBot-FE 스타일 적용 (px-3 py-2, scale 애니메이션) */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 font-semibold text-sm tracking-wide border border-border/60 hover:bg-accent data-[state=open]:ring-2 data-[state=open]:ring-violet-500/50 data-[state=open]:bg-accent shadow-sm"
        >
          <Globe className="h-4 w-4 text-violet-500" />
          <span>{localeConfig[currentLocale].countryCode}</span>
        </Button>
      </PopoverTrigger>

      {/* 드롭다운 컨테이너: GangNaengBot-FE 스타일 적용 (min-w-[120px], rounded-xl). 기본 Popover의 w-72(288px)를 덮어쓰기 위해 w-auto 추가 */}
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-auto min-w-[120px] py-2 px-0 overflow-hidden rounded-xl shadow-lg border-border bg-popover/98 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex flex-col">
          {locales.map((locale) => {
            const isSelected = currentLocale === locale;
            return (
              <button
                key={locale}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 transition-colors text-left group ${
                  isSelected ? "bg-violet-500/10" : "hover:bg-accent"
                }`}
                onClick={() => handleLocaleChange(locale)}
              >
                <div className="flex items-center gap-3">
                  {/* 국가 코드 */}
                  <span className="text-xs font-semibold w-6 text-center text-muted-foreground group-hover:text-foreground/70">
                    {localeConfig[locale].countryCode}
                  </span>
                  {/* 언어 명칭 */}
                  <span
                    className={`text-sm ${
                      isSelected
                        ? "text-violet-500 font-semibold"
                        : "text-foreground"
                    }`}
                  >
                    {localeConfig[locale].nativeName}
                  </span>
                </div>

                {/* 선택 표시 */}
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
export default LanguageSwitcher;
