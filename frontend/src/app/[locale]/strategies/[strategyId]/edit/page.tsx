// // file: frontend/src/app/[locale]/strategies/[strategyId]/edit/page.tsx

// "use client";

// import React, { useState, useEffect, useMemo } from "react"; // React 임포트
// import { useTranslations } from "next-intl";
// import { useForm, FormProvider } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import * as z from "zod";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { useRouter } from "@/i18n/navigation";
// import { toast } from "sonner";
// import { Loader2, Save, ArrowLeft } from "lucide-react";
// import { CandlestickData, UTCTimestamp } from "lightweight-charts";

// // --- 커스텀 훅, 타입, 유틸리티 임포트 ---
// import { useStrategyState } from "@/hooks/useStrategyState";
// import { useUserSubscription } from "@/hooks/useUserSubscription";
// import { IndicatorMetadata } from "@/lib/indicators";
// import {
//   Strategy,
//   StrategyType,
//   LogicBlock,
//   TpslLogic,
//   TargetCoin,
//   PositionRules,
//   TargetSlot,
//   IndicatorValue,
//   LogicOperator,
// } from "@/types/strategy";
// import { OHLCVData, SignalData } from "@/types/market";
// import { parseRulesForIndicators, createLogicBlock } from "@/lib/strategyUtils";
// import apiClient from "@/lib/apiClient";

// // --- UI 및 도메인 컴포넌트 임포트 ---
// import { AuthGuard } from "@/components/auth/AuthGuard";
// import DynamicStrategyChart from "@/components/domain/strategy/DynamicStrategyChart";
// import { IndicatorHub } from "@/components/domain/strategy/IndicatorHub";
// import { StrategyBuilderCanvas } from "@/components/domain/strategy/StrategyBuilderCanvas";
// import { TpslForm, TpslMode } from "@/components/domain/strategy/TpslForm";
// import { TargetCoinForm } from "@/components/domain/strategy/TargetCoinForm";
// import { Button } from "@/components/ui/Button";
// import { Input } from "@/components/ui/Input";
// import { Textarea } from "@/components/ui/Textarea";
// import { Separator } from "@/components/ui/Separator";
// import { Switch } from "@/components/ui/Switch";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
//   FormDescription,
// } from "@/components/ui/Form";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from "@/components/ui/Card";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/Select";
// import { Skeleton } from "@/components/ui/Skeleton";

// // --- Zod 폼 스키마 정의 ---
// const formSchema = z.object({
//   name: z
//     .string()
//     .min(3, { message: "전략 이름은 최소 3글자 이상이어야 합니다." })
//     .max(100, { message: "전략 이름은 100자 이내여야 합니다." }),
//   description: z
//     .string()
//     .max(500, { message: "설명은 500자 이내여야 합니다." })
//     .optional()
//     .nullable(),
//   isPublic: z.boolean().default(false),
//   takeProfitPct: z.number().min(0.1).optional().nullable(),
//   stopLossPct: z.number().min(0.1).optional().nullable(),
//   atrStopLossMultiplier: z.number().min(0.1).optional().nullable(),
//   atrTakeProfitMultiplier: z.number().min(0.1).optional().nullable(),
//   atrPeriod: z.number().int().min(1).optional().nullable(),
// });
// type StrategyFormValues = z.infer<typeof formSchema>;

// // --- API 페이로드 타입 정의 ---
// interface StrategyUpdatePayload {
//   name: string;
//   description: string | null | undefined;
//   isPublic: boolean;
//   longEntryRules: PositionRules | null;
//   longExitRules: PositionRules | null;
//   shortEntryRules: PositionRules | null;
//   shortExitRules: PositionRules | null;
//   tpslLogic: TpslLogic | null;
//   targetCoins: TargetCoin[];
// }

// // --- 헬퍼 함수 ---
// const fetchOHLCVData = async (
//   ticker: string,
//   timeframe: string
// ): Promise<CandlestickData<UTCTimestamp>[]> => {
//   const { data } = await apiClient.get<OHLCVData[]>("/market/ohlcv", {
//     params: { ticker, timeframe, limit: 1000 },
//   });
//   return data.map((d) => ({ ...d, time: d.time as UTCTimestamp }));
// };
// const fetchIndicatorData = async (
//   ticker: string,
//   timeframe: string,
//   indicatorConfigs: any[]
// ) => {
//   if (indicatorConfigs.length === 0) return null;
//   const { data } = await apiClient.post("/strategies/calculate-indicators", {
//     ticker,
//     timeframe,
//     indicators: indicatorConfigs,
//   });
//   return data.results;
// };
// const fetchSignalData = async (
//   ticker: string,
//   timeframe: string,
//   rules: any
// ): Promise<SignalData> => {
//   const { data } = await apiClient.post("/strategies/calculate-signals", {
//     ticker,
//     timeframe,
//     ...rules,
//   });
//   return data;
// };

