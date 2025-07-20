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
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useUserStore();
  const hasHydrated = useHasHydrated();

  // user 객체의 존재 여부로 로그인 상태를 판단합니다.
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

                  {/* --- 사용자 역할(role)에 따른 버튼 --- */}
                  {user.role === "basic" && (
                    <Link href="/pricing" passHref>
                      <Button>{t("startPro")}</Button>
                    </Link>
                  )}
                  {user.role === "pro" && (
                    <Link href="/settings/subscription" passHref>
                      <Button>{t("manageSubscription")}</Button>
                    </Link>
                  )}
                  {user.role === "admin" && (
                    <Link href="/admin/dashboard" passHref>
                      <Button>{t("adminDashboard")}</Button>
                    </Link>
                  )}
                  {/* Hydration 완료 후 로그인 상태일 때만 대시보드 아이콘 표시 */}

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
