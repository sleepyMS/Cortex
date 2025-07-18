"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import React from "react";

const HeroSection = () => {
  const t = useTranslations("Landing.Hero");

  const titleWithBreaks = t.rich("title", {
    br: () => <br />,
  });

  return (
    <section className="relative w-full overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(139,92,246,0.2),rgba(255,255,255,0))]"></div>
        <div className="absolute bottom-[-40%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(139,92,246,0.15),rgba(255,255,255,0))]"></div>
      </div>

      <div className="container relative mx-auto flex min-h-[calc(100vh-80px)] max-w-4xl flex-col items-center justify-center gap-6 px-4 py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
            {titleWithBreaks}
          </span>
        </h1>

        <p className="max-w-[700px] text-lg text-muted-foreground md:text-xl">
          {t("subtitle")}
        </p>

        <Link href="/signup" passHref>
          <Button size="lg" className="mt-4">
            {t("ctaButton")}
          </Button>
        </Link>
      </div>
    </section>
  );
};

export { HeroSection };
