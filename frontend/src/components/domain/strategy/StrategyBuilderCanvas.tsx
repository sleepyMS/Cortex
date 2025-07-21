"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useStrategyState,
  RuleItem,
  RuleType,
  TargetSlot,
} from "hooks/useStrategyState";
import { Button } from "@/components/ui/Button";
import { SignalBlock } from "./SignalBlock";
import { IndicatorHub } from "./IndicatorHub";
import { PlusCircle } from "lucide-react";
import { IndicatorDefinition } from "@/lib/indicators";
import { INDICATOR_REGISTRY } from "@/lib/indicators"; // SignalBlock.tsx에서 사용하기 위해 임포트

// RuleItem을 렌더링하는 재귀적인 컴포넌트
function RuleRenderer({
  item,
  ruleType,
  state,
}: {
  item: RuleItem;
  ruleType: RuleType;
  state: any;
}) {
  if (item.type === "group") {
    // ... 그룹 렌더링 로직 (향후 구현)
    return <div className="p-4 border border-dashed rounded-lg">Group</div>;
  }

  return (
    <SignalBlock
      data={item}
      onSlotClick={(condition) =>
        state.openHubWithTarget({ ruleType, blockId: item.id, condition })
      }
      onDelete={() => state.deleteItem(ruleType, item.id)}
      onUpdate={(updatedBlock) =>
        state.updateBlock(ruleType, item.id, updatedBlock)
      }
      onCloneSymmetrical={() => state.cloneSymmetrical(item)}
    />
  );
}

export function StrategyBuilderCanvas() {
  const t = useTranslations("StrategyBuilder.form");
  const strategyState = useStrategyState();

  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot>(null);

  const openHubWithTarget = (target: TargetSlot) => {
    setCurrentTarget(target);
    setIsHubOpen(true);
  };

  const handleIndicatorSelect = (indicator: IndicatorDefinition) => {
    strategyState.updateBlockCondition(currentTarget, indicator);
    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  const stateAndHandlers = { ...strategyState, openHubWithTarget };

  return (
    <>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 매수 조건 영역 */}
        <div className="space-y-4 rounded-lg bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">매수 조건</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => strategyState.addBlock("buy")}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              조건 추가
            </Button>
          </div>
          <div className="space-y-2">
            {strategyState.buyRules.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <RuleRenderer
                  item={item}
                  ruleType="buy"
                  state={stateAndHandlers}
                />
                {index < strategyState.buyRules.length - 1 && (
                  <Button variant="outline" size="sm">
                    AND
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 매도 조건 영역 */}
        <div className="space-y-4 rounded-lg bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">매도 조건</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => strategyState.addBlock("sell")}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              조건 추가
            </Button>
          </div>
          <div className="space-y-2">
            {strategyState.sellRules.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <RuleRenderer
                  item={item}
                  ruleType="sell"
                  state={stateAndHandlers}
                />
                {index < strategyState.sellRules.length - 1 && (
                  <Button variant="outline" size="sm">
                    AND
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
