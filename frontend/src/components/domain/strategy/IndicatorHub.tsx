"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { ArrowLeft, Brain } from "lucide-react";

import { useIndicatorStore } from "@/store/indicatorStore";
import { IndicatorMetadata } from "@/types/indicator";
import { AIModelSelector, AISignalBlockConfig } from "./AIModelSelector";

type SelectedIndicatorState = {
  indicator: IndicatorMetadata;
  logicType?: string;
} | null;

interface IndicatorHubProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (indicator: IndicatorMetadata, logicType: string) => void;
  onAIModelSelect?: (config: AISignalBlockConfig) => void;
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
  const [selectedIndicator, setSelectedIndicator] =
    useState<SelectedIndicatorState>(null);
  const [isAIModelSelectorOpen, setIsAIModelSelectorOpen] = useState(false);

  const indicatorMetadata = useIndicatorStore((state) => state.metadata);

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

  const logicTypeTranslations: { [key: string]: string } = {
    comparison: t("logic.comparison"),
    crossover: t("logic.crossover"),
    state: t("logic.state"),
    trend_signal: t("logic.trend_signal"),
    channel: t("logic.channel"),
    divergence: t("logic.divergence"),
    pattern: t("logic.pattern"),
  };

  const handleIndicatorClick = (indicator: IndicatorMetadata) => {
    if (selectionMode === "indicatorOnly") {
      onSelect(indicator, indicator.supportedLogics[0]);
    } else {
      if (indicator.supportedLogics.length === 1) {
        onSelect(indicator, indicator.supportedLogics[0]);
      } else {
        setSelectedIndicator({ indicator });
      }
    }
  };

  const handleLogicClick = (logicType: string) => {
    if (selectedIndicator) {
      onSelect(selectedIndicator.indicator, logicType);
      setSelectedIndicator(null);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedIndicator(null);
      setSearchTerm("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full sm:max-w-md md:max-w-lg lg:max-w-4xl h-[75vh] flex flex-col p-0 rounded-lg bg-background border border-primary">
        <DialogHeader className="flex-row gap-4 px-6 pt-6 pb-4 border-b flex-shrink-0">
          {selectedIndicator && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => setSelectedIndicator(null)}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          )}
          <div className="flex-grow">
            <DialogTitle>
              {selectedIndicator
                ? `${selectedIndicator.indicator.label} ${t("logicHubTitle")}`
                : t("indicatorHubTitle")}
            </DialogTitle>
            <DialogDescription>
              {selectedIndicator
                ? t("logicHubDescription")
                : t("indicatorHubDescription")}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-shrink-0">
          {!selectedIndicator && (
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
          {!selectedIndicator ? (
            <Tabs defaultValue="All" className="flex flex-col h-full">
              <HorizontalScrollArea className="px-6 flex-shrink-0">
                <TabsList>
                  {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat}>
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </HorizontalScrollArea>
              <ScrollArea className="flex-grow mt-4 px-6 pb-6">
                {categories.map((cat) => (
                  <TabsContent key={cat} value={cat} className="pt-2">
                    {cat === "AI" ? (
                      /* AI 카테고리 특별 처리 */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div
                          className="p-4 border rounded-md hover:bg-violet-500/10 hover:border-violet-500 cursor-pointer transition-colors group bg-card flex flex-col items-center justify-center min-h-[120px]"
                          onClick={() => {
                            setIsAIModelSelectorOpen(true);
                          }}
                        >
                          <Brain className="h-8 w-8 text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
                          <p className="font-semibold text-foreground group-hover:text-violet-500 transition-colors text-center">
                            AI 신호
                          </p>
                          <p className="text-xs text-muted-foreground text-center mt-1">
                            학습된 AI 모델의 예측을 조건으로 사용
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* ▼▼▼ [핵심 수정 4] filter 로직이 동적 데이터를 사용하도록 합니다. ▼▼▼ */}
                        {filteredIndicators
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
                        {/* ▲▲▲ [수정 완료] ▲▲▲ */}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          ) : (
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedIndicator.indicator.supportedLogics.map((logic) => (
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

      {/* AI Model Selector Dialog */}
      <AIModelSelector
        isOpen={isAIModelSelectorOpen}
        onOpenChange={setIsAIModelSelectorOpen}
        onSelect={(config) => {
          if (onAIModelSelect) {
            onAIModelSelect(config);
            onOpenChange(false);
          }
          setIsAIModelSelectorOpen(false);
        }}
      />
    </Dialog>
  );
}