// // --- 1. 실제 폼 UI와 로직을 담당할 내부 컴포넌트 ---
// const StrategyEditForm = React.memo(function StrategyEditForm({
//   initialStrategy,
// }: {
//   initialStrategy: Strategy;
// }) {
//   const t = useTranslations("StrategyBuilder");
//   const router = useRouter();
//   const queryClient = useQueryClient();
//   const strategyId = initialStrategy.id;

//   const strategyState = useStrategyState();
//   const { setStrategy } = strategyState;
//   const { allowedTimeframes } = useUserSubscription();
//   const [tpslMode, setTpslMode] = useState<TpslMode>("percentage");
//   const [isHubOpen, setIsHubOpen] = useState(false);
//   const [currentTarget, setCurrentTarget] = useState<TargetSlot | null>(null);
//   const [hubSelectionMode, setHubSelectionMode] = useState<
//     "full" | "indicatorOnly"
//   >("full");
//   const [chartTicker, setChartTicker] = useState(
//     initialStrategy.targetCoins[0]?.ticker || "BTC/USDT"
//   );
//   const [chartTimeframe, setChartTimeframe] = useState("1h");

//   const formMethods = useForm<StrategyFormValues>({
//     resolver: zodResolver(formSchema),
//     values: {
//       name: initialStrategy.name,
//       description: initialStrategy.description,
//       isPublic: initialStrategy.isPublic,
//       takeProfitPct: initialStrategy.tpslLogic?.takeProfitPct,
//       stopLossPct: initialStrategy.tpslLogic?.stopLossPct,
//       atrStopLossMultiplier: initialStrategy.tpslLogic?.atrStopLossMultiplier,
//       atrTakeProfitMultiplier:
//         initialStrategy.tpslLogic?.atrTakeProfitMultiplier,
//       atrPeriod: initialStrategy.tpslLogic?.atrPeriod,
//     },
//   });

//   useEffect(() => {
//     setStrategy({
//       longEntryRules: initialStrategy.longEntryRules,
//       longExitRules: initialStrategy.longExitRules,
//       shortEntryRules: initialStrategy.shortEntryRules,
//       shortExitRules: initialStrategy.shortExitRules,
//       targetCoins: initialStrategy.targetCoins,
//     });
//   }, [initialStrategy, setStrategy]);

//   useEffect(() => {
//     if (
//       strategyState.targetCoins.length > 0 &&
//       strategyState.targetCoins[0].ticker !== chartTicker
//     ) {
//       setChartTicker(strategyState.targetCoins[0].ticker);
//     } else if (
//       strategyState.targetCoins.length === 0 &&
//       chartTicker !== "BTC/USDT"
//     ) {
//       setChartTicker("BTC/USDT");
//     }
//   }, [strategyState.targetCoins, chartTicker]);

//   const {
//     data: ohlcvData,
//     isLoading: isLoadingOHLCV,
//     isError,
//     error,
//   } = useQuery({
//     queryKey: ["ohlcv", chartTicker, chartTimeframe],
//     queryFn: () => fetchOHLCVData(chartTicker, chartTimeframe),
//     staleTime: 300000,
//   });

//   const indicatorConfigs = useMemo(
//     () =>
//       parseRulesForIndicators({
//         longEntry: strategyState.longEntryRules,
//         longExit: strategyState.longExitRules,
//         shortEntry: strategyState.shortEntryRules,
//         shortExit: strategyState.shortExitRules,
//       }),
//     [
//       strategyState.longEntryRules,
//       strategyState.longExitRules,
//       strategyState.shortEntryRules,
//       strategyState.shortExitRules,
//     ]
//   );

//   const { data: indicatorData, isLoading: isLoadingIndicators } = useQuery({
//     queryKey: ["indicators", chartTicker, chartTimeframe, indicatorConfigs],
//     queryFn: () =>
//       fetchIndicatorData(chartTicker, chartTimeframe, indicatorConfigs),
//     enabled: !!ohlcvData && indicatorConfigs.length > 0,
//   });

