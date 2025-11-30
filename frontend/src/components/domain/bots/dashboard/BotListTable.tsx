"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Link } from "@/i18n/navigation";
import { MoreHorizontal, Play, Square, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBots, updateBotStatus, deleteBot } from "@/lib/api/bots";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
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

export function BotListTable() {
  const t = useTranslations("LiveTrading.Dashboard.table");
  const tDetail = useTranslations("LiveTrading.Detail");
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<string | null>(null);

  // 봇 목록 조회
  const { data: bots, isLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: () => getBots(),
    refetchInterval: 10000, // 10초마다 자동 갱신
  });

  // 봇 상태 업데이트 Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      botId,
      status,
    }: {
      botId: string;
      status: "active" | "paused" | "stopped";
    }) => updateBotStatus(botId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast.success(tDetail("success.statusUpdated"));
    },
    onError: (error: any) => {
      toast.error(tDetail("errors.updateFailed"), {
        description: error.response?.data?.detail || error.message,
      });
    },
  });

  // 봇 삭제 Mutation
  const deleteMutation = useMutation({
    mutationFn: (botId: string) => deleteBot(botId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast.success(tDetail("success.deleted"));
    },
    onError: (error: any) => {
      toast.error(tDetail("errors.deleteFailed"), {
        description: error.response?.data?.detail || error.message,
      });
    },
  });

  const handleStartStop = (botId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    updateStatusMutation.mutate({ botId, status: newStatus });
  };

  const handleDeleteClick = (botId: string) => {
    setBotToDelete(botId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (botToDelete) {
      deleteMutation.mutate(botToDelete);
      setDeleteDialogOpen(false);
      setBotToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8">
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  if (!bots || bots.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        <p className="font-semibold text-foreground mb-2">
          {t("emptyStateTitle")}
        </p>
        <p>{t("emptyStateDesc")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("strategy")}</TableHead>
              <TableHead>{t("symbol")}</TableHead>
              <TableHead className="text-right">{t("pnl")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bots.map((bot) => (
              <TableRow key={bot.id}>
                <TableCell>
                  <Badge
                    variant={bot.status === "active" ? "default" : "secondary"}
                    className={
                      bot.status === "active"
                        ? "bg-green-500 hover:bg-green-600"
                        : bot.status === "error"
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-gray-500 hover:bg-gray-600"
                    }
                  >
                    {tDetail(`status.${bot.status}` as any)}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/bots/${bot.id}`} className="hover:underline">
                    {bot.strategy?.name || "Unknown Strategy"}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {bot.mode === "paper" ? "📄 Paper" : "🔴 Live"}
                  </div>
                </TableCell>
                <TableCell>{bot.strategy?.name || "N/A"}</TableCell>
                <TableCell>{bot.ticker}</TableCell>
                <TableCell className="text-right">
                  <div
                    className={
                      bot.totalPnl >= 0 ? "text-green-500" : "text-red-500"
                    }
                  >
                    ${Math.abs(bot.totalPnl).toFixed(2)}
                  </div>
                  <div
                    className={`text-xs ${
                      bot.totalPnl >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {bot.totalPnl >= 0 ? "+" : ""}
                    {bot.initialCapital > 0
                      ? ((bot.totalPnl / bot.initialCapital) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Link href={`/bots/${bot.id}`} className="flex w-full">
                          {t("viewDetails")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {bot.status === "active" ? (
                        <DropdownMenuItem
                          className="text-orange-500"
                          onClick={() => handleStartStop(bot.id, bot.status)}
                        >
                          <Square className="mr-2 h-4 w-4" />
                          {t("stopBot")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-green-500"
                          onClick={() => handleStartStop(bot.id, bot.status)}
                          disabled={bot.status === "error"}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          {t("startBot")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => handleDeleteClick(bot.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDetail("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tDetail("deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBotToDelete(null)}>
              {tDetail("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {tDetail("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
