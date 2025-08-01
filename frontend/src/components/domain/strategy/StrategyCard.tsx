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
} from "lucide-react"; // 아이콘 임포트

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
} from "@/components/ui/DropdownMenu"; // 드롭다운 메뉴 임포트
import { toast } from "sonner"; // 토스트 알림
import apiClient from "@/lib/apiClient"; // API 클라이언트
import { useMutation, useQueryClient } from "@tanstack/react-query"; // 뮤테이션, 쿼리 클라이언트
import { useRouter } from "next/navigation"; // Next.js 라우터

import { cn } from "@/lib/utils"; // cn 유틸리티

// 백엔드 schemas.Strategy와 일치하는 타입 정의
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

  const handleDelete = () => {
    if (confirm(t("confirmDelete", { strategyName: strategy.name }))) {
      deleteStrategyMutation.mutate(strategy.id);
    }
  };

  const handleTogglePublic = () => {
    togglePublicMutation.mutate(strategy.id);
  };

  return (
    <Card className="flex flex-col justify-between p-6 h-full transition-shadow hover:shadow-lg">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-foreground">{strategy.name}</h3>
          <Badge
            variant={strategy.is_public ? "default" : "outline"}
            className={
              strategy.is_public
                ? "bg-green-500 text-white"
                : "border-muted-foreground"
            }
          >
            {strategy.is_public ? t("statusPublic") : t("statusPrivate")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {strategy.description || t("noDescription")}
        </p>
      </div>

      <div className="mt-auto space-y-3">
        {" "}
        {/* 버튼들 간 간격 및 하단 정렬 */}
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* 편집 */}
              <Link href={`/strategies/${strategy.id}/edit`} passHref>
                <DropdownMenuItem className="cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" /> {t("editStrategy")}
                </DropdownMenuItem>
              </Link>
              {/* 백테스트 실행 */}
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/backtester?strategyId=${strategy.id}`)
                }
                className="cursor-pointer"
              >
                <BarChart2 className="mr-2 h-4 w-4" /> {t("runBacktest")}
              </DropdownMenuItem>
              {/* 라이브 봇 배포 */}
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/live-bots/new?strategyId=${strategy.id}`)
                } // TODO: 라이브 봇 배포 페이지 경로
                className="cursor-pointer"
              >
                <Bot className="mr-2 h-4 w-4" /> {t("deployLiveBot")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* 공개/비공개 토글 */}
              <DropdownMenuItem
                onClick={handleTogglePublic}
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
                onClick={handleDelete}
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
  );
}
