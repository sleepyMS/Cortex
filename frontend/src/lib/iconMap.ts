import {
  LucideProps,
  HelpCircle,
  Zap,
  Gift,
  Tag,
  TestTubeDiagonal,
  // ... ICON_MAP에 추가하고 싶은 다른 아이콘들을 여기에 import 합니다.
} from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

// 1. ICON_MAP: 아이콘 이름(문자열)과 실제 아이콘 컴포넌트를 매핑하는 객체입니다.
// as const를 붙여 TypeScript가 각 키를 일반 string이 아닌 리터럴 타입으로 추론하게 합니다.
export const ICON_MAP = {
  HelpCircle,
  Zap,
  Gift,
  Tag,
  TestTubeDiagonal,
  // ... 여기에 import한 아이콘 컴포넌트를 추가합니다.
} as const;

// 2. LucideIconName: ICON_MAP 객체의 키들로만 이루어진 타입을 동적으로 생성합니다.
// 이것이 "그냥 string이 아닌, ICON_MAP에 존재하는 키 중 하나"라는 것을 보장하는 핵심입니다.
export type LucideIconName = keyof typeof ICON_MAP;

// 3. (선택사항) 아이콘 컴포넌트의 공통 타입을 정의해두면 유용합니다.
export type IconComponent = ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
>;
