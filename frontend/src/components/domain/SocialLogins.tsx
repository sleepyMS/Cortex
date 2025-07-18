// file: frontend/src/components/domain/SocialLogins.tsx

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
// TODO: 각 소셜 플랫폼에 맞는 아이콘을 import 하세요.
// import { GoogleIcon, KakaoIcon, NaverIcon } from "@/components/icons";

export default function SocialLogins() {
  const t = useTranslations("Auth");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t("socialLoginDivider")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {/* Google Login Button */}
        <Button variant="outline" className="w-full gap-2" asChild>
          <a href={`${apiUrl}/auth/google/login`}>
            {/* <GoogleIcon /> */}
            {t("googleLogin")}
          </a>
        </Button>

        {/* Kakao Login Button (Placeholder) */}
        <Button variant="outline" className="w-full gap-2" asChild>
          <a href="#">
            {" "}
            {/* TODO: 카카오 로그인 URL 추가 */}
            {/* <KakaoIcon /> */}
            {t("kakaoLogin")}
          </a>
        </Button>

        {/* Naver Login Button (Placeholder) */}
        <Button variant="outline" className="w-full gap-2" asChild>
          <a href="#">
            {" "}
            {/* TODO: 네이버 로그인 URL 추가 */}
            {/* <NaverIcon /> */}
            {t("naverLogin")}
          </a>
        </Button>
      </div>
    </>
  );
}
