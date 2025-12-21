// file: frontend/src/components/domain/CTASection.tsx

import { getTranslations } from "next-intl/server";
import React from "react";
import { CTAContent } from "./CTAContent";

const CTASection = async () => {
  const t = await getTranslations("Landing.CTA");

  return (
    <section className="relative py-32 px-6 md:px-12 max-w-7xl mx-auto text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/50 pointer-events-none" />
      <CTAContent
        title={t("title")}
        subtitle={t("subtitle")}
        buttonText={t("button")}
      />
    </section>
  );
};

export { CTASection };
