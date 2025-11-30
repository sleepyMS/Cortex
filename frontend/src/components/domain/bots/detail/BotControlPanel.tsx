"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertCircle, Pause, Play, Trash2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBotStatus, deleteBot, panicSell, LiveBot } from "@/lib/api/bots";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
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

interface BotControlPanelProps {
  bot: LiveBot;
}

export function BotControlPanel({ bot }: BotControlPanelProps) {
  const t = useTranslations("LiveTrading.Detail");
  const queryClient = useQueryClient();
  const router = useRouter();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [panicSellDialogOpen, setPanicSellDialogOpen] = useState(false);

  // 상태 업데이트 Mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: "active" | "paused" | "stopped") =>
      updateBotStatus(bot.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot", bot.id] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast.success(t("success.statusUpdated"));
    },
    onError: (error: any) => {
      toast.error(t("errors.updateFailed"), {
        description: error.response?.data?.detail || error.message,
      });
    },
  });

  // 삭제 Mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteBot(bot.id),
    onSuccess: () => {
      toast.success(t("success.deleted"));
      router.push("/bots");
    },
    onError: (error: any) => {
      toast.error(t("errors.deleteFailed"), {
        description: error.response?.data?.detail || error.message,
      });
    },
  });

  // Panic Sell Mutation
  const panicSellMutation = useMutation({
    mutationFn: () => panicSell(bot.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot", bot.id] });
      toast.success(t("success.panicSellExecuted"), {
        description: t("success.positionsClosed"),
      });
    },
    onError: (error: any) => {
      toast.error(t("errors.panicSellFailed"), {
        description: error.response?.data?.detail || error.message,
      });
    },
  });

  const handleStartStop = () => {
    const newStatus = bot.status === "active" ? "paused" : "active";
    updateStatusMutation.mutate(newStatus);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="text-lg font-semibold capitalize">{bot.status}</p>
              </div>
              {bot.status === "active" ? (
                <Play className="h-8 w-8 text-green-500" />
              ) : bot.status === "error" ? (
                <AlertCircle className="h-8 w-8 text-red-500" />
              ) : (
                <Pause className="h-8 w-8 text-gray-500" />
              )}
            </div>
            {bot.lastError && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600 dark:text-red-400">
                <p className="font-semibold">Last Error:</p>
                <p>{bot.lastError}</p>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="space-y-2">
            {bot.status === "active" ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={handleStartStop}
                disabled={updateStatusMutation.isPending}
              >
                <Pause className="mr-2 h-4 w-4" />
                {t("pauseBot")}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleStartStop}
                disabled={
                  bot.status === "error" || updateStatusMutation.isPending
                }
              >
                <Play className="mr-2 h-4 w-4" />
                {t("startBot")}
              </Button>
            )}

            {bot.positionSize !== 0 && (
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => setPanicSellDialogOpen(true)}
                disabled={panicSellMutation.isPending}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                {t("panicSell")}
              </Button>
            )}

            <Button
              className="w-full"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("deleteBot")}
            </Button>
          </div>

          {/* Position Info */}
          {bot.positionSize !== 0 && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Active Position
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Side:</span>
                  <span className="font-medium">
                    {bot.positionSize > 0 ? "LONG" : "SHORT"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">
                    {Math.abs(bot.positionSize)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Price:</span>
                  <span className="font-medium">
                    ${bot.entryPrice?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Panic Sell Confirmation Dialog */}
      <AlertDialog
        open={panicSellDialogOpen}
        onOpenChange={setPanicSellDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("panicTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("panicDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => panicSellMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("confirmPanic")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
