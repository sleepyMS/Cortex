import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X } from "lucide-react";
import { ParameterPopover } from "./ParameterPopover";
import { INDICATOR_REGISTRY } from "@/lib/indicators"; // 👈 지표 레지스트리 임포트

// 예시 규칙 데이터 타입 (더 간단해짐)
export interface Rule {
  id: string;
  conditionA: {
    indicatorKey: string; // 'SMA', 'BB' 등
    values: Record<string, any>; // { period: 20 }
  };
  operator: string;
  conditionB: {
    type: "value" | "indicator";
    value: any;
  };
}

interface RuleCardProps {
  rule: Rule;
  onUpdate: (ruleId: string, updatedRule: Rule) => void;
  onDelete: (ruleId: string) => void;
}

export function RuleCard({ rule, onUpdate, onDelete }: RuleCardProps) {
  // 지표 레지스트리에서 현재 지표의 정의를 찾음
  const indicatorDef = INDICATOR_REGISTRY[rule.conditionA.indicatorKey];

  const handleParamsChange = (newValues: Record<string, any>) => {
    // onUpdate 콜백을 호출하여 상위 컴포넌트의 상태를 업데이트
    onUpdate(rule.id, {
      ...rule,
      conditionA: { ...rule.conditionA, values: newValues },
    });
  };

  return (
    <Card className="relative p-4">
      {/* ... (삭제 버튼) ... */}
      <CardContent className="flex items-center justify-between p-0">
        <ParameterPopover
          parameters={indicatorDef.parameters}
          values={rule.conditionA.values}
          onValuesChange={handleParamsChange}
        >
          <Button variant="outline" className="h-full min-w-[120px]">
            <span className="font-bold">{indicatorDef.name}</span>
          </Button>
        </ParameterPopover>
        {/* ... (비교 연산자, 조건 B) ... */}
      </CardContent>
    </Card>
  );
}