//   // ▼▼▼ [핵심 수정] useMemo로 queryKey를 안정화하여 무한 루프 해결 ▼▼▼
//   const stableRulesKey = useMemo(
//     () =>
//       JSON.stringify({
//         longEntryRules: strategyState.longEntryRules,
//         longExitRules: strategyState.longExitRules,
//         shortEntryRules: strategyState.shortEntryRules,
//         shortExitRules: strategyState.shortExitRules,
//       }),
//     [
//       strategyState.longEntryRules,
//       strategyState.longExitRules,
//       strategyState.shortEntryRules,
//       strategyState.shortExitRules,
//     ]
//   );

//   const { data: signalData, isLoading: isLoadingSignals } = useQuery({
//     queryKey: ["signals", chartTicker, chartTimeframe, stableRulesKey], // 👈 안정화된 key 사용
//     queryFn: () => {
//       return fetchSignalData(
//         chartTicker,
//         chartTimeframe,
//         JSON.parse(stableRulesKey)
//       );
//     },
//     enabled:
//       !!ohlcvData &&
//       (!!strategyState.longEntryRules || !!strategyState.shortEntryRules),
//     staleTime: Infinity, // 규칙이 바뀌기 전까지는 절대 다시 호출하지 않도록 설정
//     refetchOnWindowFocus: false, // 창에 다시 포커스해도 refetch 방지
//     refetchOnReconnect: false, // 네트워크 재연결 시 refetch 방지
//   });

//   const handleAddTopLevelRule = (ruleType: StrategyType) => {
//     setCurrentTarget({ type: "top-level", ruleType });
//     setHubSelectionMode("full");
//     setIsHubOpen(true);
//   };
//   const handleTriggerNestedAddRule = (
//     ruleType: StrategyType,
//     parentId: string,
//     as: LogicOperator
//   ) => {
//     setCurrentTarget({ type: "nested-add", ruleType, parentId, as });
//     setHubSelectionMode("full");
//     setIsHubOpen(true);
//   };
//   const handleTriggerOperandHub = (
//     ruleType: StrategyType,
//     blockId: string,
//     operandKey: string
//   ) => {
//     setCurrentTarget({ type: "operand", ruleType, blockId, operandKey });
//     setHubSelectionMode("indicatorOnly");
//     setIsHubOpen(true);
//   };
//   const handleIndicatorSelect = (
//     indicator: IndicatorMetadata,
//     logicType: string
//   ) => {
//     if (!currentTarget) return;
//     const newBlock = createLogicBlock(indicator, logicType, allowedTimeframes);
//     if (currentTarget.type === "operand") {
//       const newIndicatorValue =
//         (newBlock as any).operandA ||
//         (newBlock as any).indicator ||
//         (newBlock as any).mainLine;
//       strategyState.updateRuleLogic(
//         currentTarget.ruleType,
//         currentTarget.blockId,
//         currentTarget.operandKey,
//         newIndicatorValue
//       );
//     } else if (currentTarget.type === "top-level") {
//       strategyState.addRule(currentTarget.ruleType, newBlock, null);
//     } else if (currentTarget.type === "nested-add") {
//       strategyState.addRule(
//         currentTarget.ruleType,
//         newBlock,
//         currentTarget.parentId,
//         currentTarget.as
//       );
//     }
//     setIsHubOpen(false);
//     setCurrentTarget(null);
//   };
//   const updateStrategyMutation = useMutation({
//     mutationFn: async (values: StrategyFormValues) => {
//       let tpslLogic: TpslLogic | null = null;
//       if (
//         tpslMode === "percentage" &&
//         (values.takeProfitPct || values.stopLossPct)
//       ) {
//         tpslLogic = {
//           takeProfitPct: values.takeProfitPct || null,
//           stopLossPct: values.stopLossPct || null,
//           atrStopLossMultiplier: null,
//           atrTakeProfitMultiplier: null,
//           atrPeriod: null,
//         };
//       } else if (
//         tpslMode === "atr" &&
//         (values.atrPeriod ||
//           values.atrStopLossMultiplier ||
//           values.atrTakeProfitMultiplier)
//       ) {
//         tpslLogic = {
//           takeProfitPct: null,
//           stopLossPct: null,
//           atrStopLossMultiplier: values.atrStopLossMultiplier || null,
//           atrTakeProfitMultiplier: values.atrTakeProfitMultiplier || null,
//           atrPeriod: values.atrPeriod || null,
//         };
//       }
//       const payload: Partial<StrategyUpdatePayload> = {
//         name: values.name,
//         description: values.description,
//         isPublic: values.isPublic,
//         longEntryRules: strategyState.longEntryRules,
//         longExitRules: strategyState.longExitRules,
//         shortEntryRules: strategyState.shortEntryRules,
//         shortExitRules: strategyState.shortExitRules,
//         tpslLogic: tpslLogic,
//         targetCoins: strategyState.targetCoins,
//       };
//       const { data } = await apiClient.put(
//         `/strategies/${strategyId}`,
//         payload
//       );
//       return data;
//     },
//     onSuccess: (data: any) => {
//       toast.success(t("form.saveSuccess", { strategyName: data.name }));
//       queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
//       queryClient.invalidateQueries({ queryKey: ["strategy", strategyId] });
//       router.push("/strategies");
//     },
//     onError: (error: any) => {
//       toast.error(
//         t("form.saveError", {
//           error: error?.response?.data?.detail || "Unknown error",
//         })
//       );
//     },
//   });

