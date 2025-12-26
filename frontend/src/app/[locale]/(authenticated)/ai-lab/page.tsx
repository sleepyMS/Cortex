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
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 p-6 space-y-5 backdrop-blur-sm"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2.5 flex-1">
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/20 border border-border/50">
          <div className="space-y-2 text-center">
            <Skeleton className="h-3 w-14 mx-auto" />
            <Skeleton className="h-7 w-16 mx-auto rounded-md" />
          </div>
          <div className="space-y-2 text-center border-l border-border/50">
            <Skeleton className="h-3 w-14 mx-auto" />
            <Skeleton className="h-7 w-16 mx-auto rounded-md" />
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-border/40">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-9 rounded-full" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {models.map((model, index) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: (index % 12) * 0.05,
            }}
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
    <div className="container mx-auto max-w-7xl px-4 py-12">
      {/* 고도화된 헤더 - 그라데이션 배경 및 배지 포함 */}
      <div className="relative mb-12">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse-slow" />
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -z-10" />

        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8 pb-8 border-b border-border/40">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              AI Lab
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
              {t("subtitle")}
            </p>
          </div>
          <Link href="/ai-lab/new" className="shrink-0 w-full md:w-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500" />
              <Button
                size="lg"
                className="w-full md:w-auto relative gap-2 bg-primary hover:bg-transparent hover:bg-gradient-to-r hover:from-violet-500 hover:to-fuchsia-500 text-primary-foreground shadow-lg hover:shadow-2xl transition-all duration-300 border-0"
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
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            {/* Status Filter */}
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">
                Status Filter
              </span>
              <Tabs
                defaultValue="all"
                value={statusFilter}
                onValueChange={setStatusFilter}
                className="w-full lg:w-auto"
              >
                <TabsList className="flex p-1 h-11 bg-muted/50 backdrop-blur-sm border border-border/40 rounded-xl overflow-x-auto no-scrollbar">
                  <TabsTrigger
                    value="all"
                    className="px-5 rounded-lg font-bold text-xs capitalize transition-all duration-200"
                  >
                    {t("filterStatusAll")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="training"
                    className="px-5 rounded-lg font-bold text-xs capitalize transition-all duration-200"
                  >
                    <Cpu className="h-3 w-3 mr-1.5" />
                    {t("filterStatusTraining")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="px-5 rounded-lg font-bold text-xs capitalize transition-all duration-200"
                  >
                    {t("filterStatusCompleted")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="failed"
                    className="px-5 rounded-lg font-bold text-xs capitalize transition-all duration-200"
                  >
                    {t("filterStatusFailed")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="pending"
                    className="px-5 rounded-lg font-bold text-xs capitalize transition-all duration-200"
                  >
                    {t("filterStatusPending")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Reset Filter */}
            {statusFilter !== "all" && (
              <Button
                variant="ghost"
                onClick={() => setStatusFilter("all")}
                className="h-10 px-4 text-xs font-bold uppercase tracking-wider hover:bg-primary/5 hover:text-primary transition-all gap-2"
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
