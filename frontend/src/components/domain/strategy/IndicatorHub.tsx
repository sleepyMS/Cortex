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
import { HorizontalScrollArea } from "@/components/ui/HorizontalScrollArea"; // 👈 1. 수평 스크롤 임포트

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
      {/* 👇 2. DialogContent를 Flexbox 컨테이너로 변경 */}
      <DialogContent className="max-w-4xl h-[75vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-4 border-b">
          <DialogTitle>{t("indicatorHubTitle")}</DialogTitle>
          <DialogDescription>{t("indicatorHubDescription")}</DialogDescription>
        </DialogHeader>

        {/* 상단 고정 영역 (검색창, 필터 바) */}
        <div className="flex-shrink-0">
          <div className="px-6 my-4">
            <Input
              placeholder={t("searchIndicatorPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Tabs defaultValue="All" className="w-full">
            {/* 👇 3. TabsList를 HorizontalScrollArea로 감싸기 */}
            <HorizontalScrollArea className="px-6">
              <TabsList className="w-max">
                {categories.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </HorizontalScrollArea>

            {/* 스크롤 가능한 콘텐츠 영역 */}
            {/* 👇 4. ScrollArea가 남은 공간을 모두 채우도록 flex-grow 추가 */}
            <ScrollArea className="flex-grow mt-4 h-[calc(75vh-300px)] px-6">
              {categories.map((cat) => (
                <TabsContent key={cat} value={cat} className="pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredIndicators
                      .filter((ind) => cat === "All" || ind.category === cat)
                      .map((indicator) => (
                        <div
                          key={indicator.key}
                          className="p-3 border rounded-md hover:bg-accent hover:border-primary cursor-pointer transition-colors group"
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