//   const onSubmit = (values: StrategyFormValues) => {
//     if (!strategyState.longEntryRules && !strategyState.shortEntryRules)
//       return toast.error(t("form.rulesRequired"));
//     if (strategyState.targetCoins.length === 0)
//       return toast.error(t("targetCoinForm.noTickerError"));
//     updateStrategyMutation.mutate(values);
//   };

//   return (
//     <>
//       <IndicatorHub
//         isOpen={isHubOpen}
//         onOpenChange={setIsHubOpen}
//         onSelect={handleIndicatorSelect}
//         selectionMode={hubSelectionMode}
//       />
//       <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
//         <FormProvider {...formMethods}>
//           <form
//             onSubmit={formMethods.handleSubmit(onSubmit)}
//             className="space-y-8"
//           >
//             <div className="flex items-center justify-between gap-4">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => router.back()}
//                 disabled={updateStrategyMutation.isPending}
//               >
//                 <ArrowLeft className="mr-2 h-4 w-4" /> {t("form.goBackButton")}
//               </Button>
//               <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center">
//                 {t("editTitle")}
//               </h1>
//               <Button
//                 type="submit"
//                 disabled={updateStrategyMutation.isPending}
//                 className="min-w-[120px]"
//               >
//                 {updateStrategyMutation.isPending ? (
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                 ) : (
//                   <>
//                     <Save className="mr-2 h-4 w-4" /> {t("form.saveButton")}
//                   </>
//                 )}
//               </Button>
//             </div>
//             <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
//               <div className="flex flex-col gap-8 lg:col-span-3">
//                 <Card>
//                   <CardHeader>
//                     <CardTitle>{t("form.basicInfoTitle")}</CardTitle>
//                     <CardDescription>
//                       {t("form.basicInfoDescription")}
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent className="space-y-4">
//                     <FormField
//                       control={formMethods.control}
//                       name="name"
//                       render={({ field }) => (
//                         <FormItem>
//                           <FormLabel>{t("form.nameLabel")}</FormLabel>
//                           <FormControl>
//                             <Input {...field} />
//                           </FormControl>
//                           <FormMessage />
//                         </FormItem>
//                       )}
//                     />
//                     <FormField
//                       control={formMethods.control}
//                       name="description"
//                       render={({ field }) => (
//                         <FormItem>
//                           <FormLabel>{t("form.descriptionLabel")}</FormLabel>
//                           <FormControl>
//                             <Textarea {...field} value={field.value ?? ""} />
//                           </FormControl>
//                           <FormMessage />
//                         </FormItem>
//                       )}
//                     />
//                     <FormField
//                       control={formMethods.control}
//                       name="isPublic"
//                       render={({ field }) => (
//                         <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
//                           <div className="space-y-0.5">
//                             <FormLabel>{t("form.isPublicLabel")}</FormLabel>
//                             <FormDescription>
//                               {t("form.isPublicDescription")}
//                             </FormDescription>
//                           </div>
//                           <FormControl>
//                             <Switch
//                               checked={field.value}
//                               onCheckedChange={field.onChange}
//                             />
//                           </FormControl>
//                         </FormItem>
//                       )}
//                     />
//                   </CardContent>
//                 </Card>
//               </div>
//               <div className="flex flex-col gap-8 lg:col-span-2">
//                 <TargetCoinForm
//                   targetCoins={strategyState.targetCoins}
//                   setTargetCoins={strategyState.setTargetCoins}
//                 />
//                 <TpslForm form={formMethods} onModeChange={setTpslMode} />
//               </div>
//             </div>
//             <Separator />
//             <div>
//               <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
//                 <h2 className="text-2xl font-bold text-foreground">
//                   {t("chartTitle")}
//                 </h2>
//                 <div className="flex items-center gap-2">
//                   <Select
//                     value={chartTicker}
//                     onValueChange={setChartTicker}
//                     disabled={strategyState.targetCoins.length === 0}
//                   >
//                     <SelectTrigger className="w-[180px]">
//                       <SelectValue placeholder="Select a coin" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {strategyState.targetCoins.map((coin) => (
//                         <SelectItem key={coin.ticker} value={coin.ticker}>
//                           {coin.ticker}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                   <div className="flex items-center p-1 rounded-md bg-muted">
//                     {["15m", "1h", "4h", "1d"].map((tf) => (
//                       <Button
//                         key={tf}
//                         type="button"
//                         variant={chartTimeframe === tf ? "primary" : "ghost"}
//                         size="sm"
//                         onClick={() => setChartTimeframe(tf)}
//                         className="h-8 px-3"
//                       >
//                         {tf}
//                       </Button>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//               <div className="relative">
//                 {isLoadingOHLCV ? (
//                   <Skeleton className="w-full h-[400px] rounded-lg" />
//                 ) : isError ? (
//                   <div className="w-full h-[400px] flex items-center justify-center text-destructive">
//                     {(error as Error).message}
//                   </div>
//                 ) : (
//                   <>
//                     <DynamicStrategyChart
//                       rules={{
//                         longEntry: strategyState.longEntryRules,
//                         longExit: strategyState.longExitRules,
//                         shortEntry: strategyState.shortEntryRules,
//                         shortExit: strategyState.shortExitRules,
//                       }}
//                       ohlcvData={ohlcvData}
//                       indicatorData={indicatorData}
//                       isLoadingIndicators={isLoadingIndicators}
//                       signalData={signalData}
//                       isLoadingSignals={isLoadingSignals}
//                     />
//                   </>
//                 )}
//               </div>
//             </div>
//             <Separator />
//             <div>
//               <h2 className="mb-4 text-2xl font-bold text-foreground">
//                 {t("rulesTitle")}
//               </h2>
//               <StrategyBuilderCanvas
//                 longEntryRules={strategyState.longEntryRules}
//                 longExitRules={strategyState.longExitRules}
//                 shortEntryRules={strategyState.shortEntryRules}
//                 shortExitRules={strategyState.shortExitRules}
//                 onAddTopLevelRule={handleAddTopLevelRule}
//                 onTriggerNestedAddRule={handleTriggerNestedAddRule}
//                 onTriggerOperandHub={handleTriggerOperandHub}
//                 onUpdateRule={(ruleType, id, newBlock) =>
//                   strategyState.updateRule(ruleType, id, newBlock)
//                 }
//                 onDeleteRule={(ruleType, id) =>
//                   strategyState.deleteRule(ruleType, id)
//                 }
//               />
//             </div>
//           </form>
//         </FormProvider>
//       </div>
//     </>
//   );
// });

// // --- 2. 페이지의 최상위 컴포넌트 ---
// export default function EditStrategyPage({
//   params,
// }: {
//   params: { strategyId: string };
// }) {
//   const t = useTranslations("StrategyBuilder");
//   const { strategyId } = params;

//   const {
//     data: initialStrategy,
//     isLoading,
//     isError,
//   } = useQuery<Strategy, Error>({
//     queryKey: ["strategy", strategyId],
//     queryFn: async () => {
//       const { data } = await apiClient.get(`/strategies/${strategyId}`);
//       return data;
//     },
//     enabled: !!strategyId,
//   });

//   if (isLoading) {
//     return (
//       <div className="container mx-auto max-w-7xl p-8">
//         <div className="flex justify-between items-center mb-8">
//           <Skeleton className="h-10 w-24" />
//           <Skeleton className="h-8 w-48" />
//           <Skeleton className="h-10 w-32" />
//         </div>
//         <div className="space-y-4">
//           <Skeleton className="h-64 w-full" />
//           <Skeleton className="h-96 w-full" />
//         </div>
//       </div>
//     );
//   }

//   if (isError || !initialStrategy) {
//     return (
//       <div className="container mx-auto p-8 text-center text-destructive">
//         {t("form.loadError")}
//       </div>
//     );
//   }

//   return (
//     <AuthGuard>
//       <StrategyEditForm key={strategyId} initialStrategy={initialStrategy} />
//     </AuthGuard>
//   );
// }
