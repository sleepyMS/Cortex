"use client";

import { Button } from "@/components/ui/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/AlertDialog";
import { Play, Square, AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { useTranslations } from "next-intl";

interface BotControlPanelProps {
  status: "running" | "stopped" | "error";
  onStart: () => void;
  onStop: () => void;
  onPanic: () => void;
  onDelete: () => void;
}

export function BotControlPanel({
  status,
  onStart,
  onStop,
  onPanic,
  onDelete,
}: BotControlPanelProps) {
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const t = useTranslations("LiveTrading.Detail");

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 mr-auto">
        <Badge
          variant={status === "running" ? "default" : "secondary"}
          className={`text-sm px-3 py-1 ${
            status === "running"
              ? "bg-green-500 hover:bg-green-600"
              : status === "error"
              ? "bg-red-500 hover:bg-red-600"
              : "bg-gray-500 hover:bg-gray-600"
          }`}
        >
          {status.toUpperCase()}
        </Badge>
      </div>

      {status === "stopped" || status === "error" ? (
        <Button
          onClick={onStart}
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          <Play className="h-4 w-4" />
          {t("startBot")}
        </Button>
      ) : (
        <Button onClick={onStop} variant="secondary" className="gap-2">
          <Square className="h-4 w-4 fill-current" />
          {t("stopBot")}
        </Button>
      )}

      <AlertDialog open={isPanicOpen} onOpenChange={setIsPanicOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t("panicSell")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("panicTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("panicDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onPanic();
                setIsPanicOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("confirmPanic")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="text-muted-foreground hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
