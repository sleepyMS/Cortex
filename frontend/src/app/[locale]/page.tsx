// file: src/app/[locale]/page.tsx

import { Header } from "@/components/layout/Header";
import { HeroSection } from "@/components/domain/HeroSection";
import { FeatureSection } from "@/components/domain/FeatureSection";
import { Footer } from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* <Header /> */}
      <HeroSection />
      <FeatureSection />
      {/* <Footer /> */}
    </main>
  );
}
