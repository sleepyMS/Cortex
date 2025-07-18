// src/components/domain/landing/HeroSection.tsx

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export default function HeroSection() {
  const t = useTranslations("HeroSection");

  return (
    <section className="w-full py-20 lg:py-32">
      <div className="container mx-auto text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 text-lg text-gray-600">{t("subtitle")}</p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {/* Button 컴포넌트를 사용하되, asChild prop을 추가합니다. */}
            <Button asChild size="lg">
              <Link href="/signup">{t("ctaButton")}</Link>
            </Button>
            {/* '더 알아보기'는 링크 스타일의 버튼으로 변경합니다. */}
            <Button asChild variant="link">
              <Link href="/features">
                {t("learnMore")} <span aria-hidden="true">→</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
