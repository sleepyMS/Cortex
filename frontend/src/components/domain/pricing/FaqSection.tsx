// file: src/components/domain/pricing/FaqSection.tsx

"use client";

import { useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl"; // 👈 i18n을 위해 추가

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  faqItems: FaqItem[];
}

export function FaqSection({ faqItems }: FaqSectionProps) {
  const t = useTranslations("Pricing");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-16">
      <div className="container mx-auto max-w-5xl px-4">
        <h2 className="text-3xl font-bold text-center mb-10 text-foreground">
          {t("faq.title")}
        </h2>
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="rounded-lg overflow-hidden shadow-sm dark:bg-white/5 border border-border dark:border-white/10"
            >
              {/* 질문 영역 */}
              <button
                className="w-full flex justify-between items-center p-4 text-left focus:outline-none"
                onClick={() => toggleItem(index)}
              >
                <span className="font-medium text-foreground">
                  {item.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* 답변 영역 */}
              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
