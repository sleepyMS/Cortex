// file: frontend/src/components/domain/optimization/OptimizationHeader.tsx

"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Repeat,
  Zap,
  BarChartHorizontal,
  XCircle,
  Clock,
  Copy,
} from "lucide-react";

import apiClient from "@/lib/apiClient";
import { OptimizationJobDetail, OptimizationType } from "@/types/optimization";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";

interface OptimizationHeaderProps {
  job: OptimizationJobDetail;
}

export function OptimizationHeader({ job }: OptimizationHeaderProps) {
  const t = useTranslations("OptimizationDetailPage.Header");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");

  const handleOpenDialog = () => {
    if (job.bestTrial) {
      setNewStrategyName(
        `${job.strategy.name} (Optimized #${job.bestTrial.trialId})`
      );
    }
    setIsDialogOpen(true);
  };

  const handleRerun = () => {
    // 참고: /optimization/new?rerun_id=... 로직은 아직 구현되지 않았을 수 있습니다.
    // 우선 /optimization/new 로 보냅니다.
    router.push("/optimization/new");
  };

  const applyStrategyMutation = useMutation({
    mutationFn: async () => {
      if (!job.bestTrial) throw new Error(t("errorNoBestTrial"));

      const res = await apiClient.post(
        `/strategies/${job.strategy.id}/clone-with-optimization`,
        {
          optimizationId: job.id,
          trialId: job.bestTrial.trialId,
          newName: newStrategyName,
        }
      );
      return res.data;
    },
    onSuccess: (newStrategy) => {
      setIsDialogOpen(false);
      toast.success(t("cloneSuccess"), {
        description: newStrategy.name,
        action: {
          label: t("viewStrategy"),
          onClick: () => router.push(`/strategies/${newStrategy.id}/edit`),
        },
      });
    },
    onError: (error: any) => {
      toast.error(t("applyError"), {
        description: error?.response?.data?.detail || error.message,
      });
    },
  });

  const typeConfig: Record<
    OptimizationType,
    { label: string; Icon: React.ElementType; className: string }
  > = {
    general: {
      label: t("typeGeneral"),
      Icon: Zap,
      className:
        "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
    },
    wfo: {
      label: t("typeWfo"),
      Icon: BarChartHorizontal,
      className:
        "bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30",
    },
  };

  // [핵심 수정]
  // className을 textClass(텍스트용)와 iconClass(아이콘용)로 분리합니다.
  const statusConfig = {
    running: {
      icon: Loader2,
      text: t("statusRunning"),
      textClass: "text-blue-500",
      iconClass: "text-blue-500 animate-spin", // <-- 스핀은 아이콘에만 적용
    },
    pending: {
      icon: Clock,
      text: t("statusPending"),
      textClass: "text-yellow-500",
      iconClass: "text-yellow-500",
    },
    completed: {
      icon: CheckCircle,
      text: t("statusCompleted"),
      textClass: "text-emerald-500",
      iconClass: "text-emerald-500",
    },
    failed: {
      icon: AlertCircle,
      text: t("statusFailed"),
      textClass: "text-destructive",
      iconClass: "text-destructive",
    },
    canceled: {
      icon: XCircle,
      text: t("statusCanceled"),
      textClass: "text-muted-foreground",
      iconClass: "text-muted-foreground",
    },
  };

  const currentType = typeConfig[job.type];
  const currentStatus = statusConfig[job.status];
  const isRunning = job.status === "running" || job.status === "pending";
  const canApply = job.status === "completed" && !!job.bestTrial;

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* --- 좌측: 타이틀 및 메타정보 --- */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {job.strategy?.name || t("unknownStrategy")}
            </h1>
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1.5", currentType.className)}
            >
              <currentType.Icon className="h-3.5 w-3.5" />
              {currentType.label}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <time dateTime={job.createdAt}>
                {format(new Date(job.createdAt), "yyyy-MM-dd HH:mm")}
              </time>
            </div>

            {/* [핵심 수정] 
                아이콘과 텍스트에 분리된 클래스를 적용합니다.
            */}
            <div
              className={cn(
                "flex items-center gap-1.5",
                currentStatus.textClass // <-- 여기는 색상만 적용
              )}
            >
              <currentStatus.icon
                className={cn("h-4 w-4", currentStatus.iconClass)}
              />{" "}
              {/* <-- 여기에 스핀 적용 */}
              <span>{currentStatus.text}</span>
            </div>
          </div>
        </div>

        {/* --- 우측: 액션 버튼 --- */}
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRerun}
                  disabled={isRunning}
                >
                  <Repeat className="mr-2 h-4 w-4" />
                  {t("rerun")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("rerunTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenDialog}
                    disabled={!canApply}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {t("saveAsNewStrategy")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {!canApply
                    ? t("applyDisabledTooltip")
                    : t("applyEnabledTooltip")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* --- 새 전략 저장 다이얼로그 --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
            <DialogDescription>{t("dialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t("dialog.nameLabel")}
              </Label>
              <Input
                id="name"
                value={newStrategyName}
                onChange={(e) => setNewStrategyName(e.target.value)}
                className="col-span-3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={applyStrategyMutation.isPending}
            >
              {t("dialog.cancel")}
            </Button>
            <Button
              type="submit"
              onClick={() => applyStrategyMutation.mutate()}
              disabled={
                !newStrategyName.trim() || applyStrategyMutation.isPending
              }
            >
              {applyStrategyMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("dialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
