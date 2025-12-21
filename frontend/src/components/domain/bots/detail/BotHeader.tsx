"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, ChevronRight, Pause, Play, Trash2 } from "lucide-react";
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
import Link from "next/link";

interface BotHeaderProps {
  bot: LiveBot;
}

export function BotHeader({ bot }: BotHeaderProps) {
  const t = useTranslations("LiveTrading.Detail");
  const queryClient = useQueryClient();
  const router = useRouter();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [panicSellDialogOpen, setPanicSellDialogOpen] = useState(false);

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

  const panicSellMutation = useMutation({
    mutationFn: () => panicSell(bot.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot", bot.id] });
      queryClient.invalidateQueries({ queryKey: ["botLogs", bot.id] });
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
    <div className="relative pb-6 border-b">
      {/* Gradient background */}
      <div className="absolute inset-0 gradient-radial-subtle opacity-50 -z-10" />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          {/* Breadcrumbs */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Link
              href="/bots"
              className="hover:text-foreground transition-colors"
            >
              {t("bots")}
            </Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="font-medium text-foreground">
              {bot.strategy?.name || t("botDetail")}
            </span>
          </div>

          {/* Title & Status */}
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold tracking-tight">{bot.ticker}</h1>

            {/* Status Badge with pulse */}
            <Badge
              variant={bot.status === "active" ? "default" : "secondary"}
              className={`
                ${
                  bot.status === "active"
                    ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/30"
                    : bot.status === "error"
                    ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/30"
                    : "bg-muted text-muted-foreground"
                } border px-3 py-1 text-sm font-medium capitalize flex items-center gap-2
              `}
            >
              <span className="relative flex h-2 w-2">
                {bot.status === "active" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    bot.status === "active"
                      ? "bg-green-500"
                      : bot.status === "error"
                      ? "bg-red-500"
                      : "bg-gray-500"
                  }`}
                />
              </span>
              {t(`status.${bot.status}` as any)}
            </Badge>

            {/* Mode Badge */}
            <Badge
              variant="outline"
              className={`text-sm font-medium ${
                bot.mode === "paper"
                  ? "border-amber-500/30 text-amber-600"
                  : "border-green-500/30 text-green-600"
              }`}
            >
              {bot.mode === "paper"
                ? `📄 ${t("paperTrading")}`
                : `🔴 ${t("liveTrading")}`}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {bot.status === "active" ? (
            <Button
              variant="outline"
              onClick={handleStartStop}
              disabled={updateStatusMutation.isPending}
              className="border-orange-500/30 text-orange-600 hover:bg-orange-500/10 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-500/10"
            >
              <Pause className="mr-2 h-4 w-4" />
              {t("pauseBot")}
            </Button>
          ) : (
            <Button
              onClick={handleStartStop}
              disabled={
                bot.status === "error" || updateStatusMutation.isPending
              }
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="mr-2 h-4 w-4" />
              {t("startBot")}
            </Button>
          )}

          {bot.positionSize !== 0 && (
            <Button
              variant="destructive"
              onClick={() => setPanicSellDialogOpen(true)}
              disabled={panicSellMutation.isPending}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {t("panicSell")}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending}
            className="text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
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
    </div>
  );
}
