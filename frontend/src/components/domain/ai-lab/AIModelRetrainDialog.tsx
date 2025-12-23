import React, { useState } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import {
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Loader2,
  Tag,
  Percent,
  Ticket,
} from "lucide-react";

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
import { CostEstimationResponse } from "@/types/ai";

interface AIModelRetrainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: string;
  initialStartDate?: string;
  initialEndDate?: string;
  onSuccess?: () => void;
}

export const AIModelRetrainDialog: React.FC<AIModelRetrainDialogProps> = ({
  open,
  onOpenChange,
  modelId,
  initialStartDate,
  initialEndDate,
  onSuccess,
}) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialStartDate ? new Date(initialStartDate) : undefined,
    to: initialEndDate ? new Date(initialEndDate) : undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [costData, setCostData] = useState<CostEstimationResponse | null>(null);
  const [isCheckingCost, setIsCheckingCost] = useState(false);

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
      toast.error("Please select a training period.");
      return;
    }

    try {
      setIsSubmitting(true);
      await retrainModel(modelId, {
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      toast.success("Retraining started successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to start retraining.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>AI 모델 재학습 (Retrain)</DialogTitle>
          <DialogDescription>
            새로운 데이터 기간으로 모델을 재학습합니다. 새로운 버전이
            생성됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">학습 데이터 기간</h4>
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
              Look-ahead Bias 주의
            </AlertTitle>
            <AlertDescription className="text-amber-500/90 text-xs mt-1">
              재학습 기간을 최신 시점까지 확장하면, 해당 기간은 백테스팅 및
              최적화 검증 데이터로서의 신뢰성을 잃게 됩니다. (In-Sample 데이터
              오염)
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-card/50 border border-border p-4 space-y-4">
            <h4 className="font-semibold text-sm">비용 상세정보</h4>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span>정가 (Basic 기준)</span>
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
                      플랜 할인 ({(costData.discountPct * 100).toFixed(0)}%)
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
                <span>최종 필요 크레딧</span>
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
              <span>내 크레딧 잔액</span>
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
              Insufficient Credits (Balance: {costData.userBalance})
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button onClick={handleRetrain} disabled={isSubmitting}>
            {isSubmitting && (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            )}
            재학습 시작
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
