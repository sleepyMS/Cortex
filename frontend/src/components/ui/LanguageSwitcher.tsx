// frontend/components/ui/LanguageSwitcher.tsx

"use client"; // 클라이언트 컴포넌트로 지정 (훅 사용을 위해)

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale(); // 현재 언어 코드를 가져옵니다 (e.g., 'ko' 또는 'en')
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    // URL의 언어 코드 부분만 변경하여 페이지를 새로고침합니다.
    startTransition(() => {
      router.replace(`/${nextLocale}`);
    });
  };

  return (
    <select
      defaultValue={locale}
      onChange={handleLanguageChange}
      disabled={isPending}
      className="p-2 border rounded bg-gray-100 dark:bg-gray-800"
    >
      <option value="ko">🇰🇷 한국어</option>
      <option value="en">🇺🇸 English</option>
    </select>
  );
}
