// "use client";

// import React from "react";
// import { useTranslations } from "next-intl";
// import { LogicBlock, StrategyType, LogicOperator } from "@/types/strategy";
// import { RuleBlock } from "./RuleBlock";

// // --- 타입 정의 ---
// interface RecursiveRuleRendererProps {
//   items: LogicBlock[];
//   ruleType: StrategyType;
//   onUpdateRule: (id: string, newBlock: LogicBlock) => void;
//   onDeleteRule: (id: string) => void;
//   onTriggerNestedAddRule: (parentId: string, as: LogicOperator) => void;
//   onTriggerOperandHub: (blockId: string, operandKey: string) => void;
//   depth?: number;
// }

// export function RecursiveRuleRenderer({
//   items,
//   ruleType,
//   onUpdateRule,
//   onDeleteRule,
//   onTriggerNestedAddRule,
//   onTriggerOperandHub,
//   depth = 0,
// }: RecursiveRuleRendererProps) {
//   const t = useTranslations("StrategyBuilder");

//   return (
//     <div className="space-y-4">
//       {items.map((item, index) => (
//         <React.Fragment key={item.id}>
//           {/* 최상위 레벨(depth=0)의 규칙들 사이에 'OR' 구분선 표시 */}
//           {depth === 0 && index > 0 && (
//             <div
//               className="flex items-center justify-center"
//               aria-hidden="true"
//             >
//               <span className="px-3 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground border border-dashed">
//                 {t("orOperator")}
//               </span>
//             </div>
//           )}

//           <div className="relative">
//             <RuleBlock
//               item={item}
//               onUpdate={onUpdateRule}
//               onDelete={() => onDeleteRule(item.id)}
//               onTriggerAddRule={onTriggerNestedAddRule}
//               onTriggerOperandHub={(blockId, operandKey) =>
//                 onTriggerOperandHub(blockId, operandKey)
//               }
//             />

//             {/* 자식 규칙(AND 조건)이 있는 경우, 들여쓰기 및 재귀 렌더링 */}
//             {item.children && item.children.length > 0 && (
//               <div className="relative mt-4 pl-4 md:pl-6 border-l-2 border-primary/50">
//                 <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 z-10 px-1 bg-background">
//                   <span className="text-sm font-semibold text-primary">
//                     {t("andOperator")}
//                   </span>
//                 </div>
//                 <RecursiveRuleRenderer
//                   items={item.children}
//                   ruleType={ruleType}
//                   onUpdateRule={onUpdateRule}
//                   onDeleteRule={onDeleteRule}
//                   onTriggerNestedAddRule={onTriggerNestedAddRule}
//                   onTriggerOperandHub={onTriggerOperandHub}
//                   depth={depth + 1}
//                 />
//               </div>
//             )}
//           </div>
//         </React.Fragment>
//       ))}
//     </div>
//   );
// }
