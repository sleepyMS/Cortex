"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description?: string;
}

interface StepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  onChange?: (step: number) => void;
}

export function Steps({ steps, currentStep, className, onChange }: StepsProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-10" />
      <div
        className="absolute top-4 left-0 h-0.5 bg-primary -z-10 transition-all duration-300 ease-in-out"
        style={{
          width: `${(currentStep / (steps.length - 1)) * 100}%`,
        }}
      />
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onChange && index <= currentStep;

          return (
            <div
              key={step.title}
              className={cn(
                "flex flex-col items-center gap-2 bg-background px-2",
                isClickable && "cursor-pointer"
              )}
              onClick={() => isClickable && onChange(index)}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                  isCompleted || isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground text-muted-foreground bg-background"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <div className="flex flex-col items-center text-center">
                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="text-[10px] text-muted-foreground hidden md:block">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
