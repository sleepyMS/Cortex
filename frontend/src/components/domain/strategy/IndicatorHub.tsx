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
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

type SelectedIndicatorState = {
  indicator: IndicatorMetadata;
  logicType?: string;
} | null;

interface IndicatorHubProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (indicator: IndicatorMetadata, logicType: string) => void;
  selectionMode?: "full" | "indicatorOnly";
}

export function IndicatorHub({
  isOpen,
  onOpenChange,
  onSelect,
  selectionMode = "full",
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
      onSelect(indicator, indicator.supported_logics[0]);
    } else {
      if (indicator.supported_logics.length === 1) {
        onSelect(indicator, indicator.supported_logics[0]);
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
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedIndicator.indicator.supported_logics.map((logic) => (
                  <div
                    key={logic}
                    className="p-3 border rounded-md hover:bg-accent hover:border-primary cursor-pointer transition-colors group bg-card"
                    onClick={() => handleLogicClick(logic)}
                  >
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {logicTypeTranslations[logic] || logic}
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
