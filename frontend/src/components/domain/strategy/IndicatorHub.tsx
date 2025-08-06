// file: frontend/src/components/domain/strategy/IndicatorHub.tsx

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { INDICATOR_METADATA, IndicatorMetadata } from "@/lib/indicators";
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

type SelectedIndicatorState = {
  indicator: IndicatorMetadata;
  logicType?: string;
} | null;

interface IndicatorHubProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (indicator: IndicatorMetadata, logicType: string) => void;
}

export function IndicatorHub({
  isOpen,
  onOpenChange,
  onSelect,
}: IndicatorHubProps) {
  const t = useTranslations("StrategyBuilder");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndicator, setSelectedIndicator] =
    useState<SelectedIndicatorState>(null);

  const categories = useMemo(
    () => [
      "All",
      "Price",
      "Trend",
      "Momentum",
      "Volatility",
      "Volume",
      "Channel",
      "Quant",
      "Candlestick",
    ],
    []
  );

  const filteredIndicators = useMemo(() => {
    if (!searchTerm) return INDICATOR_METADATA;
    return INDICATOR_METADATA.filter((ind) =>
      ind.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const logicTypeTranslations = {
    comparison: t("logic.comparison"),
    crossover: t("logic.crossover"),
    state: t("logic.state"),
    trend_signal: t("logic.trend_signal"),
    channel: t("logic.channel"),
    divergence: t("logic.divergence"),
    pattern: t("logic.pattern"),
  };

  const handleIndicatorClick = (indicator: IndicatorMetadata) => {
    if (indicator.supported_logics.length === 1) {
      onSelect(indicator, indicator.supported_logics[0]);
      onOpenChange(false);
    } else {
      setSelectedIndicator({ indicator });
    }
  };

  const handleLogicClick = (logicType: string) => {
    if (selectedIndicator) {
      onSelect(selectedIndicator.indicator, logicType);
      setSelectedIndicator(null);
      onOpenChange(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedIndicator(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full sm:max-w-md md:max-w-lg lg:max-w-4xl h-[75vh] flex flex-col rounded-lg bg-background border border-primary">
        <DialogHeader className="px-4 pt-4 pb-4 border-b border-border/50 sm:px-6 sm:pt-6 sm:pb-4">
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
        </DialogHeader>

        <div className="flex-shrink-0">
          <div className="px-4 my-4 sm:px-6">
            <Input
              placeholder={t("searchIndicatorPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background border-input focus-visible:ring-ring"
            />
          </div>

          {!selectedIndicator ? (
            <Tabs defaultValue="All" className="w-full">
              <HorizontalScrollArea className="px-4 sm:px-6">
                <TabsList className="w-max bg-muted/30">
                  {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat}>
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </HorizontalScrollArea>

              <ScrollArea className="flex-grow mt-4 h-[calc(75vh-300px)] px-4 sm:px-6">
                {categories.map((cat) => (
                  <TabsContent key={cat} value={cat} className="pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredIndicators
                        .filter((ind) => cat === "All" || ind.category === cat)
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
                    </div>
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          ) : (
            <div className="px-4 py-2 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedIndicator.indicator.supported_logics.map((logic) => (
                  <div
                    key={logic}
                    className="p-3 border rounded-md hover:bg-accent hover:border-primary cursor-pointer transition-colors group bg-card"
                    onClick={() => handleLogicClick(logic)}
                  >
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {
                        logicTypeTranslations[
                          logic as keyof typeof logicTypeTranslations
                        ]
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
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
