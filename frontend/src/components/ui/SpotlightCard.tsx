"use client";

import React, { useRef, useState } from "react";
import clsx from "clsx";

interface SpotlightCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  title,
  description,
  icon,
  className = "",
  children,
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleFocus}
      onMouseLeave={handleBlur}
      className={clsx(
        "relative overflow-hidden rounded-3xl border border-border bg-card/50 p-8 transition-colors duration-300 group",
        className
      )}
    >
      {/* Spotlight Effect Layer */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.06), transparent 40%)`,
        }}
      />
      {/* Spotlight Border */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(139, 92, 246, 0.4), transparent 40%)`,
          maskImage:
            "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          WebkitMaskImage:
            "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted border border-border text-foreground group-hover:text-violet-400 group-hover:scale-110 transition-all duration-300 shadow-lg">
          {icon}
        </div>

        {children && <div className="mb-6 flex-1 w-full">{children}</div>}

        <div>
          <h3 className="mb-2 text-xl font-semibold text-foreground group-hover:text-foreground transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-muted-foreground/80 transition-colors">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};
