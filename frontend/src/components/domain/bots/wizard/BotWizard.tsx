"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Steps } from "@/components/ui/Steps";
import { StrategySelectionStep } from "./steps/StrategySelectionStep";
import { ParameterConfigurationStep } from "./steps/ParameterConfigurationStep";
import { ExchangeSetupStep } from "./steps/ExchangeSetupStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { RiskManagementStep } from "./steps/RiskManagementStep";

export type WizardData = {
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
  };
};

const INITIAL_DATA: WizardData = {
  strategyId: null,
  selectedStrategy: null,
  parameters: {},
  exchangeAccountId: null,
  initialCapital: 1000,
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
    { id: "strategy", title: t("steps.strategy") },
    { id: "review", title: t("steps.parameters") }, // Renamed to Review/Parameters
    { id: "exchange", title: t("steps.exchange") },
    { id: "risk", title: t("steps.risk") },
    { id: "final", title: t("steps.review") }, // Final Review
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
      case 0: // Strategy
        return !!data.strategyId && !!data.selectedStrategy;
      case 1: // Parameters
        return true; // Add specific validation if needed
      case 2: // Exchange
        return !!data.exchangeAccountId && data.initialCapital > 0;
      case 3: // Risk
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StrategySelectionStep data={data} updateData={updateData} />;
      case 1:
        return (
          <ParameterConfigurationStep data={data} updateData={updateData} />
        );
      case 2:
        return <ExchangeSetupStep data={data} updateData={updateData} />;
      case 3:
        return <RiskManagementStep data={data} updateData={updateData} />;
      case 4:
        return <ReviewStep data={data} />;
      default:
        return null;
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
          <Button className="w-32" onClick={() => console.log("Submit", data)}>
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
