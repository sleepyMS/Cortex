// file: frontend/src/components/layout/MobileNav.tsx

"use client";

import * as React from "react";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { useTheme } from "next-themes";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { toast } from "sonner";
import { locales } from "i18n";
import { localeConfig, type Locale } from "@/i18n/config";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Separator } from "@/components/ui/Separator";
import { Switch } from "@/components/ui/Switch";
import {
  Menu,
  X,
  LineChart,
  FlaskConical,
  Zap,
  Store,
  Bot,
  LayoutDashboard,
  Box,
  Coins,
  User,
  KeyRound,
  Settings,
  LogOut,
  LogIn,
  Sparkles,
  Crown,
  Sun,
  Moon,
  Globe,
  Check,
  Github,
  Twitter,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

// 네비게이션 아이템 컴포넌트
const NavItem = ({ href, icon: Icon, label, onClick }: NavItemProps) => (
  <SheetClose asChild>
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-3",
        "text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "active:bg-accent/80"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{label}</span>
    </Link>
  </SheetClose>
);

// 액션 버튼 컴포넌트
const ActionButton = ({
  onClick,
  icon: Icon,
  label,
  variant = "ghost",
  className,
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  variant?: "ghost" | "destructive" | "default" | "outline";
  className?: string;
}) => (
  <SheetClose asChild>
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-3",
        "text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "active:bg-accent/80",
        variant === "destructive" && "text-destructive hover:text-destructive",
        className
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{label}</span>
    </button>
  </SheetClose>
);

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Header");
  const tNav = useTranslations("Navigation");
  const tMobile = useTranslations("MobileNav");
  const router = useRouter();
  const { user, logout, isAuthInitialized, creditBalance } = useUserStore();
  const { currentPlan, isPro, isTrader } = useUserSubscription();
  const { theme, setTheme } = useTheme();
  const currentLocale = useLocale();
  const hasHydrated = useHasHydrated();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleLogout = () => {
    logout();
    toast.success(t("logoutSuccess"));
    router.push("/login");
    setOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleLocaleChange = (newLocale: (typeof locales)[number]) => {
    // 쿼리 스트링을 유지하면서 언어 전환
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(fullPath as any, { locale: newLocale });
  };

  // 인증 상태 확인 중이면 렌더링하지 않음
  if (!isAuthInitialized) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton className="md:hidden" aria-label={tMobile("menu")}>
          <Menu className="h-5 w-5" />
        </IconButton>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-left">{tMobile("menu")}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-65px)]">
          {/* 사용자 정보 섹션 (로그인 시) */}
          {user && (
            <div className="border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <div className="flex items-center gap-1.5">
                    {isTrader && (
                      <Sparkles className="h-3 w-3 text-yellow-500" />
                    )}
                    {isPro && !isTrader && (
                      <Crown className="h-3 w-3 text-primary" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {currentPlan} Plan
                    </span>
                  </div>
                </div>
              </div>
              {/* 크레딧 잔액 */}
              {creditBalance && (
                <SheetClose asChild>
                  <Link
                    href="/dashboard?tab=credits"
                    className={cn(
                      "mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2",
                      "transition-colors hover:bg-muted/80"
                    )}
                  >
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">
                      {creditBalance.totalBalance.toLocaleString()} CC
                    </span>
                  </Link>
                </SheetClose>
              )}
            </div>
          )}

          {/* 메인 네비게이션 */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {/* 1. Services (Always visible) */}
            <div className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground/70">
              {tMobile("services")}
            </div>
            <NavItem href="/ai-lab" icon={Brain} label={tNav("aiLab")} />
            <NavItem
              href="/strategies"
              icon={LineChart}
              label={tNav("strategies")}
            />
            <NavItem
              href="/backtester"
              icon={FlaskConical}
              label={tNav("backtester")}
            />
            <NavItem
              href="/optimization"
              icon={Zap}
              label={tNav("optimization")}
            />
            <NavItem href="/bots" icon={Bot} label={tNav("liveBots")} />
            <NavItem
              href="/marketplace"
              icon={Store}
              label={tNav("marketplace")}
            />

            <Separator className="my-4" />

            {/* 2. Account (User only) */}
            {user && (
              <>
                <div className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground/70">
                  {tMobile("account")}
                </div>
                <NavItem
                  href="/dashboard"
                  icon={LayoutDashboard}
                  label={t("dashboard")}
                />
                <NavItem
                  href="/dashboard?tab=assets"
                  icon={Box}
                  label={t("assets")}
                />
                <NavItem
                  href="/dashboard?tab=profile"
                  icon={User}
                  label={t("profile")}
                />
                <NavItem
                  href="/dashboard?tab=apiKeys"
                  icon={KeyRound}
                  label={t("apiKeys")}
                />
                <NavItem
                  href="/dashboard?tab=settings"
                  icon={Settings}
                  label={t("settings")}
                />

                <Separator className="my-4" />
              </>
            )}

            {/* 3. Auth Buttons (Guest only) */}
            {!user && (
              <>
                <div className="space-y-2">
                  <SheetClose asChild>
                    <Link href="/login" className="block">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3"
                      >
                        <LogIn className="h-5 w-5" />
                        {tMobile("login")}
                      </Button>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/pricing" className="block">
                      <Button className="w-full justify-start gap-3">
                        <Sparkles className="h-5 w-5" />
                        {t("startPro")}
                      </Button>
                    </Link>
                  </SheetClose>
                </div>

                <Separator className="my-4" />
              </>
            )}

            {/* 4. Settings (Common) */}
            <div className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground/70">
              {tMobile("settings")}
            </div>

            {/* 언어 선택 */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-3 mb-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {tMobile("language")}
                </span>
              </div>
              <div className="flex gap-2">
                {locales.map((locale) => (
                  <button
                    key={locale}
                    onClick={() => handleLocaleChange(locale)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      currentLocale === locale
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {currentLocale === locale && (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {localeConfig[locale].nativeName}
                  </button>
                ))}
              </div>
            </div>

            {/* 테마 토글 */}
            {hasHydrated && (
              <button
                onClick={toggleTheme}
                className={cn(
                  "w-full flex items-center justify-between rounded-lg px-3 py-3",
                  "text-muted-foreground transition-colors",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {theme === "dark"
                      ? tMobile("darkMode")
                      : tMobile("lightMode")}
                  </span>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                  aria-label="Toggle theme"
                />
              </button>
            )}
          </nav>

          {/* 하단 로그아웃 버튼 (로그인 시) */}
          {user && (
            <div className="border-t px-3 py-4">
              <ActionButton
                onClick={handleLogout}
                icon={LogOut}
                label={t("logout")}
                variant="destructive"
              />
            </div>
          )}

          {/* 하단 법률 링크 */}
          <div className="border-t px-4 py-4 mt-auto">
            <div className="flex gap-3 text-xs text-muted-foreground">
              <SheetClose asChild>
                <Link
                  href="/terms"
                  className="hover:text-foreground transition-colors"
                >
                  {tMobile("terms")}
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  {tMobile("privacy")}
                </Link>
              </SheetClose>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
