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
import { cn } from "@/lib/utils";
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
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          aria-label="Change language"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[140px] p-1 rounded-xl shadow-lg border-border/60 bg-background/80 backdrop-blur-xl"
      >
        <div className="flex flex-col gap-0.5">
          {locales.map((locale) => {
            const isSelected = currentLocale === locale;
            return (
              <button
                key={locale}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                onClick={() => handleLocaleChange(locale)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-70 w-5">
                    {localeConfig[locale].countryCode}
                  </span>
                  <span>{localeConfig[locale].nativeName}</span>
                </div>
                {isSelected && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
export default LanguageSwitcher;
