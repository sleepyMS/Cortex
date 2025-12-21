// file: frontend/src/components/layout/Header.tsx

"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
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
import { MobileNav } from "@/components/layout/MobileNav";

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
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit");
  const isCreateMode = searchParams.get("create") === "true";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Force scrolled style (opaque background) if in edit mode, create mode, or backtester detail page
  const isBacktestDetail =
    pathname.startsWith("/backtester/") &&
    pathname.length > "/backtester/".length;

  const isAuthPage = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ].some((path) => pathname.includes(path));

  const shouldShowBackground =
    scrolled || !!isEditMode || isCreateMode || isBacktestDetail || isAuthPage;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        shouldShowBackground
          ? "bg-background/80 backdrop-blur-md border-b border-border/40 py-1"
          : "bg-transparent border-transparent py-2"
      )}
    >
      <div className="container mx-auto grid grid-cols-[1fr_auto_1fr] items-center h-14 max-w-7xl px-4 relative">
        {/* 좌측 로고 및 모바일 메뉴 */}
        <div className="flex items-center gap-4 justify-self-start">
          <MobileNav />
          <Link href="/" aria-label="Go to homepage">
            <Logo />
          </Link>
        </div>

        {/* 중앙 네비게이션 (데스크탑) - Grid 중앙 배치 */}
        <nav className="hidden md:flex items-center gap-8 justify-self-center">
          {isAuthInitialized && user && (
            <>
              {[
                { href: "/strategies", label: tNav("strategies") },
                { href: "/backtester", label: tNav("backtester") },
                { href: "/optimization", label: tNav("optimization") },
                { href: "/marketplace", label: tNav("marketplace") },
                { href: "/bots", label: tNav("liveBots") },
              ].map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors relative group",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        "absolute -bottom-1 left-0 h-[1px] bg-primary transition-all duration-300",
                        isActive ? "w-full" : "w-0 group-hover:w-full"
                      )}
                    ></span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* 우측 아이콘 및 사용자 메뉴 */}
        <div className="flex items-center gap-3 justify-self-end">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          {hasHydrated && (
            <IconButton
              onClick={toggleTheme}
              aria-label={t("toggleTheme")}
              className="hidden md:flex"
            >
              {theme === "dark" ? (
                <Sun key="sun" className="h-5 w-5 theme-icon-animate" />
              ) : (
                <Moon key="moon" className="h-5 w-5 theme-icon-animate" />
              )}
            </IconButton>
          )}

          {isAuthInitialized && user && creditBalance && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild className="hidden md:block">
                  <Link href="/dashboard?tab=credits">
                    <div
                      className={cn(
                        "flex cursor-pointer items-center gap-1 rounded-full bg-muted/80 hover:bg-muted px-3 py-1 text-xs font-medium transition-colors"
                      )}
                    >
                      <Coins className="h-3.5 w-3.5 text-yellow-500" />
                      <span>{creditBalance.totalBalance.toLocaleString()}</span>
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
        </div>
      </div>
    </header>
  );
}
