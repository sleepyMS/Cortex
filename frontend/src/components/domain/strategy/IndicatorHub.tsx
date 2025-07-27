// frontend/src/components/domain/strategy/IndicatorHub.tsx

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { INDICATOR_REGISTRY, IndicatorDefinition } from "@/lib/indicators";
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

interface IndicatorHubProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (indicator: IndicatorDefinition) => void;
}

export function IndicatorHub({
  isOpen,
  onOpenChange,
  onSelect,
}: IndicatorHubProps) {
  const t = useTranslations("StrategyBuilder");
  const [searchTerm, setSearchTerm] = useState("");
  const categories = useMemo(
    () => ["All", "Price", "Trend", "Momentum", "Volatility", "Volume"],
    []
  );

  const filteredIndicators = useMemo(() => {
    if (!searchTerm) return Object.values(INDICATOR_REGISTRY);
    return Object.values(INDICATOR_REGISTRY).filter((ind) =>
      ind.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-md md:max-w-lg lg:max-w-4xl h-[75vh] flex flex-col rounded-lg bg-background border border-primary">
        {" "}
        <DialogHeader className="px-4 pt-4 pb-4 border-b border-border/50 sm:px-6 sm:pt-6 sm:pb-4">
          <DialogTitle>{t("indicatorHubTitle")}</DialogTitle>
          <DialogDescription>{t("indicatorHubDescription")}</DialogDescription>
        </DialogHeader>
        {/* 상단 고정 영역 (검색창, 필터 바) */}
        <div className="flex-shrink-0">
          <div className="px-4 my-4 sm:px-6">
            {" "}
            {/* 각 섹션에 명시적인 수평 패딩 적용 */}
            <Input
              placeholder={t("searchIndicatorPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background border-input focus-visible:ring-ring"
            />
          </div>

          <Tabs defaultValue="All" className="w-full">
            <HorizontalScrollArea className="px-4 sm:px-6">
              {" "}
              {/* 각 섹션에 명시적인 수평 패딩 적용 */}
              <TabsList className="w-max bg-muted/30">
                {categories.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </HorizontalScrollArea>

            {/* 스크롤 가능한 콘텐츠 영역 */}
            <ScrollArea className="flex-grow mt-4 h-[calc(75vh-300px)] px-4 sm:px-6">
              {" "}
              {/* 각 섹션에 명시적인 수평 패딩 적용 */}
              {categories.map((cat) => (
                <TabsContent key={cat} value={cat} className="pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredIndicators
                      .filter((ind) => cat === "All" || ind.category === cat)
                      .map((indicator) => (
                        <div
                          key={indicator.key}
                          className="p-3 border rounded-md hover:bg-accent hover:border-primary cursor-pointer transition-colors group bg-card"
                          onClick={() => onSelect(indicator)}
                        >
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {indicator.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {indicator.category}
                          </p>
                        </div>
                      ))}
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
