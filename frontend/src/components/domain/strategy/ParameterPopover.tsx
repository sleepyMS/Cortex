// frontend/src/components/domain/strategy/ParameterPopover.tsx

import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  IndicatorParameter,
  INDICATOR_REGISTRY,
  IndicatorDefinition,
} from "@/lib/indicators"; // IndicatorDefinition 임포트 추가
import { RefreshCcw } from "lucide-react"; // RefreshCcw 아이콘 임포트

// 임시: useUserSubscription 훅이 아직 구현되지 않았으므로 Mock 데이터를 사용합니다.
// 실제 구현 단계 4에서 이 부분을 대체할 예정입니다.
// 이 부분은 이미 useUserSubscription.ts 파일로 분리되었으므로, 해당 파일에서 임포트해야 합니다.
import { useUserSubscription } from "@/hooks/useUserSubscription"; // 👈 useUserSubscription 임포트
import { Button } from "@/components/ui/Button";

interface ParameterPopoverProps {
  indicatorName: string; // 현재 지표의 이름을 표시하기 위한 prop
  indicatorKey: string; // 지표의 key (타임프레임 지원 여부 확인용)
  parameters: IndicatorParameter[];
  values: Record<string, any>; // 현재 설정된 파라미터 값들 (e.g., { period: 20 })
  currentTimeframe: string; // 현재 설정된 타임프레임 값
  onValuesChange: (newValues: Record<string, any>) => void;
  onTimeframeChange: (newTimeframe: string) => void; // 타임프레임 변경을 위한 콜백
  onIndicatorChange: () => void; // 지표 변경을 위한 콜백 함수
  children: React.ReactNode;
}

export function ParameterPopover({
  indicatorName,
  indicatorKey,
  parameters,
  values,
  currentTimeframe,
  onValuesChange,
  onTimeframeChange,
  onIndicatorChange,
  children,
}: ParameterPopoverProps) {
  const t = useTranslations("ParameterPopover");
  const { currentPlan, allowedTimeframes, isProOrTrader } =
    useUserSubscription(); // 👈 훅에서 플랜 정보 가져오기

  const handleValueChange = (paramKey: string, newValue: any) => {
    onValuesChange({ ...values, [paramKey]: newValue });
  };

  const indicatorDef: IndicatorDefinition | undefined =
    INDICATOR_REGISTRY[indicatorKey];

  // 플랜에 따라 타임프레임 선택 제한 여부 결정
  const canSelectMultipleTimeframes = isProOrTrader; // Trader 또는 Pro 플랜만 다양한 타임프레임 선택 가능

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 bg-popover border-border shadow-lg">
        {" "}
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-foreground">
              {indicatorName}{" "}
              <span className="text-muted-foreground text-sm">
                {" "}
                {t("title")}
              </span>{" "}
            </h4>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div className="grid gap-4">
            {/* 파라미터 입력 필드 */}
            {parameters.map((param) => (
              <div
                key={param.key}
                className="grid grid-cols-3 items-center gap-4"
              >
                <Label htmlFor={param.key} className="text-foreground">
                  {param.name}
                </Label>{" "}
                {param.type === "number" && (
                  <Input
                    id={param.key}
                    type="number"
                    value={values[param.key] ?? param.defaultValue}
                    onChange={(e) =>
                      handleValueChange(param.key, Number(e.target.value))
                    }
                    className="col-span-2 h-8 bg-background border-input focus-visible:ring-ring"
                  />
                )}
                {param.type === "select" && (
                  <Select
                    value={values[param.key] ?? param.defaultValue}
                    onValueChange={(value) =>
                      handleValueChange(param.key, value)
                    }
                  >
                    <SelectTrigger className="col-span-2 h-8 bg-background border-input focus:ring-ring">
                      {" "}
                      <SelectValue placeholder="선택..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {" "}
                      {param.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}

            {/* 타임프레임 선택 필드 */}
            {indicatorDef && indicatorDef.supportedTimeframes.length > 0 && (
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="timeframe" className="text-foreground">
                  {t("timeframeLabel")}
                </Label>
                {!canSelectMultipleTimeframes ? ( // Basic 플랜일 경우 제한 메시지 표시
                  <Button
                    variant="outline"
                    className="col-span-2 h-8 bg-secondary/30 text-secondary-foreground hover:bg-secondary/50 transition-colors cursor-not-allowed"
                    disabled
                  >
                    {t("upgradePlanForTimeframe")}{" "}
                  </Button>
                ) : (
                  <Select
                    value={currentTimeframe}
                    onValueChange={onTimeframeChange}
                  >
                    <SelectTrigger className="col-span-2 h-8 bg-background border-input focus:ring-ring">
                      <SelectValue placeholder="타임프레임 선택..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {/* 허용된 타임프레임만 렌더링 */}
                      {allowedTimeframes.map(
                        (
                          tf: string // 👈 tf를 string으로 명시적 타입 지정
                        ) => (
                          <SelectItem key={tf} value={tf}>
                            {tf}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full mt-4 bg-secondary/30 text-secondary-foreground hover:bg-secondary/50 transition-colors"
            onClick={onIndicatorChange}
          >
            <RefreshCcw className="h-4 w-4 mr-2" /> {t("changeIndicatorButton")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
