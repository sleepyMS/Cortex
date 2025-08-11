// file: frontend/src/components/domain/Header.tsx

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
import { Sun, Moon, LayoutDashboard, Settings, LogOut } from "lucide-react";
import LanguageSwitcher from "@/components/domain/LanguageSwitcher";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useUserSubscription } from "@/hooks/useUserSubscription";

export function Header() {
  const t = useTranslations("Header");
  const tNav = useTranslations("Navigation");
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const { user, logout, isAuthInitialized } = useUserStore();
  const { currentPlan, isPro } = useUserSubscription();

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
            {!isAuthInitialized ? (
              <Skeleton className="h-10 w-40" />
            ) : user ? (
              <>
                {!isPro && (
                  <Link href="/pricing" passHref>
                    <Button className="px-3">{t("upgradePlan")}</Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton aria-label={t("dashboardLink")}>
                      <LayoutDashboard className="h-5 w-5" />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex flex-col space-y-1 p-2">
                      <span className="text-sm font-medium leading-none">
                        {user.email}
                      </span>
                      <span className="text-xs leading-none text-muted-foreground">
                        {currentPlan}
                      </span>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>{t("dashboard")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{t("settings")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t("logout")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login" passHref>
                  <Button variant="ghost">{t("login")}</Button>
                </Link>
                <Link href="/pricing" passHref>
                  <Button>{t("startPro")}</Button>
                </Link>
              </>
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
