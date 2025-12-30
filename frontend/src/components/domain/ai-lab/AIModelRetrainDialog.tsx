import React, { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";
import {
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Loader2,
  Tag,
  Percent,
  Ticket,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { DateRangePickerCustom } from "@/components/ui/DateRangePickerCustom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { retrainModel, estimateAIModelCost } from "@/lib/api/ai";
import { CostEstimationResponse, AIModelType } from "@/types/ai";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface AIModelRetrainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: string;
  taskType?: AIModelType;
  initialStartDate?: string;
  initialEndDate?: string;
  onSuccess?: () => void;
}

export const AIModelRetrainDialog: React.FC<AIModelRetrainDialogProps> = ({
  open,
  onOpenChange,
  modelId,
  taskType,
  initialStartDate,
  initialEndDate,
  onSuccess,
}) => {
  const t = useTranslations("AILabPage");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialStartDate ? new Date(initialStartDate) : undefined,
    to: initialEndDate ? new Date(initialEndDate) : undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [costData, setCostData] = useState<CostEstimationResponse | null>(null);
  const [isCheckingCost, setIsCheckingCost] = useState(false);
  const syncCreditBalance = useUserStore((state) => state.syncCreditBalance);

  React.useEffect(() => {
    if (open && modelId && dateRange?.from && dateRange?.to) {
      const fetchCost = async () => {
        setIsCheckingCost(true);
        try {
          const res = await estimateAIModelCost({
            trainingType: "retrain",
            startDate: dateRange.from?.toISOString(),
            endDate: dateRange.to?.toISOString(),
            modelId: modelId,
          });
          setCostData(res);
        } catch (e) {
          console.error(e);
        } finally {
          setIsCheckingCost(false);
        }
      };

      // Debounce slightly to avoid rapid calls while picking date
      const timer = setTimeout(fetchCost, 500);
      return () => clearTimeout(timer);
    }
  }, [open, modelId, dateRange?.from, dateRange?.to]);

  const handleRetrain = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error(t("detail.retrainDialog.selectPeriodError"));
      return;
    }

    if (dateRange.from && dateRange.to) {
      if (dateRange.to <= dateRange.from) {
        toast.error(t("validations.dateOrderError"));
        return;
      }
      const days = differenceInDays(dateRange.to, dateRange.from);
      if (days < 30) {
        toast.error(t("validations.durationMinError"));
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await retrainModel(modelId, {
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      // 크레딧 잔액 갱신 (백테스트와 동일한 방식)
      syncCreditBalance();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error(t("detail.retrainDialog.fail"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("detail.retrainDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("detail.retrainDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">
              {t("new.step1.taskType")}
            </span>
            <Badge
              variant="secondary"
              className={cn(
                "uppercase font-bold tracking-wider",
                (taskType || "classification") === "classification"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
              )}
            >
              {t(
                (taskType || "classification") === "classification"
                  ? "card.classificationBadge"
                  : "card.regressionBadge"
              )}
            </Badge>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {t("detail.retrainDialog.periodLabel")}
            </h4>
            <DateRangePickerCustom
              startDate={dateRange?.from}
              endDate={dateRange?.to}
              onStartDateChange={(date) =>
                setDateRange((prev) => ({ from: date, to: prev?.to }))
              }
              onEndDateChange={(date) =>
                setDateRange((prev) => ({ from: prev?.from, to: date }))
              }
              className="w-full"
            />
          </div>

          <Alert
            variant="destructive"
            className="bg-amber-500/10 text-amber-500 border-amber-500/20"
          >
            <AlertTriangle className="h-4 w-4" color="orange" />
            <AlertTitle className="text-amber-500">
              {t("detail.retrainDialog.biasWarningTitle")}
            </AlertTitle>
            <AlertDescription className="text-amber-500/90 text-xs mt-1">
              {t("detail.retrainDialog.biasWarningDesc")}
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-card/50 border border-border p-4 space-y-4">
            <h4 className="font-semibold text-sm">
              {t("detail.retrainDialog.costDetails")}
            </h4>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span>{t("detail.retrainDialog.originalCost")}</span>
                </div>
                <span>
                  {costData && !isCheckingCost
                    ? `${costData.originalCost.toLocaleString()} CC`
                    : "..."}
                </span>
              </div>

              {costData && costData.discountPct > 0 && (
                <div className="flex justify-between text-sm text-blue-400">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    <span>
                      {t("detail.retrainDialog.planDiscount", {
                        value: (costData.discountPct * 100).toFixed(0),
                      })}
                    </span>
                  </div>
                  <span>
                    -
                    {Math.ceil(
                      costData.originalCost - costData.finalCost
                    ).toLocaleString()}{" "}
                    CC
                  </span>
                </div>
              )}
            </div>

            <div className="h-px bg-border" />

            <div className="flex justify-between items-center text-violet-400">
              <div className="flex items-center gap-2 font-semibold">
                <Ticket className="h-5 w-5" />
                <span>{t("detail.retrainDialog.finalCost")}</span>
              </div>
              <span className="text-xl font-bold">
                {isCheckingCost ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  `${costData?.finalCost.toLocaleString() ?? 0} CC`
                )}
              </span>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground pt-2">
              <span>{t("detail.retrainDialog.balance")}</span>
              <span
                className={
                  costData && !costData.isSufficient
                    ? "text-red-500 font-medium"
                    : ""
                }
              >
                {costData?.userBalance.toLocaleString()} CC
              </span>
            </div>
          </div>
          {costData && !costData.isSufficient && (
            <div className="text-xs text-red-500 font-medium text-right mt-1">
              {t("detail.retrainDialog.insufficient", {
                value: costData.userBalance,
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("detail.retrainDialog.cancel")}
          </Button>
          <Button onClick={handleRetrain} disabled={isSubmitting}>
            {isSubmitting && (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("detail.retrainDialog.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
