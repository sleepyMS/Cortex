// file: frontend/src/components/layout/Header.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Logo } from "@/components/ui/Logo";
import { Sun, Moon, LayoutDashboard, LogOut } from "lucide-react";
import LanguageSwitcher from "@/components/domain/LanguageSwitcher";
import { useRouter } from "next/navigation";
import useAuthStore, { useAuthHydration } from "@/store/authStore"; // useAuthHydration 임포트
import apiClient from "@/lib/apiClient";

const Header = () => {
  const t = useTranslations("Header");
  const router = useRouter();
  const [theme, setTheme] = React.useState("dark");

  const { isLoggedIn, userInfo, logout } = useAuthStore();
  const hasHydrated = useAuthHydration(); // useAuthHydration 훅 사용

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("light");
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleDashboardIconClick = () => {
    if (isLoggedIn) {
      router.push("/dashboard");
    } else {
      alert(t("loginRequiredForDashboard"));
      router.push("/login");
    }
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
          {/* hasHydrated가 true이고 isLoggedIn일 때만 대시보드 아이콘 표시 */}
          {hasHydrated && isLoggedIn && (
            <IconButton
              onClick={handleDashboardIconClick}
              aria-label={t("dashboardLink")}
            >
              <LayoutDashboard className="h-5 w-5" />
            </IconButton>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          <IconButton onClick={toggleTheme} aria-label={t("toggleTheme")}>
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </IconButton>

          <div className="hidden sm:flex items-center gap-2">
            {/* hasHydrated가 true가 되기 전까지는 UI가 흔들리지 않도록 처리 */}
            {hasHydrated ? (
              isLoggedIn ? (
                // 로그인 시
                <>
                  <span className="text-sm text-foreground mr-2 hidden md:inline">
                    {userInfo?.email || t("loggedInUser")}
                  </span>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="px-3"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("logout")}
                  </Button>
                  {/* 구독 등급에 따른 버튼 */}
                  {userInfo?.role === "basic" && (
                    <Link href="/pricing" passHref>
                      <Button>{t("startPro")}</Button>
                    </Link>
                  )}
                  {userInfo?.role === "pro" && (
                    <Link href="/settings/subscription" passHref>
                      <Button>{t("manageSubscription")}</Button>
                    </Link>
                  )}
                  {userInfo?.role === "admin" && (
                    <Link href="/admin/dashboard" passHref>
                      <Button>{t("adminDashboard")}</Button>
                    </Link>
                  )}
                </>
              ) : (
                // 로그인하지 않은 경우
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
              // Hydration이 완료되지 않았다면 빈 div를 렌더링하여 UI 깜빡임 방지
              <div className="w-40 h-10 bg-muted animate-pulse rounded-md"></div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export { Header };
