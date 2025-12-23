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
  MoreVertical,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
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
  compact?: boolean; // For split view sidebar
}

export function StrategyCard({
  strategy,
  viewMode = "grid",
  onOpenListingModal,
  compact = false,
}: StrategyCardProps) {
  const t = useTranslations("StrategyCard");
  const router = useRouter();

  const deleteStrategyMutation = useDeleteStrategyMutation();
  const togglePublicMutation = useTogglePublicStrategyMutation();
  const unlistStrategyMutation = useUnlistStrategyMutation();

  const [isDropdownOpen, setDropdownOpen] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // --- 이벤트 핸들러 ---
  const handleDeleteClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    // Capture current URL state BEFORE mutation
    const currentParams = new URLSearchParams(window.location.search);
    const currentEditId = currentParams.get("edit");
    const currentCreateMode = currentParams.get("create");

    deleteStrategyMutation.mutate(strategy.id, {
      onSuccess: () => {
        // Only redirect if we're deleting the currently edited strategy
        if (currentEditId === strategy.id || currentCreateMode) {
          router.push("/strategies");
        }
      },
    });
    setShowDeleteConfirm(false);
    setDropdownOpen(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
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
    onOpenListingModal(strategy);
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

  const handleNavigate = (path: string) => {
    router.push(path);
    setDropdownOpen(false);
  };

  // --- 드롭다운 메뉴 UI ---
  const dropdownMenuContent = (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {t("actions")}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => handleNavigate(`/strategies?edit=${strategy.id}`)}
        className="cursor-pointer"
      >
        <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
        {t("editStrategy")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => handleNavigate(`/backtester?strategyId=${strategy.id}`)}
        className="cursor-pointer"
      >
        <BarChart2 className="mr-2 h-4 w-4 text-muted-foreground" />
        {t("runBacktest")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() =>
          handleNavigate(`/live-bots/new?strategyId=${strategy.id}`)
        }
        className="cursor-pointer"
      >
        <Bot className="mr-2 h-4 w-4 text-muted-foreground" />
        {t("deployLiveBot")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {strategy.marketplaceListing ? (
        <>
          <DropdownMenuItem
            onSelect={handleListOnMarketplace}
            className="cursor-pointer"
          >
            <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />
            {t("editListing")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={handleUnlistFromMarketplace}
            className="text-amber-600 focus:text-amber-600 cursor-pointer focus:bg-amber-600/10"
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
        <DropdownMenuItem
          onSelect={handleListOnMarketplace}
          className="cursor-pointer"
        >
          <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />
          {t("listOnMarket")}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onSelect={handleTogglePublic}
        disabled={togglePublicMutation.isPending}
        className="cursor-pointer"
      >
        {togglePublicMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : strategy.isPublic ? (
          <EyeOff className="mr-2 h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
        )}
        {strategy.isPublic ? t("makePrivate") : t("makePublic")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={handleDelete}
        className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
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
    // Compact mode for split view sidebar
    if (compact) {
      return (
        <>
          <div className="relative group">
            <Link href={`/strategies?edit=${strategy.id}`}>
              <Card className="w-full p-3 transition-all duration-200 ease-in-out border border-border/60 hover:border-primary/30 hover:shadow-sm bg-card/30 hover:bg-card cursor-pointer">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors flex-1">
                      {strategy.name}
                    </h3>
                    {strategy.marketplaceListing && (
                      <Badge
                        variant="secondary"
                        className="bg-teal-50 text-teal-700 border-teal-200 text-[9px] px-1 py-0 h-4 flex-shrink-0"
                      >
                        <Store className="h-2.5 w-2.5" />
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {strategy.description || t("noDescription")}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      {strategy.isPublic ? (
                        <Globe className="h-3 w-3 text-blue-600" />
                      ) : (
                        <Lock className="h-3 w-3 text-slate-500" />
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {strategy.isPublic
                          ? t("statusPublic")
                          : t("statusPrivate")}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {displayDateString
                        ? format(new Date(displayDateString), "MM.dd")
                        : t("noDate")}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
            {/* Delete button - appears on hover, positioned at top right (or left of marketplace badge) */}
            <button
              onClick={handleDeleteClick}
              className={`absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-destructive z-10 ${
                strategy.marketplaceListing ? "right-8" : "right-2"
              }`}
              aria-label={t("deleteStrategy")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Delete confirmation dialog */}
          <AlertDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {strategy.name}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수
                  없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      );
    }

    // Full list view for normal page
    return (
      <Card className="group flex items-center w-full p-4 transition-all duration-200 ease-in-out border border-border/60 hover:border-primary/20 hover:shadow-sm bg-card/50 hover:bg-card">
        <Link
          href={`/strategies?edit=${strategy.id}`}
          className="flex items-center gap-6 flex-grow truncate"
        >
          <div className="flex-grow truncate space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {strategy.name}
              </h3>
              {strategy.marketplaceListing && (
                <Badge
                  variant="secondary"
                  className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] px-1.5 py-0 h-5"
                >
                  <Store className="mr-1 h-3 w-3" />
                  {t("selling")}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-2xl">
              {strategy.description || t("noDescription")}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-6 flex-shrink-0 ml-4">
          <div className="hidden xl:block">
            <StrategyPerformanceBadges
              summary={strategy.latestBacktestSummary}
            />
          </div>
          <div className="hidden lg:block">
            <KeyIndicatorBadges strategy={strategy} />
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1.5 h-7 px-2.5 font-normal",
                strategy.isPublic
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              )}
            >
              {strategy.isPublic ? (
                <Globe className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              <span className="text-xs">
                {strategy.isPublic ? t("statusPublic") : t("statusPrivate")}
              </span>
            </Badge>

            <p className="hidden sm:block text-xs text-muted-foreground w-24 text-right tabular-nums">
              {displayDateString
                ? format(new Date(displayDateString), "yyyy.MM.dd")
                : t("noDate")}
            </p>

            <DropdownMenu open={isDropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              {dropdownMenuContent}
            </DropdownMenu>
          </div>
        </div>
      </Card>
    );
  }

  // --- Grid View 렌더링 ---
  return (
    <Card className="group flex flex-col justify-between h-full transition-all duration-300 ease-in-out border border-border/60 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 bg-card/50 hover:bg-card overflow-hidden">
      <Link
        href={`/strategies?edit=${strategy.id}`}
        className="flex flex-col flex-grow h-full p-5"
      >
        <CardHeader className="p-0 mb-3 space-y-1">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-1">
              {strategy.name}
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              {strategy.marketplaceListing && (
                <Badge
                  variant="secondary"
                  className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] px-1.5 py-0 h-5"
                >
                  <Store className="mr-1 h-3 w-3" />
                  {t("selling")}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1.5 h-5 px-1.5 text-[10px] font-normal",
                  strategy.isPublic
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                )}
              >
                {strategy.isPublic ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                <span>
                  {strategy.isPublic ? t("statusPublic") : t("statusPrivate")}
                </span>
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] leading-relaxed">
            {strategy.description || t("noDescription")}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider font-medium">
              <span>Performance</span>
            </div>
            <StrategyPerformanceBadges
              summary={strategy.latestBacktestSummary}
            />
          </div>
        </CardContent>
      </Link>
      <CardFooter className="px-5 py-3 border-t bg-muted/20 flex flex-col gap-2">
        <div className="w-full">
          <KeyIndicatorBadges strategy={strategy} />
        </div>
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-muted-foreground tabular-nums">
            {displayDateString
              ? format(new Date(displayDateString), "yyyy.MM.dd")
              : t("noDate")}
          </p>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 -mr-2"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            {dropdownMenuContent}
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}
