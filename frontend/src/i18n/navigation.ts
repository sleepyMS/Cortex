// file: frontend/src/i18n/navigation.ts

import { createSharedPathnamesNavigation } from "next-intl/navigation";
import { locales } from "../../i18n";

// pathnames는 이제 직접 전달하지 않습니다. next-intl 미들웨어가 pathnames를 처리합니다.
export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation({ locales });
