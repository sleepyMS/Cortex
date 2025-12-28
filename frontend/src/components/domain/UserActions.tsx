"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/userStore";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { toast } from "sonner";
import clsx from "clsx";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Sparkles,
  User,
  Box,
  KeyRound,
  Coins,
} from "lucide-react";

// 플랜별 버튼 스타일을 관리하는 함수
const getPlanButtonClass = (isPro?: boolean, isTrader?: boolean) =>
  clsx(
    "hidden sm:flex items-center gap-2 border-2 transition-all duration-300",
    {
      "text-primary border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]":
        isPro,
      "text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-400 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]":
        isTrader,
      "text-amber-700 border-amber-700/40 hover:bg-amber-700/10 hover:text-amber-600 hover:shadow-[0_0_15px_rgba(217,119,6,0.3)]":
        !isPro && !isTrader,
    }
  );

export function UserActions() {
  const t = useTranslations("Header");
  const router = useRouter();
  const { user, logout, isAuthInitialized } = useUserStore();
  const { currentPlan, isPro, isTrader } = useUserSubscription();

  const handleLogout = () => {
    logout();
    toast.success(t("logoutSuccess"));
    router.push("/login");
  };

  // 1. 인증 상태 확인 중일 때 스켈레톤 UI 표시
  if (!isAuthInitialized) {
    return <Skeleton className="h-10 w-24 rounded-md" />;
  }

  // 2. 로그인한 사용자일 경우 드롭다운 메뉴 및 플랜 버튼 표시
  if (user) {
    return (
      <>
        <Link href="/pricing">
          <Button
            variant="outline"
            className={getPlanButtonClass(isPro, isTrader)}
          >
            {isTrader && <Sparkles className="h-4 w-4 text-yellow-400" />}
            <span className="font-bold">{currentPlan} Plan</span>
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton aria-label={t("userMenu")}>
              <User className="h-5 w-5" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none truncate">
                {user.email}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {currentPlan} Plan
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>{t("dashboard")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard?tab=assets">
                <Box className="mr-2 h-4 w-4" />
                <span>{t("assets")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard?tab=credits">
                <Coins className="mr-2 h-4 w-4" />
                <span>{t("credits")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard?tab=profile">
                <User className="mr-2 h-4 w-4" />
                <span>{t("profile")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard?tab=apiKeys">
                <KeyRound className="mr-2 h-4 w-4" />
                <span>{t("apiKeys")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard?tab=settings">
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
    );
  }

  // 3. 비로그인 사용자일 경우 로그인/시작하기 버튼 표시
  return (
    <div className="hidden items-center gap-2 sm:flex">
      <Link href="/login">
        <Button variant="ghost">{t("login")}</Button>
      </Link>
      <Link href="/pricing">
        <Button>{t("startPro")}</Button>
      </Link>
    </div>
  );
}
