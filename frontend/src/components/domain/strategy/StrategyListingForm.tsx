// file: frontend/src/components/domain/strategy/StrategyListingForm.tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useFormContext, useWatch } from "react-hook-form";
import * as z from "zod";

import { Strategy } from "@/types/strategy";

// UI 컴포넌트
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Separator } from "@/components/ui/Separator";
import { Spinner } from "@/components/ui/Spinner";

// --- 설정값 ---
const STRATEGY_CATEGORIES = [
  "Scalping",
  "Swing",
  "TrendFollowing",
  "Grid",
  "Arbitrage",
];
const PLATFORM_FEE_PERCENT = 15;

// --- Zod 스키마 및 타입 (부모와 공유) ---
const listingFormSchema = z.object({
  price: z.coerce.number().min(0).multipleOf(0.01),
  category: z.string().min(1),
  representativeBacktestId: z.string().optional(),
  positionType: z.enum(["LongOnly", "ShortOnly", "LongShort"]),
  termsAccepted: z.boolean().refine((val) => val === true),
});
type ListingFormValues = z.infer<typeof listingFormSchema>;

// --- Props 타입 정의 ---
interface StrategyListingFormProps {
  // 부모로부터 form.handleSubmit(onSubmit)으로 생성된 함수를 전달받음
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
  strategy: Strategy;
}

export const StrategyListingForm = ({
  onSubmit,
  isSubmitting,
  strategy,
}: StrategyListingFormProps) => {
  const t = useTranslations("StrategyListingForm");

  // 부모의 <Form> Provider로부터 form의 control 객체를 가져옴
  const { control } = useFormContext<ListingFormValues>();

  // control 객체를 사용하여 특정 필드의 값을 실시간으로 감지
  const price = useWatch({
    control,
    name: "price",
  });

  const platformFee = (price * PLATFORM_FEE_PERCENT) / 100;
  const estimatedEarnings = price - platformFee;

  return (
    // 부모에 <Form> Provider가 있으므로, 여기서는 실제 <form> 태그만 사용
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 가격 및 카테고리 (가로 2열 배치) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("priceLabel")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 29.99"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("categoryLabel")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("categoryPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STRATEGY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 포지션 타입 */}
      <FormField
        control={control}
        name="positionType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("positionTypeLabel")}</FormLabel>
            <FormDescription className="pb-2">
              {t("positionTypeDescription")}
            </FormDescription>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-row items-center gap-x-6 gap-y-2 flex-wrap"
              >
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="LongOnly" />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {t("positionTypeLongOnly")}
                  </FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="ShortOnly" />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {t("positionTypeShortOnly")}
                  </FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="LongShort" />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {t("positionTypeLongShort")}
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      {/* 수수료 및 예상 수령액 정보 */}
      <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {t("platformFee", { fee: PLATFORM_FEE_PERCENT })}
          </span>
          <span>- {platformFee.toFixed(2)}CC</span>
        </div>
        <Separator />
        <div className="flex justify-between font-semibold">
          <span className="text-foreground">{t("estimatedEarnings")}</span>
          <span className="text-primary">{estimatedEarnings.toFixed(2)}CC</span>
        </div>
      </div>

      {/* 판매 약관 동의 */}
      <FormField
        control={control}
        name="termsAccepted"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>{t("termsLabel")}</FormLabel>
              <FormDescription>
                {t.rich("termsDescription", {
                  link: (chunks) => (
                    <Link
                      href="/terms/marketplace"
                      target="_blank"
                      className="underline hover:text-primary transition-colors"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </FormDescription>
              <FormMessage />
            </div>
          </FormItem>
        )}
      />

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
        {strategy.marketplaceListing ? t("updateButton") : t("registerButton")}
      </Button>
    </form>
  );
};
