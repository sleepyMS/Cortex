// frontend/src/components/domain/strategy/ParameterPopover.tsx

import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { IndicatorParameter } from "@/lib/indicators";
import { RefreshCcw } from "lucide-react"; // RefreshCcw 아이콘 임포트

interface ParameterPopoverProps {
  indicatorName: string; // 현재 지표의 이름을 표시하기 위한 prop
  parameters: IndicatorParameter[];
  values: Record<string, any>; // 현재 설정된 파라미터 값들 (e.g., { period: 20 })
  onValuesChange: (newValues: Record<string, any>) => void;
  onIndicatorChange: () => void; // 지표 변경을 위한 콜백 함수
  children: React.ReactNode;
}

export function ParameterPopover({
  indicatorName,
  parameters,
  values,
  onValuesChange,
  onIndicatorChange,
  children,
}: ParameterPopoverProps) {
  const t = useTranslations("ParameterPopover");

  const handleValueChange = (paramKey: string, newValue: any) => {
    onValuesChange({ ...values, [paramKey]: newValue });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 bg-popover border-border shadow-lg">
        {" "}
        {/* Popover 스타일 일관성 유지 */}
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
            {parameters.map((param) => (
              <div
                key={param.key}
                className="grid grid-cols-3 items-center gap-4"
              >
                <Label htmlFor={param.key} className="text-foreground">
                  {param.name}
                </Label>{" "}
                {/* Label 색상 일관성 유지 */}
                {param.type === "number" && (
                  <Input
                    id={param.key}
                    type="number"
                    value={values[param.key] ?? param.defaultValue}
                    onChange={(e) =>
                      handleValueChange(param.key, Number(e.target.value))
                    }
                    className="col-span-2 h-8 bg-background border-input focus-visible:ring-ring" // Input 스타일 일관성 유지
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
                      {/* SelectTrigger 스타일 일관성 유지 */}
                      <SelectValue placeholder="선택..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {" "}
                      {/* SelectContent 스타일 일관성 유지 */}
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
