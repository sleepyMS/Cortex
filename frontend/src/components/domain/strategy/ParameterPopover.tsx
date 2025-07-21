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
} from "@/components/ui/Select"; // 👈 Select 컴포넌트 임포트
import { IndicatorParameter } from "@/lib/indicators"; // 👈 지표 타입 임포트

interface ParameterPopoverProps {
  parameters: IndicatorParameter[];
  values: Record<string, any>; // 현재 설정된 파라미터 값들 (e.g., { period: 20 })
  onValuesChange: (newValues: Record<string, any>) => void;
  children: React.ReactNode;
}

export function ParameterPopover({
  parameters,
  values,
  onValuesChange,
  children,
}: ParameterPopoverProps) {
  const t = useTranslations("ParameterPopover");

  const handleValueChange = (paramKey: string, newValue: any) => {
    onValuesChange({ ...values, [paramKey]: newValue });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{t("title")}</h4>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div className="grid gap-4">
            {parameters.map((param) => (
              <div
                key={param.key}
                className="grid grid-cols-3 items-center gap-4"
              >
                <Label htmlFor={param.key}>{param.name}</Label>

                {/* 👇 데이터 타입에 따라 동적으로 컴포넌트를 렌더링 */}
                {param.type === "number" && (
                  <Input
                    id={param.key}
                    type="number"
                    value={values[param.key] ?? param.defaultValue}
                    onChange={(e) =>
                      handleValueChange(param.key, Number(e.target.value))
                    }
                    className="col-span-2 h-8"
                  />
                )}
                {param.type === "select" && (
                  <Select
                    value={values[param.key] ?? param.defaultValue}
                    onValueChange={(value) =>
                      handleValueChange(param.key, value)
                    }
                  >
                    <SelectTrigger className="col-span-2 h-8">
                      <SelectValue placeholder="선택..." />
                    </SelectTrigger>
                    <SelectContent>
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
