"use client";

import { Button } from "@/components/ui/Button";
import { AlertTriangle, Pause, Play, Trash2 } from "lucide-react";
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

interface ActionBarProps {
  bot: LiveBot;
}

export function ActionBar({ bot }: ActionBarProps) {
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
    <div className="flex items-center justify-end gap-3">
      {bot.status === "active" ? (
        <Button
          variant="outline"
          onClick={handleStartStop}
          disabled={updateStatusMutation.isPending}
          className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
        >
          <Pause className="mr-2 h-4 w-4" />
          {t("pauseBot")}
        </Button>
      ) : (
        <Button
          onClick={handleStartStop}
          disabled={bot.status === "error" || updateStatusMutation.isPending}
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
        className="text-muted-foreground hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

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
