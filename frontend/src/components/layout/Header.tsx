// file: frontend/src/components/layout/Header.tsx

"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { useUserStore } from "@/store/userStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";

import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { IconButton } from "@/components/ui/IconButton";
import { Sun, Moon, Coins } from "lucide-react";
import LanguageSwitcher from "@/components/domain/LanguageSwitcher";
import { UserActions } from "@/components/domain/UserActions";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { CreditTooltipContent } from "@/components/domain/CreditTooltipContent";
import { cn } from "@/lib/utils";

export function Header() {
  const t = useTranslations("Header");
  const tNav = useTranslations("Navigation");
  const { theme, setTheme } = useTheme();
  const { user, isAuthInitialized, creditBalance } = useUserStore();
  const hasHydrated = useHasHydrated();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* 좌측 로고 및 네비게이션 */}
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Go to homepage">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            {isAuthInitialized && user && (
              <>
                <Link href="/strategies">
                  <Button variant="ghost">{tNav("strategies")}</Button>
                </Link>
                <Link href="/backtester">
                  <Button variant="ghost">{tNav("backtester")}</Button>
                </Link>
                <Link href="/optimization">
                  <Button variant="ghost">{tNav("optimization")}</Button>
                </Link>
                <Link href="/marketplace">
                  <Button variant="ghost">{tNav("marketplace")}</Button>
                </Link>
                <Link href="/community">
                  <Button variant="ghost">{tNav("community")}</Button>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* 우측 아이콘 및 사용자 메뉴 */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />

          {isAuthInitialized && user && creditBalance && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/dashboard?tab=credits">
                    <div
                      className={cn(
                        "flex cursor-pointer items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium",
                        "transition-colors hover:bg-muted/80" // 호버 효과 추가
                      )}
                    >
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span>
                        {creditBalance.totalBalance.toLocaleString()} CC
                      </span>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="p-0">
                  <CreditTooltipContent balance={creditBalance} />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <UserActions />
          {hasHydrated && (
            <IconButton onClick={toggleTheme} aria-label={t("toggleTheme")}>
              {theme === "dark" ? (
                <Sun key="sun" className="h-5 w-5 theme-icon-animate" />
              ) : (
                <Moon key="moon" className="h-5 w-5 theme-icon-animate" />
              )}
            </IconButton>
          )}
        </div>
      </div>
    </header>
  );
}
