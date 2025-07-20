"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter } from "@/i18n/navigation";

import { useUserStore } from "@/store/userStore";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Logo } from "@/components/ui/Logo";
import { Sun, Moon, LayoutDashboard } from "lucide-react";
import LanguageSwitcher from "@/components/domain/LanguageSwitcher";
import { useHasHydrated } from "hooks/useHasHydrated";

export function Header() {
  const t = useTranslations("Header");
  const tNav = useTranslations("Navigation"); // 👈 1. 네비게이션용 번역 함수 추가
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useUserStore();
  const hasHydrated = useHasHydrated();

  const isLoggedIn = !!user;

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    logout();
    alert(t("logoutSuccess"));
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" passHref>
            <Logo />
          </Link>

          {/* 👇 2. 로그인 시 네비게이션 메뉴 표시 */}
          <nav className="hidden items-center gap-4 md:flex">
            {hasHydrated && isLoggedIn && (
              <>
                <Link href="/strategies" passHref>
                  <Button variant="ghost">{tNav("strategies")}</Button>
                </Link>
                <Link href="/community" passHref>
                  <Button variant="ghost">{tNav("community")}</Button>
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          <div className="hidden items-center gap-2 sm:flex">
            {hasHydrated ? (
              isLoggedIn ? (
                // --- 로그인 시 UI ---
                <>
                  <span className="mr-2 hidden text-sm text-foreground md:inline">
                    {user.email}
                  </span>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="px-3"
                  >
                    {t("logout")}
                  </Button>

                  <IconButton
                    onClick={() => router.push("/dashboard")}
                    aria-label={t("dashboardLink")}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                  </IconButton>
                </>
              ) : (
                // --- 로그아웃 시 UI ---
                <>
                  <Link href="/login" passHref>
                    <Button variant="ghost">{t("login")}</Button>
                  </Link>
                  <Link href="/pricing" passHref>
                    <Button>{t("startPro")}</Button>
                  </Link>
                </>
              )
            ) : (
              // --- Hydration 전, UI 깜빡임 방지용 스켈레톤 ---
              <div className="h-10 w-40 animate-pulse rounded-md bg-muted"></div>
            )}
          </div>

          <IconButton onClick={toggleTheme} aria-label={t("toggleTheme")}>
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </IconButton>
        </div>
      </div>
    </header>
  );
}
