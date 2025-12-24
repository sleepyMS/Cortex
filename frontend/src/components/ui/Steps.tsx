import * as React from "react";
import { Check, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Step {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

interface StepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  onChange?: (step: number) => void;
}

export function Steps({ steps, currentStep, className, onChange }: StepsProps) {
  return (
    <div className={cn("relative mb-8", className)}>
      <div className="flex items-center justify-between relative">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = currentStep === i;
          const isCompleted = currentStep > i;

          return (
            <React.Fragment key={i}>
              <div
                className={cn(
                  "flex flex-col items-center cursor-pointer transition-all",
                  isActive && "scale-110"
                )}
                onClick={() => isCompleted && onChange?.(i)}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative z-10",
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <Check className="h-5 w-5" />
                    </motion.div>
                  ) : Icon ? (
                    <Icon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-3 hidden sm:block transition-colors duration-300 max-w-[80px] text-center leading-tight",
                    isActive
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {s.title}
                </span>
                {s.description && (
                  <span className="text-[10px] text-muted-foreground hidden md:block mt-1 text-center">
                    {s.description}
                  </span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
