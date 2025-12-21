// file: src/app/[locale]/page.tsx

import { HeroSection } from "@/components/domain/HeroSection";
import { FeatureSection } from "@/components/domain/FeatureSection";
import { CTASection } from "@/components/domain/CTASection";

export default function LandingPage() {
  return (
    <div className="flex flex-col relative">
      {/* Background Grid & Ambient Light - shared across sections */}
      <div className="fixed inset-0 z-0 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-1/2 -translate-x-1/2 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,rgba(139,92,246,0.15),transparent)]"></div>
        <div className="absolute top-0 right-0 z-[-1] h-screen w-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.15),rgba(255,255,255,0))]"></div>
      </div>

      <div className="relative z-10">
        <HeroSection />
        <FeatureSection />
        <CTASection />
      </div>
    </div>
  );
}
