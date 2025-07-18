// src/components/domain/landing/ProblemSection.tsx

export default function ProblemSection() {
  return (
    <section className="w-full py-20 lg:py-28 bg-gray-50">
      <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm">
            투자의 딜레마
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            왜 당신의 투자는 항상 불안할까요?
          </h2>
          <p className="text-gray-500 text-lg">
            시장의 소음, 복잡한 데이터, 그리고 한순간의 감정. 성공적인 투자를
            방해하는 요소는 너무나도 많습니다. Cortex는 이러한 불확실성을
            제거하고 데이터 기반의 명확한 길을 제시합니다.
          </p>
        </div>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 text-red-700 rounded-full h-8 w-8 flex items-center justify-center font-bold">
              ✕
            </div>
            <div>
              <h3 className="font-semibold">감정적 매매</h3>
              <p className="text-gray-500">
                공포와 탐욕에 휘둘려 잘못된 타이밍에 매수/매도 결정을 내립니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-red-100 text-red-700 rounded-full h-8 w-8 flex items-center justify-center font-bold">
              ✕
            </div>
            <div>
              <h3 className="font-semibold">끝없는 분석 시간</h3>
              <p className="text-gray-500">
                수많은 정보 속에서 유의미한 신호를 찾기 위해 소중한 시간을
                낭비합니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-red-100 text-red-700 rounded-full h-8 w-8 flex items-center justify-center font-bold">
              ✕
            </div>
            <div>
              <h3 className="font-semibold">검증되지 않은 전략</h3>
              <p className="text-gray-500">
                '카더라' 통신에 의존하여, 실제로는 동작하지 않는 전략에 자산을
                투입합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
