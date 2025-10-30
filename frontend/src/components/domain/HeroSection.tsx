// file: frontend/src/components/domain/HeroSection.tsx

import { getTranslations } from "next-intl/server"; // 2. 서버용 getTranslations 임포트
import React from "react";
// 3. 클라이언트 컴포넌트 임포트
import { HeroBackground } from "./HeroBackground";
import { HeroContent } from "./HeroContent";

// 4. async 함수로 변경
const HeroSection = async () => {
  // 5. 서버에서 직접 번역 텍스트를 가져옴
  const t = await getTranslations("Landing.Hero");

  const titleWithBreaks = t.rich("title", {
    br: () => <br />,
  });
  const subtitle = t("subtitle");
  const ctaButton = t("ctaButton");

  return (
    <section className="relative w-full overflow-hidden">
      {/* 6. 클라이언트 컴포넌트로 분리된 배경 */}
      <HeroBackground />

      {/* 7. 텍스트를 props로 받는 클라이언트 컴포넌트 */}
      <HeroContent
        title={titleWithBreaks}
        subtitle={subtitle}
        ctaButton={ctaButton}
      />
    </section>
  );
};

export { HeroSection };
