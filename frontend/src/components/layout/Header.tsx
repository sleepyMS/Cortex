// file: frontend/src/components/layout/Header.tsx

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { useUserStore } from "@/store/userStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";

import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { IconButton } from "@/components/ui/IconButton";
import { Sun, Moon } from "lucide-react";
import LanguageSwitcher from "@/components/domain/LanguageSwitcher";
import { UserActions } from "@/components/domain/UserActions";

export function Header() {
  const t = useTranslations("Header");
  const tNav = useTranslations("Navigation");
  const { theme, setTheme } = useTheme();
  const { user, isAuthInitialized } = useUserStore();
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
                <Link href="/community">
                  <Button variant="ghost">{tNav("community")}</Button>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* 우측 아이콘 및 사용자 메뉴 */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {hasHydrated && (
            <IconButton onClick={toggleTheme} aria-label={t("toggleTheme")}>
              {theme === "dark" ? (
                <Sun key="sun" className="h-5 w-5 theme-icon-animate" />
              ) : (
                <Moon key="moon" className="h-5 w-5 theme-icon-animate" />
              )}
            </IconButton>
          )}

          <UserActions />
        </div>
      </div>
    </header>
  );
}
