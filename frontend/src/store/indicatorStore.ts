import { create } from "zustand";
import { IndicatorMetadata } from "@/lib/indicators"; // 기존 indicators.ts의 타입 재사용

interface IndicatorState {
  metadata: IndicatorMetadata[];
  setMetadata: (metadata: IndicatorMetadata[]) => void;
  isLoaded: boolean; // 데이터가 백엔드 원본으로 교체되었는지 여부
}

export const useIndicatorStore = create<IndicatorState>((set) => ({
  metadata: [], // 초기값은 비어있음
  setMetadata: (metadata) => set({ metadata, isLoaded: true }),
  isLoaded: false,
}));
