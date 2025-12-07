// file: frontend/src/components/domain/LanguageSwitcher.tsx

"use client";

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
import { localeConfig, type Locale } from "@/i18n/config";

const LanguageSwitcher = () => {
  const t = useTranslations("Header");
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleLocaleChange = (newLocale: Locale) => {
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace(fullPath as any, { locale: newLocale });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="capitalize">
          {localeConfig[currentLocale].flag} {currentLocale.toUpperCase()}
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1">
        {locales.map((locale) => (
          <Button
            key={locale}
            variant={currentLocale === locale ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => handleLocaleChange(locale)}
          >
            <span>{localeConfig[locale].flag}</span>
            <span>{localeConfig[locale].nativeName}</span>
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export default LanguageSwitcher;
