// src/components/layout/Header.tsx

import { useTranslations } from "next-intl";
import LanguageSwitcher from "../ui/LanguageSwitcher"; // 방금 만든 컴포넌트 import

export default function Header() {
  const t = useTranslations("Header");

  return (
    <header className="p-4 border-b">
      <nav className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-4">
          <a href="/backtester">{t("backtester")}</a>
          {/* 언어 전환 스위치 추가 */}
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
