// src/app/[locale]/page.tsx

import HeroSection from "@/components/domain/landing/HeroSection";
import ProblemSection from "@/components/domain/landing/ProblemSection";
import FeaturesSection from "@/components/domain/landing/FeaturesSection";
import CtaSection from "@/components/domain/landing/CtaSection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <CtaSection />
    </>
  );
}
