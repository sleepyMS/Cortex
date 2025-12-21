// file: src/app/[locale]/page.tsx

import { HeroSection } from "@/components/domain/HeroSection";
import { FeatureSection } from "@/components/domain/FeatureSection";
import { CTASection } from "@/components/domain/CTASection";

export default function LandingPage() {
  return (
    <div className="flex flex-col relative pb-24">
      <div className="relative z-10">
        <HeroSection />
        <FeatureSection />
        <CTASection />
      </div>
    </div>
  );
}
