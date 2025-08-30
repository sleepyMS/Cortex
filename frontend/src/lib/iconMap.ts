// frontend/src/lib/iconMap.ts
import * as LucideIcons from "lucide-react";

export const ICON_MAP = {
  TestTubeDiagonal: LucideIcons.TestTubeDiagonal,
  Tag: LucideIcons.Tag,
  Gift: LucideIcons.Gift,
  Zap: LucideIcons.Zap,
  HelpCircle: LucideIcons.HelpCircle,
} as const; // 객체를 읽기 전용 상수로 만듭니다.

export type LucideIconName = keyof typeof ICON_MAP;
