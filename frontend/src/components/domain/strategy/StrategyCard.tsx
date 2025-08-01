// frontend/src/components/domain/strategy/StrategyCard.tsx

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Edit,
  Play,
  Share2,
  Trash2,
  Bot,
  BarChart2,
  Eye,
  EyeOff,
  Code,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
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
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface StrategyResponse {
  id: number;
  author_id: number;
  name: string;
  description?: string | null;
  rules: any; // SignalBlockData 형식의 규칙
  is_public: boolean;
  created_at: string; // ISO 8601 string
  updated_at?: string | null;
}

interface StrategyCardProps {
  strategy: StrategyResponse;
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const t = useTranslations("StrategyCard");
  const router = useRouter();
  const queryClient = useQueryClient();

  // 전략 삭제 뮤테이션
  const deleteStrategyMutation = useMutation({
    mutationFn: async (strategyId: number) => {
      await apiClient.delete(`/strategies/${strategyId}`);
    },
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] }); // 전략 목록 갱신
    },
    onError: (error) => {
      const apiErrorDetail = (error as any)?.response?.data?.detail;
      const errorMessage = apiErrorDetail || error.message;
      toast.error(t("deleteError", { error: errorMessage }));
      console.error("Strategy deletion failed:", errorMessage, error);
    },
  });

  // 전략 공개/비공개 토글 뮤테이션
  const togglePublicMutation = useMutation({
    mutationFn: async (strategyId: number) => {
      const { data } = await apiClient.put(`/strategies/${strategyId}`, {
        is_public: !strategy.is_public, // 현재 상태의 반대로 토글
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.is_public ? t("togglePublicSuccess") : t("togglePrivateSuccess")
      );
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] }); // 전략 목록 갱신
    },
    onError: (error) => {
      const apiErrorDetail = (error as any)?.response?.data?.detail;
      const errorMessage = apiErrorDetail || error.message;
      toast.error(t("togglePublicError", { error: errorMessage }));
      console.error("Strategy public toggle failed:", errorMessage, error);
    },
  });

  // 👈 handleDelete 함수 수정: 이벤트 전파 중단
  const handleDelete = (event: React.MouseEvent) => {
    // 이벤트 객체를 받도록 수정
    event.stopPropagation(); // 👈 이벤트 버블링 중단
    event.preventDefault(); // 👈 기본 동작(링크 이동 등) 방지
    if (confirm(t("confirmDelete", { strategyName: strategy.name }))) {
      deleteStrategyMutation.mutate(strategy.id);
    }
  };

  // 👈 handleTogglePublic 함수 수정: 이벤트 전파 중단
  const handleTogglePublic = (event: React.MouseEvent) => {
    // 이벤트 객체를 받도록 수정
    event.stopPropagation(); // 👈 이벤트 버블링 중단
    event.preventDefault(); // 👈 기본 동작 방지
    togglePublicMutation.mutate(strategy.id);
  };

  return (
    <Link href={`/strategies/${strategy.id}/edit`} passHref>
      <Card className="flex flex-col justify-between p-6 h-full cursor-pointer transition-all duration-200 ease-in-out border border-border hover:border-primary hover:shadow-lg">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-foreground">
              {strategy.name}
            </h3>
            <Badge
              variant={strategy.is_public ? "default" : "outline"}
              className={cn(
                strategy.is_public
                  ? "bg-green-500 text-white"
                  : "border-muted-foreground",
                "px-2 py-1 rounded-full"
              )}
            >
              {strategy.is_public ? t("statusPublic") : t("statusPrivate")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {strategy.description || t("noDescription")}
          </p>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex items-center text-xs text-muted-foreground">
            <Code className="h-3 w-3 mr-1" />
            <span>
              {t("createdAt")}:{" "}
              {format(new Date(strategy.created_at), "yyyy-MM-dd")}
            </span>
            {strategy.updated_at && (
              <span className="ml-3">
                {t("updatedAt")}:{" "}
                {format(new Date(strategy.updated_at), "yyyy-MM-dd")}
              </span>
            )}
          </div>

          {/* 액션 버튼 그룹 */}
          <div className="flex items-center justify-end gap-2">
            {/* 더보기 메뉴 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  {" "}
                  {/* 👈 여기도 추가: 드롭다운 메뉴 트리거 클릭 시 Link 버블링 방지 */}
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* 편집 */}
                <DropdownMenuItem
                  onClick={() => router.push(`/strategies/${strategy.id}/edit`)}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" /> {t("editStrategy")}
                </DropdownMenuItem>
                {/* 백테스트 실행 */}
                <DropdownMenuItem
                  onClick={(e) => {
                    // 👈 이벤트 버블링 중단 추가
                    e.stopPropagation();
                    router.push(`/backtester?strategyId=${strategy.id}`);
                  }}
                  className="cursor-pointer"
                >
                  <BarChart2 className="mr-2 h-4 w-4" /> {t("runBacktest")}
                </DropdownMenuItem>
                {/* 라이브 봇 배포 */}
                <DropdownMenuItem
                  onClick={(e) => {
                    // 👈 이벤트 버블링 중단 추가
                    e.stopPropagation();
                    router.push(`/live-bots/new?strategyId=${strategy.id}`);
                  }}
                  className="cursor-pointer"
                >
                  <Bot className="mr-2 h-4 w-4" /> {t("deployLiveBot")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* 공개/비공개 토글 */}
                <DropdownMenuItem
                  onClick={handleTogglePublic} // 👈 수정된 handleTogglePublic 호출
                  className="cursor-pointer"
                >
                  {togglePublicMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : strategy.is_public ? (
                    <EyeOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  {strategy.is_public ? t("makePrivate") : t("makePublic")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* 삭제 */}
                <DropdownMenuItem
                  onClick={handleDelete} // 👈 수정된 handleDelete 호출
                  className="text-destructive focus:text-destructive cursor-pointer"
                  disabled={deleteStrategyMutation.isPending}
                >
                  {deleteStrategyMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}{" "}
                  {t("deleteStrategy")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
    </Link>
  );
}
