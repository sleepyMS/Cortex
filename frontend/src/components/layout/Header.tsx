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
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

export function Header() {
  const t = useTranslations("Header");
  const tNav = useTranslations("Navigation");
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // 👈 1. isAuthInitialized 상태를 함께 가져옵니다.
  const { user, logout, isAuthInitialized } = useUserStore();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    logout();
    toast.success(t("logoutSuccess"));
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" passHref>
            <Logo />
          </Link>

          <nav className="hidden items-center gap-4 md:flex">
            {/* 👈 isAuthInitialized가 true이고 user가 있을 때만 네비게이션 표시 */}
            {isAuthInitialized && user && (
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
            {/* 🔽🔽🔽 핵심 수정 영역 🔽🔽🔽 */}
            {!isAuthInitialized ? (
              // 2. 인증 확인 중일 때: 스켈레톤 UI 표시
              <Skeleton className="h-10 w-40" />
            ) : user ? (
              // 3. 인증 완료 & 로그인 상태일 때: 사용자 UI 표시
              <>
                <span className="mr-2 hidden text-sm text-foreground md:inline">
                  {user.email}
                </span>
                <Button onClick={handleLogout} variant="ghost" className="px-3">
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
              // 4. 인증 완료 & 로그아웃 상태일 때: 로그인/가입 버튼 표시
              <>
                <Link href="/login" passHref>
                  <Button variant="ghost">{t("login")}</Button>
                </Link>
                <Link href="/pricing" passHref>
                  <Button>{t("startPro")}</Button>
                </Link>
              </>
            )}
            {/* 🔼🔼🔼 핵심 수정 영역 완료 🔼🔼🔼 */}
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
