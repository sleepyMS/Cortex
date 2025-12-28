// file: frontend/src/components/layout/LegalPageLayout.tsx

"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

interface LegalPageLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdated: string;
}

/**
 * 법률 페이지(이용약관, 개인정보처리방침) 공통 레이아웃
 * - 깔끔한 타이포그래피
 * - 반응형 디자인
 * - 뒤로가기 버튼
 */
export function LegalPageLayout({
  children,
  title,
  lastUpdated,
}: LegalPageLayoutProps) {
  return (
    <div className="relative min-h-screen bg-background pb-24">
      {/* Dark glass overlay */}
      <div className="fixed inset-0 bg-background/30 backdrop-blur-sm -z-10" />
      {/* 헤더 영역 */}
      <div className="border-b border-border/40 bg-muted/30">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <Link
            href="/"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            최종 수정일: {lastUpdated}
          </p>
        </div>
      </div>

      {/* 본문 영역 */}
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {children}
        </article>
      </div>

      {/* 하단 영역 */}
      <div className="border-t border-border/40 bg-muted/30">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            문의사항이 있으시면{" "}
            <a
              href="mailto:support@cortex.com"
              className="text-primary hover:underline"
            >
              support@cortex.com
            </a>
            으로 연락해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
