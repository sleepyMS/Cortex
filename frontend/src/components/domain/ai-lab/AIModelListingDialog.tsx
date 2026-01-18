"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Store,
  Loader2,
  Brain,
  Activity,
  TrendingUp,
  Calendar,
  User,
  Coins,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Separator } from "@/components/ui/Separator";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

import {
  listAIModelOnMarketplace,
  AIModelListPayload,
  AIModelListingStatus,
} from "@/lib/api/ai";
import { AIModelDetail } from "@/types/ai";
import { format } from "date-fns";
import { useUserStore } from "@/store/userStore";

interface AIModelListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: AIModelDetail;
  existingListing?: AIModelListingStatus | null;
  onSuccess: () => void;
}

const COMMISSION_RATE = 0.1; // 10%

export const AIModelListingDialog: React.FC<AIModelListingDialogProps> = ({
  open,
  onOpenChange,
  model,
  existingListing,
  onSuccess,
}) => {
  const t = useTranslations("AILabPage");
  const queryClient = useQueryClient();
  const { user } = useUserStore();

  const [priceInput, setPriceInput] = useState<string>(
    existingListing?.price !== undefined && existingListing?.price !== null
      ? String(existingListing.price)
      : "",
  );
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToCommission, setAgreedToCommission] = useState(false);

  const isEditMode = !!existingListing?.listed;

  // Parse price for calculations
  const price = priceInput === "" ? 0 : parseInt(priceInput) || 0;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPriceInput(
        existingListing?.price !== undefined && existingListing?.price !== null
          ? String(existingListing.price)
          : "",
      );
      setAgreedToTerms(isEditMode);
      setAgreedToCommission(isEditMode);
    }
  }, [open, existingListing, isEditMode]);

  const commission = Math.floor(price * COMMISSION_RATE);
  const netEarnings = price - commission;

  const listingMutation = useMutation({
    mutationFn: (payload: AIModelListPayload) =>
      listAIModelOnMarketplace(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-model", model.id] });
      queryClient.invalidateQueries({
        queryKey: ["ai-model-listing-status", model.id],
      });
      toast.success(
        isEditMode
          ? t("detail.management.listingDialog.updateSuccess")
          : t("detail.management.listingDialog.success"),
      );
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail ||
          t("detail.management.listingDialog.error"),
      );
    },
  });

  const canSubmit =
    agreedToTerms &&
    agreedToCommission &&
    price >= 0 &&
    !listingMutation.isPending;

  const handleSubmit = () => {
    listingMutation.mutate({
      modelId: model.id,
      price,
    });
  };

  // Preview Card Component (reused in both layouts)
  const PreviewCard = () => (
    <Card className="bg-muted/30 border-dashed h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {t("detail.management.listingDialog.previewTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold block">{model.name}</span>
              <span className="text-xs text-muted-foreground">
                {user?.username || "Unknown"}
              </span>
            </div>
          </div>
          <Badge variant="outline" className="uppercase text-xs">
            {model.modelType}
          </Badge>
        </div>

        <Separator />

        {/* Model Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4 text-violet-500" />
              <span>{model.taskType === "regression" ? "RMSE" : "정확도"}</span>
            </div>
            <span className="font-medium">
              {(() => {
                const metrics = model.trainingMetrics as
                  | Record<string, unknown>
                  | undefined;
                if (model.taskType === "regression") {
                  // 회귀 모델: RMSE 또는 방향 정확도 (snake_case/camelCase 둘 다 체크)
                  const rmse = metrics?.rmse ?? metrics?.["rmse"];
                  const da =
                    metrics?.directionalAccuracy ??
                    metrics?.directional_accuracy;
                  if (rmse !== undefined) return (rmse as number).toFixed(4);
                  if (da !== undefined)
                    return `${((da as number) * 100).toFixed(1)}% (방향)`;
                  return "N/A";
                } else {
                  // 분류 모델: 정확도
                  const acc = metrics?.accuracy;
                  if (acc !== undefined)
                    return `${((acc as number) * 100).toFixed(1)}%`;
                  return "N/A";
                }
              })()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>심볼</span>
            </div>
            <span className="font-medium">{model.trainingSymbol}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>학습 기간</span>
            </div>
            <span className="font-medium">
              {format(new Date(model.trainingStartDate), "yy.MM.dd")} -{" "}
              {format(new Date(model.trainingEndDate), "yy.MM.dd")}
            </span>
          </div>
        </div>

        {/* Price Preview */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">판매가</span>
            <span className="text-lg font-bold text-emerald-500">
              {price === 0 ? "무료" : `${price.toLocaleString()} CC`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-emerald-500" />
            {isEditMode
              ? t("detail.management.listingDialog.editTitle")
              : t("detail.management.listingDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("detail.management.listingDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto overscroll-contain">
          {/* 2-Column Layout for Desktop, 1-Column for Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Panel: Preview (Hidden on mobile, shown first on desktop) */}
            <div className="hidden md:block md:col-span-5">
              <PreviewCard />
            </div>

            {/* Right Panel: Form */}
            <div className="space-y-5 md:col-span-7">
              {/* Mobile Preview (Collapsed Card) */}
              <div className="md:hidden">
                <PreviewCard />
              </div>

              {/* Price Input */}
              <div className="space-y-2">
                <Label htmlFor="price">
                  {t("detail.management.listingDialog.priceLabel")}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={priceInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow empty or valid positive numbers
                      if (val === "" || /^\d+$/.test(val)) {
                        setPriceInput(val);
                      }
                    }}
                    className="pl-10 pr-12"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    CC
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("detail.management.listingDialog.priceHint")}
                </p>
              </div>

              <Separator />

              {/* Commission Breakdown */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  {t("detail.management.listingDialog.revenueTitle")}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {t("detail.management.listingDialog.salePrice")}
                    </span>
                    <span className="text-foreground font-medium">
                      {price.toLocaleString()} CC
                    </span>
                  </div>
                  <div className="flex justify-between text-red-400">
                    <span>
                      {t("detail.management.listingDialog.platformFee")}
                    </span>
                    <span>-{commission.toLocaleString()} CC</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-emerald-500">
                    <span>
                      {t("detail.management.listingDialog.expectedRevenue")}
                    </span>
                    <span className="text-lg">
                      {netEarnings.toLocaleString()} CC
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
                  />
                  <Label
                    htmlFor="terms"
                    className="text-sm font-normal leading-relaxed cursor-pointer"
                  >
                    {t("detail.management.listingDialog.termsAgreement")}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="commission"
                    checked={agreedToCommission}
                    onCheckedChange={(checked) =>
                      setAgreedToCommission(!!checked)
                    }
                  />
                  <Label
                    htmlFor="commission"
                    className="text-sm font-normal leading-relaxed cursor-pointer"
                  >
                    {t("detail.management.listingDialog.commissionAgreement")}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                </div>
              </div>

              {!canSubmit && !agreedToTerms && !agreedToCommission && (
                <Alert
                  variant="default"
                  className="bg-amber-500/10 border-amber-500/20"
                >
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-600 text-xs">
                    모든 약관에 동의해야 등록할 수 있습니다.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={listingMutation.isPending}
          >
            {t("detail.management.listingDialog.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {listingMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {isEditMode
              ? t("detail.management.listingDialog.submitEdit")
              : t("detail.management.listingDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
