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
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { RiskManagementStep } from "./steps/RiskManagementStep";

export type WizardData = {
  strategyId: string | null;
  parameters: Record<string, any>;
  exchangeAccountId: string | null;
  initialCapital: number;
  leverage: number;
  riskSettings: {
    takeProfit: number;
    stopLoss: number;
    dailyMaxLoss: number;
  };
};

const INITIAL_DATA: WizardData = {
  strategyId: null,
  parameters: {},
  exchangeAccountId: null,
  initialCapital: 1000,
  leverage: 1,
  riskSettings: {
    takeProfit: 5.0,
    stopLoss: 2.0,
    dailyMaxLoss: 10.0,
  },
};

const STEPS = [
  { id: "strategy", title: "Strategy" },
  { id: "parameters", title: "Parameters" },
  { id: "exchange", title: "Exchange" },
  { id: "risk", title: "Risk" },
  { id: "review", title: "Review" },
];

export function BotWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  // const t = useTranslations("BotWizard");

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
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
        return !!data.strategyId;
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
        steps={STEPS}
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
          Back
        </Button>

        {currentStep === STEPS.length - 1 ? (
          <Button className="w-32" onClick={() => console.log("Submit", data)}>
            Create Bot
          </Button>
        ) : (
          <Button onClick={nextStep} disabled={!isStepValid()} className="w-24">
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
