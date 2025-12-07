// file: frontend/src/components/auth/SocialLogins.tsx

"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useSearchParams } from "next/navigation";

export default function SocialLogins() {
  const t = useTranslations("Auth");
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get("redirect");

  const state =
    redirectUrl && redirectUrl.startsWith("/") ? redirectUrl : "/dashboard";

  // 5. 각 URL에 동적으로 생성된 state 값을 삽입합니다.
  const GOOGLE_AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  }&redirect_uri=${
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  }&response_type=code&scope=openid%20email%20profile&state=${encodeURIComponent(
    state
  )}`;
  const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID
  }&redirect_uri=${
    process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI
  }&response_type=code&state=${encodeURIComponent(state)}`;
  const NAVER_AUTH_URL = `https://nid.naver.com/oauth2.0/authorize?client_id=${
    process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
  }&redirect_uri=${
    process.env.NEXT_PUBLIC_NAVER_REDIRECT_URI
  }&response_type=code&state=${encodeURIComponent(state)}`;

  const handleSocialLogin = (provider: string, url: string) => {
    localStorage.setItem("social_provider", provider);
    window.location.href = url;
  };

  return (
    <>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 text-muted-foreground">
            {t("socialLoginDivider")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Button
          variant="outline"
          onClick={() => handleSocialLogin("google", GOOGLE_AUTH_URL)}
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

        <Button
          variant="outline"
          onClick={() => handleSocialLogin("kakao", KAKAO_AUTH_URL)}
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

        <Button
          variant="outline"
          onClick={() => handleSocialLogin("naver", NAVER_AUTH_URL)}
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
