// file: frontend/src/i18n/navigation.ts

import { createSharedPathnamesNavigation } from "next-intl/navigation";
// i18n/i18n.ts 파일에서 정의한 locales만 임포트합니다.
import { locales } from "./i18n"; // 같은 i18n 폴더 안에 i18n.ts가 있으므로 상대 경로로 './i18n'

// createSharedPathnamesNavigation을 사용하여 로케일 인식 라우터와 경로명을 내보냅니다.
// pathnames는 이제 직접 전달하지 않습니다. next-intl 미들웨어가 pathnames를 처리합니다.
export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation({ locales });
