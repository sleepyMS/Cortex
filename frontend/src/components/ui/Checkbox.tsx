"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { clsx } from "clsx";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={clsx(
      "peer h-5 w-5 shrink-0 rounded border border-primary/50 ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      "hover:border-primary hover:bg-primary/5",
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={clsx(
        "flex items-center justify-center text-current transition-all duration-200",
        "data-[state=checked]:animate-in data-[state=checked]:fade-in data-[state=checked]:zoom-in-75",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-75"
      )}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
