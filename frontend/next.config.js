// file: frontend/next.config.js
const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n.ts");

// CSP (Content Security Policy) 설정
// 프로덕션 배포 시 connect-src에 실제 API 도메인 추가 필요
// 예: api.yourdomain.com, wss://api.yourdomain.com
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' js.tosspayments.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: *.tosspayments.com;
  font-src 'self' data:;
  connect-src 'self' 127.0.0.1:8000 localhost:8000 ws://127.0.0.1:8000 ws://localhost:8000 api.tosspayments.com *.tosspayments.com;
  frame-src 'self' js.tosspayments.com *.tosspayments.com;
  frame-ancestors 'self';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
`;

// 보안 헤더 설정
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy.replace(/\s{2,}/g, " ").trim(),
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // 모든 라우트에 보안 헤더 적용
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
