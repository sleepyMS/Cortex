"use client";

import * as React from "react";
import { Circle } from "lucide-react";
import * as RadioGroupPrimitives from "@radix-ui/react-radio-group";
import { clsx } from "clsx";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitives.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitives.Root
      className={clsx("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitives.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitives.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitives.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitives.Item
      ref={ref}
      className={clsx(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitives.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitives.Indicator>
    </RadioGroupPrimitives.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitives.Item.displayName;

export { RadioGroup, RadioGroupItem };
