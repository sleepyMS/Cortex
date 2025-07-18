// file: frontend/src/components/domain/LanguageSwitcher.tsx

"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Globe, ChevronsUpDown } from "lucide-react";

export default function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="justify-start gap-2 text-left font-normal"
        >
          <Globe className="h-5 w-5" />
          <span className="hidden md:inline">
            {locale === "ko" ? "한국어" : "English"}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-1" align="end">
        <Button
          variant={locale === "ko" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => handleSelect("ko")}
        >
          한국어
        </Button>
        <Button
          variant={locale === "en" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => handleSelect("en")}
        >
          English
        </Button>
      </PopoverContent>
    </Popover>
  );
}
