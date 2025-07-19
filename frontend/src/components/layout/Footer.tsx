// file: frontend/src/components/layout/Footer.tsx

"use client"; // 이 컴포넌트가 클라이언트 컴포넌트임을 명시

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { IconButton } from "@/components/ui/IconButton";
import { Github, Twitter } from "lucide-react";
import { useTranslations } from "next-intl"; // getTranslations 대신 useTranslations 훅 사용

const Footer = () => {
  // async 키워드 제거
  const t = useTranslations("Footer"); // useTranslations 훅 사용
  const currentYear = new Date().getFullYear(); // 클라이언트에서 현재 연도 가져옴

  return (
    <footer className="w-full border-t border-border/40 bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <Link href="/" passHref>
              <Logo />
            </Link>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} Cortex. {t("rights")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div className="flex flex-col gap-2">
              <h4 className="font-semibold">{t("product")}</h4>
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {t("featuresLink")}
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {t("pricingLink")}
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="font-semibold">{t("legal")}</h4>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {t("termsLink")}
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {t("privacyLink")}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end border-t border-border/40 pt-4">
          <div className="flex gap-2">
            <a
              href="https://github.com/sleepyMS/Cortex"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconButton aria-label="GitHub">
                <Github className="h-5 w-5" />
              </IconButton>
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <IconButton aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </IconButton>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
