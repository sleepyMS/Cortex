// file: frontend/src/components/ui/Logo.tsx

import * as React from "react";
import Image from "next/image";
import { clsx } from "clsx";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {}

const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx("flex items-center gap-2.5", className)}
        {...props}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.svg"
          alt="Cortex Logo"
          width={24}
          height={24}
          className="h-6 w-auto transform transition-transform group-hover:scale-110"
        />
        <div className="text-xl font-bold tracking-tighter">
          <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
            Cor
          </span>
          <span className="text-foreground">tex</span>
        </div>
      </div>
    );
  }
);

Logo.displayName = "Logo";

export { Logo };
