"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Logo } from "@/components/ui/Logo";
import { Sun, Moon } from "lucide-react";
import LanguageSwitcher from "@/components/domain/LanguageSwitcher";

const Header = () => {
  const t = useTranslations("Header");
  const [theme, setTheme] = React.useState("dark");

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" passHref>
            <Logo />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          <IconButton onClick={toggleTheme} aria-label="테마 전환">
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </IconButton>

          <div className="hidden sm:flex items-center gap-2">
            <Link href="/login" passHref>
              <Button variant="ghost">{t("login")}</Button>
            </Link>
            <Button>{t("startFree")}</Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export { Header };
