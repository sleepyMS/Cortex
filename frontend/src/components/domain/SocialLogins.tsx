"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export default function SocialLogins() {
  const t = useTranslations("Auth");

  // 각 소셜 로그인 제공자의 인증 페이지 URL. .env 파일에서 관리하는 것이 좋습니다.
  const GOOGLE_AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI}&response_type=code&scope=openid%20email%20profile`;
  console.log("Google Auth URL:", GOOGLE_AUTH_URL);
  const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI}&response_type=code`;
  const NAVER_AUTH_URL = `https://nid.naver.com/oauth2.0/authorize?client_id=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_NAVER_REDIRECT_URI}&response_type=code&state=STATE_STRING`; // state는 CSRF 방지를 위해 랜덤 문자열 생성 필요

  const handleSocialLogin = (provider: string, url: string) => {
    // 👈 1. 어떤 제공자인지 localStorage에 저장
    localStorage.setItem("social_provider", provider);
    // 2. 사용자를 해당 소셜 플랫폼의 인증 페이지로 보냄
    window.location.href = url;
  };

  return (
    <>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t("orContinueWith")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Google 로그인 버튼 */}
        <Button
          variant="outline"
          onClick={() => handleSocialLogin("google", GOOGLE_AUTH_URL)} // 👈 provider 이름 전달
        >
          <Image
            src="/images/google-icon.svg"
            alt="Google"
            width={20}
            height={20}
            className="mr-2"
          />
          Google
        </Button>

        {/* Kakao 로그인 버튼 */}
        <Button
          variant="outline"
          onClick={() => handleSocialLogin("kakao", KAKAO_AUTH_URL)} // 👈 provider 이름 전달
        >
          <Image
            src="/images/kakao-icon.svg"
            alt="Kakao"
            width={20}
            height={20}
            className="mr-2"
          />
          Kakao
        </Button>

        {/* Naver 로그인 버튼 */}
        <Button
          variant="outline"
          onClick={() => handleSocialLogin("naver", NAVER_AUTH_URL)} // 👈 provider 이름 전달
        >
          <Image
            src="/images/naver-icon.svg"
            alt="Naver"
            width={20}
            height={20}
            className="mr-2"
          />
          Naver
        </Button>
      </div>
    </>
  );
}
