// src/components/domain/landing/CtaSection.tsx
import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="w-full py-20 lg:py-28">
      <div className="container mx-auto text-center max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          이제, 당신의 아이디어를 수익으로 바꿀 시간입니다.
        </h2>
        <p className="mt-6 text-lg text-gray-600">
          더 이상 망설이지 마세요. 지금 바로 Cortex에 가입하여 데이터 기반
          트레이딩의 세계를 경험하고, 당신의 투자 잠재력을 최대한으로
          끌어올리세요.
        </p>
        <div className="mt-10">
          <Link
            href="/signup"
            className="rounded-md bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            첫 전략 만들러 가기
          </Link>
        </div>
      </div>
    </section>
  );
}
