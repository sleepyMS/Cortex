"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Steps } from "@/components/ui/Steps";
import { ModeSelectionStep } from "./steps/ModeSelectionStep";
import { StrategySelectionStep } from "./steps/StrategySelectionStep";
import { ParameterConfigurationStep } from "./steps/ParameterConfigurationStep";
import { ExchangeSetupStep } from "./steps/ExchangeSetupStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { RiskManagementStep } from "./steps/RiskManagementStep";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { Loader2 } from "lucide-react";

export type WizardData = {
  mode: "live" | "paper"; // New field
  strategyId: string | null;
  selectedStrategy: any | null; // Store full strategy object
  parameters: Record<string, any>;
  exchangeAccountId: string | null;
  initialCapital: number;
  leverage: number;
  executionInterval: string; // New field
  trailingStopConfig: {
    enabled: boolean;
    activationPct: number;
    callbackPct: number;
  };
  riskSettings: {
    takeProfit: number;
    stopLoss: number;
    dailyMaxLoss: number;
    dailyMaxLossEnabled: boolean;
  };
};

const INITIAL_DATA: WizardData = {
  mode: "paper", // Default to paper trading
  strategyId: null,
  selectedStrategy: null,
  parameters: {},
  exchangeAccountId: null,
  initialCapital: 10000, // Higher default for paper trading
  leverage: 1,
  executionInterval: "1h",
  trailingStopConfig: {
    enabled: false,
    activationPct: 2.0,
    callbackPct: 1.0,
  },
  riskSettings: {
    takeProfit: 5.0,
    stopLoss: 2.0,
    dailyMaxLoss: 10.0,
    dailyMaxLossEnabled: true,
  },
};

export function BotWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const t = useTranslations("LiveTrading.Wizard");

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const steps = [
    { id: "mode", title: t("steps.mode") },
    { id: "strategy", title: t("steps.strategy") },
    { id: "parameters", title: t("steps.parameters") },
    { id: "exchange", title: t("steps.exchange") },
    { id: "risk", title: t("steps.risk") },
    { id: "review", title: t("steps.review") },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const isStepValid = () => {
    // Simple validation logic per step
    switch (currentStep) {
      case 0: // Mode
        return true;
      case 1: // Strategy
        return !!data.strategyId && !!data.selectedStrategy;
      case 2: // Parameters
        return true; // Add specific validation if needed
      case 3: // Exchange
        if (data.mode === "live") {
          return !!data.exchangeAccountId && data.initialCapital > 0;
        }
        return data.initialCapital > 0;
      case 4: // Risk
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <ModeSelectionStep data={data} updateData={updateData} />;
      case 1:
        return <StrategySelectionStep data={data} updateData={updateData} />;
      case 2:
        return (
          <ParameterConfigurationStep data={data} updateData={updateData} />
        );
      case 3:
        return <ExchangeSetupStep data={data} updateData={updateData} />;
      case 4:
        return <RiskManagementStep data={data} updateData={updateData} />;
      case 5:
        return <ReviewStep data={data} />;
      default:
        return null;
    }
  };

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateBot = async () => {
    if (!data.strategyId) return;
    if (data.mode === "live" && !data.exchangeAccountId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        mode: data.mode,
        strategyId: data.strategyId,
        apiKeyId: data.exchangeAccountId, // Can be null for paper trading
        initialCapital: data.initialCapital,
        ticker: data.selectedStrategy?.targetCoins?.[0]?.ticker || "BTCUSDT", // Fallback or select from UI if needed
        executionInterval: data.executionInterval,
        trailingStopConfig: data.trailingStopConfig.enabled
          ? data.trailingStopConfig
          : null,
      };

      const response = await apiClient.post("/live-bots/", payload);

      toast.success(t("toasts.createSuccess.title"), {
        description: t("toasts.createSuccess.description"),
      });

      // Redirect to the new bot's detail page
      router.push(`/bots/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create bot:", error);
      toast.error(t("toasts.createError.title"), {
        description: t("toasts.createError.description"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Steps
        steps={steps}
        currentStep={currentStep}
        onChange={(step: number) => {
          if (step < currentStep) {
            setCurrentStep(step);
          }
        }}
      />

      {/* Step Content */}
      <Card className="p-6 min-h-[400px]">{renderStep()}</Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="w-24"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t("buttons.back")}
        </Button>

        {currentStep === steps.length - 1 ? (
          <Button
            className="w-32"
            onClick={handleCreateBot}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t("buttons.createBot")}
          </Button>
        ) : (
          <Button onClick={nextStep} disabled={!isStepValid()} className="w-24">
            {t("buttons.next")}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
