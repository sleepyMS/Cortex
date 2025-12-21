"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import {
  MoreHorizontal,
  Play,
  Plus,
  Square,
  Trash2,
  TrendingUp,
  TrendingDown,
  Zap,
  CircleDot,
} from "lucide-react";
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
import { motion } from "framer-motion";

export function BotListTable() {
  const t = useTranslations("LiveTrading.Dashboard.table");
  const tDashboard = useTranslations("LiveTrading.Dashboard");
  const tDetail = useTranslations("LiveTrading.Detail");
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const { data: bots, isLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: () => getBots(),
    refetchInterval: 10000,
  });

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
    setOpenDropdownId(null); // Close dropdown first
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="relative overflow-hidden p-5">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent" />
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="pt-4 border-t space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!bots || bots.length === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center py-20 px-6 border border-dashed rounded-2xl bg-muted/20">
        {/* Decorative gradient background */}
        <div className="absolute inset-0 gradient-mesh opacity-30 rounded-2xl" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t("emptyStateTitle")}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {t("emptyStateDesc")}
          </p>
          <Link href="/bots/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              {tDashboard("createNewBot")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bots.map((bot, index) => (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Link href={`/bots/${bot.id}`} className="block">
              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 group cursor-pointer">
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative p-5">
                  {/* Header: Status + Name + Actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Status indicator with pulse animation */}
                        <span className="relative flex h-2.5 w-2.5">
                          {bot.status === "active" && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          )}
                          <span
                            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                              bot.status === "active"
                                ? "bg-green-500"
                                : bot.status === "error"
                                ? "bg-red-500"
                                : "bg-gray-400"
                            }`}
                          />
                        </span>
                        <Badge
                          variant={
                            bot.status === "active" ? "default" : "secondary"
                          }
                          className={`text-xs ${
                            bot.status === "active"
                              ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"
                              : bot.status === "error"
                              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {tDetail(`status.${bot.status}` as any)}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {bot.strategy?.name || tDetail("unknownStrategy")}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className="text-xs font-normal border-border/50"
                        >
                          {bot.ticker}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs font-normal ${
                            bot.mode === "paper"
                              ? "border-amber-500/30 text-amber-500"
                              : "border-green-500/30 text-green-500"
                          }`}
                        >
                          {bot.mode === "paper"
                            ? tDetail("paperMode")
                            : tDetail("liveMode")}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions dropdown - stop propagation to prevent card click */}
                    <div onClick={(e) => e.preventDefault()}>
                      <DropdownMenu
                        open={openDropdownId === bot.id}
                        onOpenChange={(open) =>
                          setOpenDropdownId(open ? bot.id : null)
                        }
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Link
                              href={`/bots/${bot.id}`}
                              className="flex w-full"
                            >
                              {t("viewDetails")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {bot.status === "active" ? (
                            <DropdownMenuItem
                              className="text-orange-500"
                              onClick={() =>
                                handleStartStop(bot.id, bot.status)
                              }
                            >
                              <Square className="mr-2 h-4 w-4" />
                              {t("stopBot")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-green-500"
                              onClick={() =>
                                handleStartStop(bot.id, bot.status)
                              }
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
                    </div>
                  </div>

                  {/* Performance section */}
                  <div className="pt-4 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Total PnL */}
                      <div
                        className={`p-3 rounded-lg ${
                          bot.totalPnl >= 0 ? "bg-green-500/5" : "bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {bot.totalPnl >= 0 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {t("pnl")}
                          </span>
                        </div>
                        <p
                          className={`text-lg font-bold ${
                            bot.totalPnl >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {bot.totalPnl >= 0 ? "+" : "-"}$
                          {Math.abs(bot.totalPnl).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p
                          className={`text-xs ${
                            bot.totalPnl >= 0
                              ? "text-green-500/70"
                              : "text-red-500/70"
                          }`}
                        >
                          {bot.totalPnl >= 0 ? "+" : ""}
                          {bot.initialCapital > 0
                            ? (
                                (bot.totalPnl / bot.initialCapital) *
                                100
                              ).toFixed(2)
                            : "0.00"}
                          %
                        </p>
                      </div>

                      {/* Daily PnL */}
                      <div
                        className={`p-3 rounded-lg ${
                          bot.dailyPnl >= 0 ? "bg-green-500/5" : "bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Today
                          </span>
                        </div>
                        <p
                          className={`text-lg font-bold ${
                            bot.dailyPnl >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {bot.dailyPnl >= 0 ? "+" : "-"}$
                          {Math.abs(bot.dailyPnl).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p
                          className={`text-xs ${
                            bot.dailyPnl >= 0
                              ? "text-green-500/70"
                              : "text-red-500/70"
                          }`}
                        >
                          {bot.dailyPnl >= 0 ? "+" : ""}
                          {bot.initialCapital > 0
                            ? (
                                (bot.dailyPnl / bot.initialCapital) *
                                100
                              ).toFixed(2)
                            : "0.00"}
                          %
                        </p>
                      </div>
                    </div>

                    {/* Balance info */}
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Balance</span>
                        <span className="font-medium text-foreground">
                          $
                          {(
                            bot.currentBalance || bot.initialCapital
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
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
