"use client";

import { useDraggable } from "@dnd-kit/core";
import { INDICATOR_REGISTRY, IndicatorDefinition } from "@/lib/indicators";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useMemo, useState } from "react";
import { clsx } from "clsx";

// isDragging prop을 추가하여 DragOverlay에서 렌더링될 때 스타일을 다르게 적용
export function IndicatorItem({
  indicator,
  isDragging,
}: {
  indicator: IndicatorDefinition;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: indicator.key,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <div
        className={clsx(
          "p-2 border rounded-md hover:bg-accent cursor-grab",
          // isDragging이 true이면 DragOverlay에서 렌더링 중이므로 그림자 효과
          isDragging && "shadow-lg bg-background"
          // isDragging이 undefined(즉, 원본 아이템)이고, DndContext의 active 상태이면 투명하게
          // 이 로직은 useDraggable의 isDragging 상태를 활용하여 더 간단하게 처리할 수 있습니다.
        )}
      >
        <p className="font-semibold">{indicator.name}</p>
        <p className="text-xs text-muted-foreground">{indicator.category}</p>
      </div>
    </div>
  );
}

export function IndicatorLibrary() {
  const [searchTerm, setSearchTerm] = useState("");

  // 검색어에 따라 필터링된 지표 목록
  const filteredIndicators = useMemo(() => {
    if (!searchTerm) {
      return Object.values(INDICATOR_REGISTRY);
    }
    return Object.values(INDICATOR_REGISTRY).filter((indicator) =>
      indicator.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // 카테고리별로 지표 그룹화
  const indicatorsByCategory = useMemo(() => {
    return filteredIndicators.reduce((acc, indicator) => {
      const category = indicator.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(indicator);
      return acc;
    }, {} as Record<string, IndicatorDefinition[]>);
  }, [filteredIndicators]);

  const categories = Object.keys(indicatorsByCategory);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>지표 라이브러리</CardTitle>
        <Input
          placeholder="지표 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto max-h-[600px]">
        {categories.map((category) => (
          <div key={category}>
            <h3 className="font-semibold mb-2">{category}</h3>
            <div className="grid grid-cols-1 gap-2">
              {indicatorsByCategory[category].map((indicator) => (
                <IndicatorItem key={indicator.key} indicator={indicator} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
