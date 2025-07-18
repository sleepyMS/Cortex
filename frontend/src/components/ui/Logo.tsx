// file: frontend/src/components/ui/Logo.tsx

import * as React from "react";
import { clsx } from "clsx";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {}

const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "inline-block text-xl font-bold tracking-tighter",
          className
        )}
        {...props}
      >
        <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
          Cor
        </span>
        <span className="text-foreground">tex</span>
      </div>
    );
  }
);

Logo.displayName = "Logo";

export { Logo };
