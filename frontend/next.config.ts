// next.config.ts

import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 기존 옵션 추가 가능 */
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
