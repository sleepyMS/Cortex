// file: frontend/src/app/[locale]/(authenticated)/ai-lab/page.tsx

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { getMyAIModels, deleteAIModel } from "@/lib/api/ai";
import { Button } from "@/components/ui/Button";
import { GlassPane } from "@/components/ui/GlassPane";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { AIModelCard } from "@/components/domain/ai/AIModelCard";
import type { AIModelSummary, AIModelStatus } from "@/types/ai";
import { PlusCircle, Brain, Sparkles, Cpu, FlaskConical } from "lucide-react";

// Loading skeleton
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="relative overflow-hidden rounded-xl border bg-card p-5 space-y-4"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent" />
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30">
          <div className="space-y-2 text-center">
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-6 w-12 mx-auto" />
          </div>
          <div className="space-y-2 text-center border-l border-border/50">
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-6 w-12 mx-auto" />
          </div>
        </div>
        <div className="flex justify-between items-center pt-2 border-t">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// Empty state
const EmptyState = () => {
  const t = useTranslations("AILabPage");
  return (
    <div className="relative flex flex-col items-center justify-center py-20 px-6 border border-dashed rounded-2xl bg-muted/20">
      <div className="absolute inset-0 gradient-mesh opacity-30 rounded-2xl" />
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
          <Brain className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("empty.title")}
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {t("empty.description")}
        </p>
        <Link href="/ai-lab/new">
          <Button size="lg" className="gap-2">
            <Sparkles className="h-5 w-5" />
            {t("empty.createButton")}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default function AILabPage() {
  const t = useTranslations("AILabPage");
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch AI models
  const {
    data: models,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["aiModels", statusFilter],
    queryFn: () =>
      getMyAIModels({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      }),
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActiveJob = data?.some(
        (m) => m.status === "training" || m.status === "pending"
      );
      return hasActiveJob ? 5000 : false;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAIModel,
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["aiModels"] });
    },
    onError: (error: any) =>
      toast.error(
        t("deleteError", {
          error: error?.response?.data?.detail || error.message,
        })
      ),
  });

  const renderContent = () => {
    if (isLoading) return <LoadingSkeleton />;
    if (isError)
      return (
        <div className="text-center text-destructive py-10">
          {t("fetchError")}
        </div>
      );
    if (!models || models.length === 0) return <EmptyState />;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {models.map((model, index) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <AIModelCard
              model={model}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={
                deleteMutation.isPending &&
                deleteMutation.variables === model.id
              }
            />
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="relative mb-10">
        <div className="absolute inset-0 gradient-radial-subtle opacity-50 -z-10" />
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-6 border-b">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                <FlaskConical className="h-6 w-6 text-violet-500" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                {t("title")}
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
          </div>
          <Link href="/ai-lab/new">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500" />
              <Button
                size="lg"
                className="relative gap-2 bg-primary hover:bg-transparent hover:bg-gradient-to-r hover:from-violet-500 hover:to-fuchsia-500 text-primary-foreground shadow-lg hover:shadow-2xl transition-all duration-300 border-0"
              >
                <Sparkles className="h-5 w-5 group-hover:animate-pulse" />
                <span className="font-semibold">{t("createNewModel")}</span>
              </Button>
            </div>
          </Link>
        </div>
      </div>

      <GlassPane className="p-6 md:p-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Status Tabs */}
            <Tabs
              defaultValue="all"
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="w-full lg:w-auto"
            >
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-5 h-10 bg-background/50 border border-border/50">
                <TabsTrigger value="all">{t("filterStatusAll")}</TabsTrigger>
                <TabsTrigger
                  value="training"
                  className="data-[state=active]:text-blue-700 data-[state=active]:bg-blue-50 dark:data-[state=active]:text-blue-300 dark:data-[state=active]:bg-blue-950/30"
                >
                  <Cpu className="h-3 w-3 mr-1" />
                  {t("filterStatusTraining")}
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="data-[state=active]:text-emerald-700 data-[state=active]:bg-emerald-50 dark:data-[state=active]:text-emerald-300 dark:data-[state=active]:bg-emerald-950/30"
                >
                  {t("filterStatusCompleted")}
                </TabsTrigger>
                <TabsTrigger
                  value="failed"
                  className="data-[state=active]:text-rose-700 data-[state=active]:bg-rose-50 dark:data-[state=active]:text-rose-300 dark:data-[state=active]:bg-rose-950/30"
                >
                  {t("filterStatusFailed")}
                </TabsTrigger>
                <TabsTrigger value="pending">
                  {t("filterStatusPending")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Reset Filter */}
            {statusFilter !== "all" && (
              <Button
                variant="ghost"
                onClick={() => setStatusFilter("all")}
                className="px-3"
              >
                {t("resetFilters")}
              </Button>
            )}
          </div>
        </div>

        {renderContent()}
      </GlassPane>
    </div>
  );
}
