// frontend/src/components/domain/strategy/StrategyCard.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Strategy } from "@/types/strategy";

// --- Hooks ---
import {
  useDeleteStrategyMutation,
  useTogglePublicStrategyMutation,
  useUnlistStrategyMutation,
} from "@/hooks/useStrategyMutations";

// --- 아이콘 임포트 ---
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Bot,
  BarChart2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Loader2,
  ShoppingCart,
  XCircle,
  Store,
} from "lucide-react";

// --- UI 컴포넌트 임포트 ---
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

// --- 분리된 재사용 컴포넌트 임포트 ---
import { StrategyPerformanceBadges } from "./StrategyPerformanceBadges";
import { KeyIndicatorBadges } from "./KeyIndicatorBadges";

// --- Props 타입 정의 ---
interface StrategyCardProps {
  strategy: Strategy;
  viewMode?: "grid" | "list";
  onOpenListingModal: (strategy: Strategy) => void;
}

export function StrategyCard({
  strategy,
  viewMode = "grid",
  onOpenListingModal,
}: StrategyCardProps) {
  const t = useTranslations("StrategyCard");
  const router = useRouter();

  const deleteStrategyMutation = useDeleteStrategyMutation();
  const togglePublicMutation = useTogglePublicStrategyMutation();
  const unlistStrategyMutation = useUnlistStrategyMutation();

  // 2. 드롭다운의 열림/닫힘 상태를 관리할 state를 추가합니다.
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);

  // --- 이벤트 핸들러 ---
  const handleDelete = () => {
    if (confirm(t("confirmDelete", { strategyName: strategy.name }))) {
      deleteStrategyMutation.mutate(strategy.id);
    }
    // 핸들러가 끝나면 드롭다운을 닫습니다.
    setDropdownOpen(false);
  };

  const handleTogglePublic = () => {
    togglePublicMutation.mutate({
      strategyId: strategy.id,
      isPublic: strategy.isPublic,
    });
    setDropdownOpen(false);
  };

  const handleListOnMarketplace = () => {
    // 1. 부모 컴포넌트에 모달을 열어달라고 요청합니다.
    onOpenListingModal(strategy);
    // 2. 즉시 드롭다운 메뉴를 닫습니다.
    setDropdownOpen(false);
  };

  const handleUnlistFromMarketplace = () => {
    const productId = strategy.marketplaceListing?.productId;
    if (!productId) {
      toast.error("상품 ID를 찾을 수 없어 판매 중단할 수 없습니다.");
      setDropdownOpen(false);
      return;
    }

    if (confirm(t("confirmUnlist", { strategyName: strategy.name }))) {
      unlistStrategyMutation.mutate(productId);
    }
    setDropdownOpen(false);
  };

  // 라우팅하는 핸들러들
  const handleNavigate = (path: string) => {
    router.push(path);
    setDropdownOpen(false);
  };

  // --- 드롭다운 메뉴 UI ---
  const dropdownMenuContent = (
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => handleNavigate(`/strategies/${strategy.id}`)}
      >
        <Edit className="mr-2 h-4 w-4" />
        {t("editStrategy")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => handleNavigate(`/backtester?strategyId=${strategy.id}`)}
      >
        <BarChart2 className="mr-2 h-4 w-4" />
        {t("runBacktest")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() =>
          handleNavigate(`/live-bots/new?strategyId=${strategy.id}`)
        }
      >
        <Bot className="mr-2 h-4 w-4" />
        {t("deployLiveBot")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {strategy.marketplaceListing ? (
        <>
          <DropdownMenuItem onSelect={handleListOnMarketplace}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t("editListing")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={handleUnlistFromMarketplace}
            className="text-amber-600 focus:text-amber-700"
            disabled={unlistStrategyMutation.isPending}
          >
            {unlistStrategyMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            {t("unlistFromMarket")}
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem onSelect={handleListOnMarketplace}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {t("listOnMarket")}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onSelect={handleTogglePublic}
        disabled={togglePublicMutation.isPending}
      >
        {togglePublicMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : strategy.isPublic ? (
          <EyeOff className="mr-2 h-4 w-4" />
        ) : (
          <Eye className="mr-2 h-4 w-4" />
        )}
        {strategy.isPublic ? t("makePrivate") : t("makePublic")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={handleDelete}
        className="text-[hsl(var(--destructive))] focus:bg-[hsl(var(--destructive))]/10 focus:text-[hsl(var(--destructive))]"
        disabled={deleteStrategyMutation.isPending}
      >
        {deleteStrategyMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-2 h-4 w-4" />
        )}
        {t("deleteStrategy")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const displayDateString = strategy.updatedAt || strategy.createdAt;

  // --- List View 렌더링 ---
  if (viewMode === "list") {
    return (
      <Card className="flex items-center w-full p-3 transition-all duration-200 ease-in-out border border-border hover:border-primary/50 hover:shadow-md">
        <Link
          href={`/strategies/${strategy.id}`}
          className="flex items-center gap-4 flex-grow truncate"
        >
          <div className="flex-grow truncate">
            <h3 className="text-base font-bold text-foreground truncate">
              {strategy.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {strategy.description || t("noDescription")}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <div className="hidden xl:block">
            <StrategyPerformanceBadges
              summary={strategy.latestBacktestSummary}
            />
          </div>
          <div className="hidden lg:block">
            <KeyIndicatorBadges strategy={strategy} />
          </div>
          {strategy.marketplaceListing && (
            <Badge
              variant="secondary"
              className="hidden sm:flex bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100"
            >
              <Store className="mr-1 h-3.5 w-3.5" />
              {t("selling")}
            </Badge>
          )}
          <Badge
            className={cn(
              "flex items-center gap-1.5",
              strategy.isPublic
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-800"
            )}
          >
            {strategy.isPublic ? (
              <Globe className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
          </Badge>
          <p className="hidden sm:block text-xs text-muted-foreground w-24 text-right">
            {t("updatedAt")}:{" "}
            {displayDateString
              ? format(new Date(displayDateString), "yyyy-MM-dd")
              : t("noDate")}
          </p>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            {dropdownMenuContent}
          </DropdownMenu>
        </div>
      </Card>
    );
  }

  // --- Grid View 렌더링 ---
  return (
    <Card className="flex flex-col justify-between h-full transition-all duration-200 ease-in-out border border-border hover:border-primary hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring">
      <Link
        href={`/strategies/${strategy.id}`}
        className="flex flex-col flex-grow h-full p-6"
      >
        <CardHeader className="p-0 mb-4">
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl font-bold text-foreground pr-2">
              {strategy.name}
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              {strategy.marketplaceListing && (
                <Badge
                  variant="secondary"
                  className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100"
                >
                  <Store className="mr-1 h-3.5 w-3.5" />
                  {t("selling")}
                </Badge>
              )}
              <Badge
                className={cn(
                  "flex items-center gap-1.5",
                  strategy.isPublic
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100 text-slate-800"
                )}
              >
                {strategy.isPublic ? (
                  <Globe className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                <span>
                  {strategy.isPublic ? t("statusPublic") : t("statusPrivate")}
                </span>
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {strategy.description || t("noDescription")}
          </p>
          <div className="mt-4">
            <StrategyPerformanceBadges
              summary={strategy.latestBacktestSummary}
            />
          </div>
        </CardContent>
      </Link>
      <CardFooter className="p-6 pt-4 flex flex-col items-start gap-4">
        <div className="min-h-[24px]">
          <KeyIndicatorBadges strategy={strategy} />
        </div>
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-muted-foreground">
            {t("updatedAt")}:{" "}
            {displayDateString
              ? format(new Date(displayDateString), "yyyy-MM-dd")
              : t("noDate")}
          </p>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            {dropdownMenuContent}
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}
