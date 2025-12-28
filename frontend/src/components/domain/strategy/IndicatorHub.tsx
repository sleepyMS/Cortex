"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { HorizontalScrollArea } from "@/components/ui/HorizontalScrollArea";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Brain, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

import { useIndicatorStore } from "@/store/indicatorStore";
import { IndicatorMetadata } from "@/types/indicator";
import { getMyAIModels } from "@/lib/api/ai";
import { AIModelSummary } from "@/types/ai";

// AI 모델도 IndicatorMetadata 형태로 변환하기 위한 타입
type AIModelAsIndicator = {
  type: "ai_model";
  model: AIModelSummary;
};

type SelectedState = {
  item: IndicatorMetadata | AIModelAsIndicator;
  logicType?: string;
} | null;

interface IndicatorHubProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (indicator: IndicatorMetadata, logicType: string) => void;
  onAIModelSelect?: (
    modelId: string,
    modelName: string,
    logicType: string
  ) => void;
  selectionMode?: "full" | "indicatorOnly";
  showAICategory?: boolean;
}

export function IndicatorHub({
  isOpen,
  onOpenChange,
  onSelect,
  onAIModelSelect,
  selectionMode = "full",
  showAICategory = true,
}: IndicatorHubProps) {
  const t = useTranslations("StrategyBuilder");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<SelectedState>(null);

  const indicatorMetadata = useIndicatorStore((state) => state.metadata);

  // AI 모델 목록 조회
  const { data: aiModels, isLoading: isLoadingAI } = useQuery({
    queryKey: ["ai-models", "completed"],
    queryFn: () => getMyAIModels(),
    enabled: isOpen && showAICategory,
    staleTime: 30000,
  });

  const completedModels = useMemo(
    () =>
      aiModels?.filter((m: AIModelSummary) => m.status === "completed") || [],
    [aiModels]
  );

  const categories = useMemo(() => {
    if (!indicatorMetadata) return showAICategory ? ["All", "AI"] : ["All"];
    const uniqueCategories = new Set(
      indicatorMetadata.map((ind) => ind.category)
    );
    const cats = ["All", ...Array.from(uniqueCategories).sort()];
    // AI 카테고리는 맨 뒤에 추가
    if (showAICategory && !cats.includes("AI")) {
      cats.push("AI");
    }
    return cats;
  }, [indicatorMetadata, showAICategory]);

  const filteredIndicators = useMemo(() => {
    if (!indicatorMetadata) return [];
    if (!searchTerm) return indicatorMetadata;
    return indicatorMetadata.filter((ind) =>
      ind.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, indicatorMetadata]);

  const filteredAIModels = useMemo(() => {
    if (!completedModels.length) return [];
    if (!searchTerm) return completedModels;
    return completedModels.filter((m: AIModelSummary) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, completedModels]);

  const logicTypeTranslations: { [key: string]: string } = {
    comparison: t("logic.comparison"),
    crossover: t("logic.crossover"),
    state: t("logic.state"),
    trend_signal: t("logic.trend_signal"),
    channel: t("logic.channel"),
    divergence: t("logic.divergence"),
    pattern: t("logic.pattern"),
    ai_signal: t("logic.ai_signal"),
  };

  const handleIndicatorClick = (indicator: IndicatorMetadata) => {
    if (selectionMode === "indicatorOnly") {
      onSelect(indicator, indicator.supportedLogics[0]);
    } else {
      if (indicator.supportedLogics.length === 1) {
        onSelect(indicator, indicator.supportedLogics[0]);
      } else {
        setSelectedItem({ item: indicator });
      }
    }
  };

  const handleAIModelClick = (model: AIModelSummary) => {
    // AI 모델은 ai_signal 로직만 지원
    if (selectionMode === "indicatorOnly") {
      // indicatorOnly 모드에서는 AI 모델 선택 불가
      return;
    }
    // AI 모델 클릭 시 로직 선택 화면으로
    setSelectedItem({ item: { type: "ai_model", model } });
  };

  const handleLogicClick = (logicType: string) => {
    if (!selectedItem) return;

    if ("type" in selectedItem.item && selectedItem.item.type === "ai_model") {
      // AI 모델인 경우
      const model = selectedItem.item.model;
      if (onAIModelSelect) {
        onAIModelSelect(model.id, model.name, logicType);
      }
    } else {
      // 일반 지표인 경우
      onSelect(selectedItem.item as IndicatorMetadata, logicType);
    }
    setSelectedItem(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedItem(null);
      setSearchTerm("");
    }
    onOpenChange(open);
  };

  const getSelectedItemLabel = () => {
    if (!selectedItem) return "";
    if ("type" in selectedItem.item && selectedItem.item.type === "ai_model") {
      return selectedItem.item.model.name;
    }
    return (selectedItem.item as IndicatorMetadata).label;
  };

  const getSupportedLogics = (): string[] => {
    if (!selectedItem) return [];
    if ("type" in selectedItem.item && selectedItem.item.type === "ai_model") {
      return ["ai_signal"]; // AI 모델은 ai_signal만 지원
    }
    return (selectedItem.item as IndicatorMetadata).supportedLogics;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full sm:max-w-md md:max-w-lg lg:max-w-4xl h-[75vh] flex flex-col p-0 rounded-lg bg-background border border-primary">
        <DialogHeader className="flex-row gap-4 px-6 pt-6 pb-4 border-b flex-shrink-0">
          {selectedItem && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => setSelectedItem(null)}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          )}
          <div className="flex-grow">
            <DialogTitle>
              {selectedItem
                ? `${getSelectedItemLabel()} ${t("logicHubTitle")}`
                : t("indicatorHubTitle")}
            </DialogTitle>
            <DialogDescription>
              {selectedItem
                ? t("logicHubDescription")
                : t("indicatorHubDescription")}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-shrink-0">
          {!selectedItem && (
            <div className="px-6 my-4">
              <Input
                placeholder={t("searchIndicatorPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex-grow min-h-0">
          {!selectedItem ? (
            <Tabs defaultValue="All" className="flex flex-col h-full">
              <HorizontalScrollArea className="px-6 flex-shrink-0">
                <TabsList>
                  {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat}>
                      {cat === "AI" ? (
                        <span className="flex items-center gap-1">
                          <Brain className="h-3.5 w-3.5" />
                          {cat}
                        </span>
                      ) : (
                        cat
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </HorizontalScrollArea>
              <ScrollArea className="flex-grow mt-4 px-6 pb-6">
                {categories.map((cat) => (
                  <TabsContent key={cat} value={cat} className="pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* 일반 지표 표시 (All 또는 해당 카테고리) */}
                      {cat !== "AI" &&
                        filteredIndicators
                          .filter(
                            (ind) => cat === "All" || ind.category === cat
                          )
                          .map((indicator) => (
                            <div
                              key={indicator.key}
                              className="p-3 border rounded-md hover:bg-accent hover:border-primary cursor-pointer transition-colors group bg-card"
                              onClick={() => handleIndicatorClick(indicator)}
                            >
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {indicator.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {indicator.description}
                              </p>
                            </div>
                          ))}

                      {/* All 탭에서 AI 모델도 표시 */}
                      {cat === "All" &&
                        showAICategory &&
                        filteredAIModels.map((model: AIModelSummary) => (
                          <div
                            key={`ai-${model.id}`}
                            className="p-3 border rounded-md hover:bg-violet-500/10 hover:border-violet-500 cursor-pointer transition-colors group bg-card"
                            onClick={() => handleAIModelClick(model)}
                          >
                            <div className="flex items-center gap-2">
                              <Brain className="h-4 w-4 text-violet-500" />
                              <p className="font-semibold text-foreground group-hover:text-violet-500 transition-colors">
                                {model.name}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {model.trainingSymbol} · {model.trainingTimeframe}
                            </p>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              AI 모델
                            </Badge>
                          </div>
                        ))}

                      {/* AI 카테고리에서 AI 모델 표시 */}
                      {cat === "AI" && (
                        <>
                          {isLoadingAI ? (
                            <div className="col-span-full flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : filteredAIModels.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-muted-foreground">
                              <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>학습된 AI 모델이 없습니다</p>
                              <p className="text-xs mt-1">
                                AI Lab에서 모델을 먼저 학습해주세요
                              </p>
                            </div>
                          ) : (
                            filteredAIModels.map((model: AIModelSummary) => (
                              <div
                                key={model.id}
                                className="p-3 border rounded-md hover:bg-violet-500/10 hover:border-violet-500 cursor-pointer transition-colors group bg-card"
                                onClick={() => handleAIModelClick(model)}
                              >
                                <div className="flex items-center gap-2">
                                  <Brain className="h-4 w-4 text-violet-500" />
                                  <p className="font-semibold text-foreground group-hover:text-violet-500 transition-colors">
                                    {model.name}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {model.trainingSymbol} ·{" "}
                                  {model.trainingTimeframe}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  학습: {model.trainingStartDate?.slice(0, 10)}{" "}
                                  ~ {model.trainingEndDate?.slice(0, 10)}
                                </p>
                              </div>
                            ))
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          ) : (
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {getSupportedLogics().map((logic) => (
                  <div
                    key={logic}
                    className="p-3 border rounded-md hover:bg-accent hover:border-primary cursor-pointer transition-colors group bg-card"
                    onClick={() => handleLogicClick(logic)}
                  >
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {logicTypeTranslations[logic] || logic}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {/* @ts-expect-error */}
                      {t(`logicDescription.${logic}`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
