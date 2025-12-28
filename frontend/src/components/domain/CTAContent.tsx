"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { formatText } from "./ScrollFeatureShowcase/utils/formatText";

interface CTAContentProps {
  title: string;
  subtitle: string;
  buttonText: string;
}

export const CTAContent: React.FC<CTAContentProps> = ({
  title,
  subtitle,
  buttonText,
}) => {
  return (
    <div className="relative z-10">
      <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight text-foreground">
        {formatText(title, "text-violet-500")}
      </h2>
      <p className="text-muted-foreground max-w-2xl mx-auto mb-10 text-lg leading-relaxed">
        {formatText(subtitle)}
      </p>
      <Link href="/strategies/new" passHref>
        <Button
          size="lg"
          className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-md px-8 font-medium transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)]"
        >
          <span className="mr-2">{buttonText}</span>
          <span className="group-hover:translate-x-1 transition-transform">
            →
          </span>
        </Button>
      </Link>
    </div>
  );
};
