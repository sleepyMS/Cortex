"use client";

/**
 * AI 모델 선택 컴포넌트
 *
 * 전략 빌더에서 AI 신호 블록을 추가할 때 사용합니다.
 * 사용자의 학습된 AI 모델 목록을 표시하고,
 * 신뢰도 임계값을 설정할 수 있습니다.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Slider } from "@/components/ui/Slider";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Brain, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { getMyAIModels } from "@/lib/api/ai";
import { AIModelSummary } from "@/types/ai";
import { cn } from "@/lib/utils";

interface AIModelSelectorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (config: AISignalBlockConfig) => void;
  backtestStartDate?: Date; // 미래 참조 검증용
}

export interface AISignalBlockConfig {
  modelId: string;
  modelName: string;
  signalType: "buy" | "sell" | "hold";
  minConfidence: number;
  trainingEndDate?: string;
}

export function AIModelSelector({
  isOpen,
  onOpenChange,
  onSelect,
  backtestStartDate,
}: AIModelSelectorProps) {
  const t = useTranslations("StrategyBuilder");

  const [selectedModel, setSelectedModel] = useState<AIModelSummary | null>(
    null
  );
  const [signalType, setSignalType] = useState<"buy" | "sell" | "hold">("buy");
  const [minConfidence, setMinConfidence] = useState<number>(0.6);

  // AI 모델 목록 조회
  const {
    data: models,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ai-models", "completed"],
    queryFn: () => getMyAIModels(),
    enabled: isOpen,
    staleTime: 30000, // 30초 캐시
  });

  const completedModels =
    models?.filter((m: AIModelSummary) => m.status === "completed") || [];

  // 미래 참조 검증
  const hasLookaheadBias = (model: AIModelSummary): boolean => {
    if (!backtestStartDate || !model.trainingEndDate) return false;
    const trainingEnd = new Date(model.trainingEndDate);
    return trainingEnd >= backtestStartDate;
  };

  const handleConfirm = () => {
    if (!selectedModel) return;

    onSelect({
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      signalType,
      minConfidence,
      trainingEndDate: selectedModel.trainingEndDate,
    });

    // Reset state
    setSelectedModel(null);
    setSignalType("buy");
    setMinConfidence(0.6);
    onOpenChange(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedModel(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-500" />
            {t("aiModelSelector.title")}
          </DialogTitle>
          <DialogDescription>
            {t("aiModelSelector.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 모델 선택 */}
          <div className="space-y-2">
            <Label>{t("aiModelSelector.selectModel")}</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : completedModels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t("aiModelSelector.noModels")}</p>
                <p className="text-xs mt-1">
                  {t("aiModelSelector.trainFirst")}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                  {completedModels.map((model: AIModelSummary) => {
                    const hasLookahead = hasLookaheadBias(model);
                    const isSelected = selectedModel?.id === model.id;

                    return (
                      <div
                        key={model.id}
                        className={cn(
                          "p-3 rounded-md border cursor-pointer transition-colors",
                          isSelected
                            ? "border-violet-500 bg-violet-500/10"
                            : "hover:bg-accent",
                          hasLookahead && "opacity-60"
                        )}
                        onClick={() => setSelectedModel(model)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-violet-500" />
                            )}
                            <span className="font-medium">{model.name}</span>
                          </div>
                          {hasLookahead && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {t("aiModelSelector.lookaheadWarning")}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {model.trainingSymbol} · {model.trainingTimeframe} ·
                          학습: {model.trainingStartDate?.slice(0, 10)} ~{" "}
                          {model.trainingEndDate?.slice(0, 10)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* 미래 참조 경고 */}
          {selectedModel && hasLookaheadBias(selectedModel) && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">
                    {t("aiModelSelector.lookaheadTitle")}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {t("aiModelSelector.lookaheadDescription")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 신호 타입 선택 */}
          {selectedModel && (
            <>
              <div className="space-y-2">
                <Label>{t("aiModelSelector.signalType")}</Label>
                <Select
                  value={signalType}
                  onValueChange={(value) =>
                    setSignalType(value as "buy" | "sell" | "hold")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">
                      {t("aiModelSelector.signalBuy")}
                    </SelectItem>
                    <SelectItem value="sell">
                      {t("aiModelSelector.signalSell")}
                    </SelectItem>
                    <SelectItem value="hold">
                      {t("aiModelSelector.signalHold")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 신뢰도 임계값 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>{t("aiModelSelector.minConfidence")}</Label>
                  <span className="text-sm font-medium text-violet-500">
                    {Math.round(minConfidence * 100)}%
                  </span>
                </div>
                <Slider
                  value={[minConfidence]}
                  onValueChange={(value) => setMinConfidence(value[0])}
                  min={0.1}
                  max={0.99}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t("aiModelSelector.confidenceDescription")}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedModel}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {t("aiModelSelector.addBlock")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
