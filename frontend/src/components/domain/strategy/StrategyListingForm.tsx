// file: frontend/src/components/domain/strategy/StrategyListingForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Strategy } from "@/types/strategy";

// UI 컴포넌트
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Checkbox } from "@/components/ui/Checkbox";
import { Separator } from "@/components/ui/Separator";
import { Spinner } from "@/components/ui/Spinner";

// --- 설정값 (향후 백엔드에서 받아오거나 환경 변수로 관리 가능) ---

// 백엔드와 협의된 카테고리 목록
const STRATEGY_CATEGORIES = [
  "Scalping",
  "Swing",
  "TrendFollowing",
  "Grid",
  "Arbitrage",
];
// 플랫폼 수수료 (%)
const PLATFORM_FEE_PERCENT = 15;

// --- Zod 스키마를 사용한 폼 유효성 검사 ---
const listingFormSchema = z.object({
  price: z.coerce
    .number({ invalid_type_error: "가격을 숫자로 입력해주세요." })
    .min(0, "가격은 0 이상이어야 합니다.")
    .multipleOf(0.01, "가격은 소수점 둘째 자리까지만 입력 가능합니다."),
  category: z
    .string({ required_error: "카테고리를 선택해주세요." })
    .min(1, "카테고리를 선택해주세요."),
  positionType: z.enum(["LongOnly", "ShortOnly", "LongShort"], {
    required_error: "포지션 타입을 선택해주세요.",
  }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "판매 약관에 동의해야 합니다.",
  }),
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

interface StrategyListingFormProps {
  strategy: Strategy;
  onSubmit: (values: ListingFormValues) => void;
  isSubmitting: boolean;
}

export const StrategyListingForm = ({
  strategy,
  onSubmit,
  isSubmitting,
}: StrategyListingFormProps) => {
  const t = useTranslations("StrategyListingForm");

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    mode: "onChange",
    defaultValues: {
      price: strategy.marketplaceListing?.price || 10.0,
      category: strategy.marketplaceListing?.category || "",
      positionType: strategy.marketplaceListing?.positionType || "LongShort",
      termsAccepted: false,
    },
  });

  // 가격 필드의 값을 실시간으로 감지하여 수수료 계산
  const price = useWatch({
    control: form.control,
    name: "price",
  });

  const platformFee = (price * PLATFORM_FEE_PERCENT) / 100;
  const estimatedEarnings = price - platformFee;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* 가격 및 카테고리 (가로 2열 배치) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField
            control={form.control}
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
                <FormDescription>{t("priceDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("categoryLabel")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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
                <FormDescription>{t("categoryDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 포지션 타입 */}
        <FormField
          control={form.control}
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
                  className="flex flex-col sm:flex-row sm:gap-4"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="LongOnly" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("positionTypeLongOnly")}
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="ShortOnly" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("positionTypeShortOnly")}
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
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

        {/* 수수료 및 예상 수령액 정보 */}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("platformFee", { fee: PLATFORM_FEE_PERCENT })}
            </span>
            <span>- ${platformFee.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span className="text-foreground">{t("estimatedEarnings")}</span>
            <span className="text-primary">
              ${estimatedEarnings.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 판매 약관 동의 */}
        <FormField
          control={form.control}
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
          {strategy.marketplaceListing
            ? t("updateButton")
            : t("registerButton")}
        </Button>
      </form>
    </Form>
  );
};
