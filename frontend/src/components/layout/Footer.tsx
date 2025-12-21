"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Twitter, Github, Linkedin } from "lucide-react";
import { useTranslations } from "next-intl";

const Footer = () => {
  const t = useTranslations("Footer");
  const currentYear = new Date().getFullYear();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // 전략 편집 페이지에서는 푸터를 숨김
  // 전략 편집 또는 생성 페이지에서는 푸터를 숨김
  const isStrategyMode =
    pathname.includes("/strategies") &&
    (searchParams.has("edit") || searchParams.get("create") === "true");

  if (isStrategyMode) {
    return null;
  }

  return (
    <footer className="w-full border-t border-border/40 bg-background relative z-50 py-8 px-6 md:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        {/* Brand Column */}
        <div className="flex flex-col gap-4 col-span-1 md:col-span-1">
          <Link href="/" aria-label="Cortex Home">
            <Logo />
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed mb-2">
            {t("description")}
          </p>
          <div className="flex gap-4">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Twitter size={16} />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Linkedin size={16} />
            </a>
            <a
              href="https://github.com/sleepyMS?tab=overview&from=2025-12-01&to=2025-12-21"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Github size={16} />
            </a>
          </div>
        </div>

        {/* Platform Column */}
        <div className="flex flex-col gap-6">
          <h4 className="font-bold text-foreground">{t("Platform.title")}</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                {t("Platform.visualEditor")}
              </Link>
            </li>
            <li>
              <Link
                href="/backtester"
                className="hover:text-primary transition-colors"
              >
                {t("Platform.backtestingEngine")}
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                {t("Platform.paperTrading")}
              </Link>
            </li>
            <li>
              <Link
                href="/optimization"
                className="hover:text-primary transition-colors"
              >
                {t("Platform.aiOptimization")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Resources Column */}
        <div>
          <h4 className="font-bold text-foreground mb-6">
            {t("Resources.title")}
          </h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                {t("Resources.documentation")}
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                {t("Resources.apiReference")}
              </Link>
            </li>
            <li>
              <Link
                href="/strategies"
                className="hover:text-primary transition-colors"
              >
                {t("Resources.communityStrategies")}
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                {t("Resources.blog")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Company Column */}
        <div>
          <h4 className="font-bold text-foreground mb-6">
            {t("Company.title")}
          </h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                {t("Company.aboutUs")}
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                {t("Company.careers")}
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                {t("Company.legal")}
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                {t("Company.contact")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-muted-foreground text-xs">
          &copy; {currentYear} Cortex. {t("rights")}
        </div>
        <div className="flex gap-6">
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            {t("privacyPolicy")}
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            {t("termsOfService")}
          </Link>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
