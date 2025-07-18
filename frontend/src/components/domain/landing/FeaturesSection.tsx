// src/components/domain/landing/FeaturesSection.tsx
import { Zap, BarChart3, Bot } from "lucide-react"; // 아이콘 가져오기

const features = [
  {
    name: "고도화된 백테스팅",
    description:
      "수수료, 슬리피지까지 고려한 현실적인 시뮬레이션으로 전략의 과거 성과를 정밀하게 분석하세요.",
    icon: BarChart3,
  },
  {
    name: "비주얼 전략 빌더",
    description:
      "코딩 없이, 아이디어를 현실로. 직관적인 UI를 통해 자신만의 투자 전략을 손쉽게 구축할 수 있습니다.",
    icon: Zap,
  },
  {
    name: "24/7 자동매매",
    description:
      "검증된 전략을 실제 시장에서 24시간 자동으로 실행하여, 잠자는 동안에도 수익의 기회를 놓치지 마세요.",
    icon: Bot,
  },
];

export default function FeaturesSection() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <p className="text-base font-semibold leading-7 text-indigo-600">
            당신의 투자를 위한 모든 것
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            투자의 모든 과정을 하나의 플랫폼에서
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            아이디어 구상부터 검증, 그리고 실전 투자까지. Cortex는 성공적인
            투자를 위한 필수 도구를 제공합니다.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <feature.icon
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
