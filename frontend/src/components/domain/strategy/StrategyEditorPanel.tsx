// frontend/src/components/domain/strategy/StrategyEditorPanel.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Loader2, Save, X, ArrowLeft } from "lucide-react";
import { CandlestickData, UTCTimestamp } from "lightweight-charts";

// --- Custom hooks, types, utilities ---
import { useStrategyState } from "@/hooks/useStrategyState";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import {
  StrategyType,
  LogicBlock,
  TpslLogic,
  TargetCoin,
  PositionRules,
  TargetSlot,
  IndicatorValue,
  LogicOperator,
  Strategy,
  AISignalLogic,
} from "@/types/strategy";
import { OHLCVData, SignalData } from "@/types/market";
import { parseRulesForIndicators, createLogicBlock } from "@/lib/strategyUtils";
import apiClient from "@/lib/apiClient";

// --- UI and domain components ---
import DynamicStrategyChart from "@/components/domain/strategy/DynamicStrategyChart";
import { IndicatorHub } from "@/components/domain/strategy/IndicatorHub";
import { StrategyBuilderCanvas } from "@/components/domain/strategy/StrategyBuilderCanvas";
import { TpslForm, TpslMode } from "@/components/domain/strategy/TpslForm";
import { TargetCoinForm } from "@/components/domain/strategy/TargetCoinForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Separator } from "@/components/ui/Separator";
import { Switch } from "@/components/ui/Switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/Form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { IndicatorMetadata } from "@/types/indicator";
import { StrategySnapshotList } from "@/components/domain/strategy/StrategySnapshotList";
import { GlassPane } from "@/components/ui/GlassPane";

// --- Animation variants ---
const barVariants = {
  hidden: { y: 60, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
  exit: { y: 60, opacity: 0 },
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
} as const;

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 180,
      damping: 22,
    },
  },
} as const;

// --- Zod form schema ---
const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: "전략 이름은 최소 3글자 이상이어야 합니다." })
    .max(100, { message: "전략 이름은 100자 이내여야 합니다." }),
  description: z
    .string()
    .max(500, { message: "설명은 500자 이내여야 합니다." })
    .optional()
    .nullable(),
  isPublic: z.boolean().default(false),
  takeProfitPct: z.number().min(0.1).optional().nullable(),
  stopLossPct: z.number().min(0.1).optional().nullable(),
  atrStopLossMultiplier: z.number().min(0.1).optional().nullable(),
  atrTakeProfitMultiplier: z.number().min(0.1).optional().nullable(),
  atrPeriod: z.number().int().min(1).optional().nullable(),
});

type StrategyFormValues = z.infer<typeof formSchema>;

// --- API payload type ---
interface StrategyPayload {
  name: string;
  description: string | null | undefined;
  isPublic: boolean;
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  tpslLogic: TpslLogic | null;
  targetCoins: TargetCoin[];
}

// --- API helper functions ---
const fetchStrategy = async (id: string): Promise<Strategy> => {
  const { data } = await apiClient.get(`/strategies/${id}`);
  return data;
};

const fetchOHLCVData = async (
  ticker: string,
  timeframe: string
): Promise<CandlestickData<UTCTimestamp>[]> => {
  const { data } = await apiClient.get<OHLCVData[]>("/market/ohlcv", {
    params: { ticker, timeframe, limit: 300 },
  });
  return data.map((d) => ({ ...d, time: d.time as UTCTimestamp }));
};

const fetchIndicatorData = async (
  ticker: string,
  timeframe: string,
  indicatorConfigs: any[],
  signal?: AbortSignal
) => {
  if (indicatorConfigs.length === 0) return null;
  const { data } = await apiClient.post(
    "/strategies/calculate-indicators",
    {
      ticker,
      timeframe,
      indicators: indicatorConfigs,
      limit: 300,
    },
    { signal }
  );
  return data.results;
};

const fetchSignalData = async (
  ticker: string,
  timeframe: string,
  rules: any,
  signal?: AbortSignal
): Promise<SignalData> => {
  if (!rules.longEntryRules && !rules.shortEntryRules) {
    return { signals: [] };
  }
  const { data } = await apiClient.post(
    "/strategies/calculate-signals",
    {
      ticker,
      timeframe,
      limit: 300,
      ...rules,
    },
    { signal }
  );
  return data;
};

// --- Props ---
interface StrategyEditorPanelProps {
  strategyId: string | null; // null for create mode
  onClose: () => void;
}

// --- Main component ---
export function StrategyEditorPanel({
  strategyId,
  onClose,
}: StrategyEditorPanelProps) {
  const t = useTranslations("StrategyBuilder");
  const tPage = useTranslations("StrategiesPage");
  const router = useRouter();
  const queryClient = useQueryClient();

  const isEditMode = !!strategyId;

  const strategyState = useStrategyState();
  const { allowedTimeframes } = useUserSubscription();
  const [tpslMode, setTpslMode] = useState<TpslMode>("percentage");
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot | null>(null);
  const [hubSelectionMode, setHubSelectionMode] = useState<
    "full" | "indicatorOnly"
  >("full");
  const [chartTicker, setChartTicker] = useState(() => {
    // Try to get ticker from query cache immediately
    if (strategyId) {
      // Look through all queries that start with "userStrategies"
      const allQueries = queryClient.getQueriesData<any>({
        queryKey: ["userStrategies"],
      });
      for (const [_, queryData] of allQueries) {
        if (!queryData) continue;

        // Infinite query data is nested in pages
        const strategyList = queryData.pages
          ? queryData.pages.flat()
          : queryData;
        const cached = Array.isArray(strategyList)
          ? strategyList.find((s: any) => s.id === strategyId)
          : null;

        if (cached && cached.targetCoins?.[0]?.ticker) {
          return cached.targetCoins[0].ticker;
        }
      }
    }
    return "BTCUSDT";
  });

  const [chartTimeframe, setChartTimeframe] = useState("1h");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const formMethods = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: false,
    },
  });

  const { isDirty: isFormDirty } = formMethods.formState;
  const initialStrategyRef = useRef<Strategy | null>(null);

  const { data: existingStrategy, isLoading: isLoadingStrategy } = useQuery({
    queryKey: ["strategy", strategyId],
    queryFn: () => fetchStrategy(strategyId!),
    enabled: isEditMode,
    initialData: () => {
      if (!strategyId) return undefined;
      const allQueries = queryClient.getQueriesData<any>({
        queryKey: ["userStrategies"],
      });
      for (const [_, queryData] of allQueries) {
        if (!queryData) continue;
        const strategyList = queryData.pages
          ? queryData.pages.flat()
          : queryData;
        const cached = Array.isArray(strategyList)
          ? strategyList.find((s: any) => s.id === strategyId)
          : null;
        if (cached) return cached;
      }
      return undefined;
    },
  });

  const isZustandDirty = useMemo(() => {
    if (!initialStrategyRef.current) {
      return (
        (strategyState.longEntryRules?.blocks?.length ?? 0) > 0 ||
        (strategyState.shortEntryRules?.blocks?.length ?? 0) > 0 ||
        strategyState.targetCoins.length > 0
      );
    }
    return (
      JSON.stringify(strategyState.longEntryRules) !==
        JSON.stringify(initialStrategyRef.current.longEntryRules) ||
      JSON.stringify(strategyState.longExitRules) !==
        JSON.stringify(initialStrategyRef.current.longExitRules) ||
      JSON.stringify(strategyState.shortEntryRules) !==
        JSON.stringify(initialStrategyRef.current.shortEntryRules) ||
      JSON.stringify(strategyState.shortExitRules) !==
        JSON.stringify(initialStrategyRef.current.shortExitRules) ||
      JSON.stringify(strategyState.targetCoins) !==
        JSON.stringify(initialStrategyRef.current.targetCoins)
    );
  }, [strategyState]);

  const isDirty = isFormDirty || isZustandDirty;

  useEffect(() => {
    if (isEditMode && existingStrategy) {
      initialStrategyRef.current = existingStrategy;
      formMethods.reset({
        name: existingStrategy.name,
        description: existingStrategy.description,
        isPublic: existingStrategy.isPublic,
        takeProfitPct: existingStrategy.tpslLogic?.takeProfitPct,
        stopLossPct: existingStrategy.tpslLogic?.stopLossPct,
        atrStopLossMultiplier:
          existingStrategy.tpslLogic?.atrStopLossMultiplier,
        atrTakeProfitMultiplier:
          existingStrategy.tpslLogic?.atrTakeProfitMultiplier,
        atrPeriod: existingStrategy.tpslLogic?.atrPeriod,
      });
      strategyState.setStrategy({
        longEntryRules: existingStrategy.longEntryRules,
        longExitRules: existingStrategy.longExitRules,
        shortEntryRules: existingStrategy.shortEntryRules,
        shortExitRules: existingStrategy.shortExitRules,
        targetCoins: existingStrategy.targetCoins,
      });

      if (existingStrategy.tpslLogic?.atrPeriod) {
        setTpslMode("atr");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEditMode,
    existingStrategy,
    formMethods.reset,
    strategyState.setStrategy,
  ]);

  useEffect(() => {
    if (!isEditMode) {
      initialStrategyRef.current = null;
      strategyState.reset();
      formMethods.reset({
        name: "",
        description: "",
        isPublic: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyId, isEditMode, strategyState.reset, formMethods.reset]);

  /**
   * Cleanup function to reset Zustand state when component unmounts
   */
  useEffect(() => {
    return () => {
      strategyState.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyState.reset]);

  useEffect(() => {
    if (
      strategyState.targetCoins.length > 0 &&
      strategyState.targetCoins[0].ticker !== chartTicker
    ) {
      setChartTicker(strategyState.targetCoins[0].ticker);
    } else if (
      strategyState.targetCoins.length === 0 &&
      chartTicker !== "BTCUSDT"
    ) {
      setChartTicker("BTCUSDT");
    }
  }, [strategyState.targetCoins, chartTicker]);

  const {
    data: ohlcvData,
    isLoading: isLoadingOHLCV,
    isError,
    error,
  } = useQuery({
    queryKey: ["ohlcv", chartTicker, chartTimeframe],
    queryFn: () => fetchOHLCVData(chartTicker, chartTimeframe),
    staleTime: 5 * 60 * 1000,
  });

  const currentRules = useMemo(
    () => ({
      longEntryRules: strategyState.longEntryRules,
      longExitRules: strategyState.longExitRules,
      shortEntryRules: strategyState.shortEntryRules,
      shortExitRules: strategyState.shortExitRules,
    }),
    [
      strategyState.longEntryRules,
      strategyState.longExitRules,
      strategyState.shortEntryRules,
      strategyState.shortExitRules,
    ]
  );

  const [debouncedRules, setDebouncedRules] = useState(currentRules);
  const isInitialRulesLoad = useRef(true);

  useEffect(() => {
    // If it's the first time rules are loaded, or they are empty, skip debounce for snappier startup
    if (isInitialRulesLoad.current) {
      if (
        currentRules.longEntryRules ||
        currentRules.longExitRules ||
        currentRules.shortEntryRules ||
        currentRules.shortExitRules
      ) {
        setDebouncedRules(currentRules);
        isInitialRulesLoad.current = false;
        return;
      }
    }

    const timer = setTimeout(() => {
      setDebouncedRules(currentRules);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [currentRules]);

  const indicatorConfigs = useMemo(
    () =>
      parseRulesForIndicators({
        longEntry: debouncedRules.longEntryRules,
        longExit: debouncedRules.longExitRules,
        shortEntry: debouncedRules.shortEntryRules,
        shortExit: debouncedRules.shortExitRules,
      }),
    [
      debouncedRules.longEntryRules,
      debouncedRules.longExitRules,
      debouncedRules.shortEntryRules,
      debouncedRules.shortExitRules,
    ]
  );

  const { data: indicatorData, isLoading: isLoadingIndicators } = useQuery({
    queryKey: ["indicators", chartTicker, chartTimeframe, indicatorConfigs],
    queryFn: ({ signal }) =>
      fetchIndicatorData(chartTicker, chartTimeframe, indicatorConfigs, signal),
    enabled: indicatorConfigs.length > 0,
  });

  const { data: signalData, isLoading: isLoadingSignals } = useQuery({
    queryKey: ["signals", chartTicker, chartTimeframe, debouncedRules],
    queryFn: ({ signal }) =>
      fetchSignalData(chartTicker, chartTimeframe, debouncedRules, signal),
    enabled:
      !!debouncedRules &&
      (!!debouncedRules.longEntryRules || !!debouncedRules.shortEntryRules),
  });

  const handleAddTopLevelRule = (ruleType: StrategyType) => {
    setCurrentTarget({ type: "top-level", ruleType });
    setHubSelectionMode("full");
    setIsHubOpen(true);
  };

  const handleTriggerNestedAddRule = (
    ruleType: StrategyType,
    parentId: string,
    as: LogicOperator
  ) => {
    setCurrentTarget({ type: "nested-add", ruleType, parentId, as });
    setHubSelectionMode("full");
    setIsHubOpen(true);
  };

  const handleTriggerOperandHub = (
    ruleType: StrategyType,
    blockId: string,
    operandKey: string
  ) => {
    setCurrentTarget({ type: "operand", ruleType, blockId, operandKey });
    setHubSelectionMode("indicatorOnly");
    setIsHubOpen(true);
  };

  const handleTriggerReplaceBlock = (
    ruleType: StrategyType,
    blockId: string
  ) => {
    setCurrentTarget({ type: "replace-block", ruleType, blockId });
    setHubSelectionMode("full");
    setIsHubOpen(true);
  };

  const handleIndicatorSelect = (
    indicator: IndicatorMetadata,
    logicType: string
  ) => {
    if (!currentTarget) return;
    const newBlock = createLogicBlock(indicator, logicType, allowedTimeframes);

    if (currentTarget.type === "operand") {
      const newIndicatorValue =
        (newBlock as any).operandA ||
        (newBlock as any).indicator ||
        (newBlock as any).mainLine;
      strategyState.updateRuleLogic(
        currentTarget.ruleType,
        currentTarget.blockId,
        currentTarget.operandKey,
        newIndicatorValue
      );
    } else if (currentTarget.type === "replace-block") {
      strategyState.updateRule(
        currentTarget.ruleType,
        currentTarget.blockId,
        newBlock
      );
    } else if (currentTarget.type === "top-level") {
      strategyState.addRule(currentTarget.ruleType, newBlock, null);
    } else if (currentTarget.type === "nested-add") {
      strategyState.addRule(
        currentTarget.ruleType,
        newBlock,
        currentTarget.parentId,
        currentTarget.as
      );
    }
    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  // AI 모델 선택 핸들러
  const handleAIModelSelect = (
    modelId: string,
    modelName: string,
    logicType: string
  ) => {
    if (!currentTarget) return;

    const newBlock: AISignalLogic = {
      id: crypto.randomUUID(),
      type: "ai_signal",
      modelId,
      modelName,
      signalType: "buy", // 기본값, RuleBlock에서 수정 가능
      evaluationMode: "highest", // 기본값
      minConfidence: 0.5,
    };

    if (currentTarget.type === "top-level") {
      strategyState.addRule(currentTarget.ruleType, newBlock, null);
    } else if (currentTarget.type === "nested-add") {
      strategyState.addRule(
        currentTarget.ruleType,
        newBlock,
        currentTarget.parentId,
        currentTarget.as
      );
    }

    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  const buildPayload = (values: StrategyFormValues): StrategyPayload => {
    let tpslLogic: TpslLogic | null = null;
    if (
      tpslMode === "percentage" &&
      (values.takeProfitPct || values.stopLossPct)
    ) {
      tpslLogic = {
        takeProfitPct: values.takeProfitPct || null,
        stopLossPct: values.stopLossPct || null,
        atrStopLossMultiplier: null,
        atrTakeProfitMultiplier: null,
        atrPeriod: null,
      };
    } else if (
      tpslMode === "atr" &&
      (values.atrPeriod ||
        values.atrStopLossMultiplier ||
        values.atrTakeProfitMultiplier)
    ) {
      tpslLogic = {
        takeProfitPct: null,
        stopLossPct: null,
        atrStopLossMultiplier: values.atrStopLossMultiplier || null,
        atrTakeProfitMultiplier: values.atrTakeProfitMultiplier || null,
        atrPeriod: values.atrPeriod || null,
      };
    }
    return {
      name: values.name,
      description: values.description,
      isPublic: values.isPublic,
      longEntryRules: strategyState.longEntryRules,
      longExitRules: strategyState.longExitRules,
      shortEntryRules: strategyState.shortEntryRules,
      shortExitRules: strategyState.shortExitRules,
      tpslLogic: tpslLogic,
      targetCoins: strategyState.targetCoins,
    };
  };

  const saveMutation = useMutation({
    mutationFn: async (values: StrategyFormValues) => {
      const payload = buildPayload(values);
      if (isEditMode) {
        const { data } = await apiClient.put(
          `/strategies/${strategyId}`,
          payload
        );
        return data;
      } else {
        const { data } = await apiClient.post("/strategies", payload);
        return data;
      }
    },
    onSuccess: (data: any) => {
      toast.success(
        t(isEditMode ? "form.saveSuccess" : "form.saveSuccess", {
          strategyName: data.name,
        })
      );
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy", strategyId] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(
        t(isEditMode ? "form.updateError" : "form.saveError", {
          error: error?.response?.data?.detail || "Unknown error",
        })
      );
    },
  });

  const onSubmit = (values: StrategyFormValues) => {
    if (!strategyState.longEntryRules && !strategyState.shortEntryRules) {
      return toast.error(t("form.rulesRequired"));
    }
    if (strategyState.targetCoins.length === 0) {
      return toast.error(t("targetCoinForm.noTickerError"));
    }
    saveMutation.mutate(values);
  };

  const handleResetChanges = () => {
    if (initialStrategyRef.current) {
      const initialData = initialStrategyRef.current;

      formMethods.reset({
        name: initialData.name,
        description: initialData.description,
        isPublic: initialData.isPublic,
        takeProfitPct: initialData.tpslLogic?.takeProfitPct,
        stopLossPct: initialData.tpslLogic?.stopLossPct,
        atrStopLossMultiplier: initialData.tpslLogic?.atrStopLossMultiplier,
        atrTakeProfitMultiplier: initialData.tpslLogic?.atrTakeProfitMultiplier,
        atrPeriod: initialData.tpslLogic?.atrPeriod,
      });

      strategyState.setStrategy({
        longEntryRules: initialData.longEntryRules,
        longExitRules: initialData.longExitRules,
        shortEntryRules: initialData.shortEntryRules,
        shortExitRules: initialData.shortExitRules,
        targetCoins: initialData.targetCoins,
      });
    } else {
      formMethods.reset({
        name: "",
        description: "",
        isPublic: false,
        takeProfitPct: null,
        stopLossPct: null,
        atrStopLossMultiplier: null,
        atrTakeProfitMultiplier: null,
        atrPeriod: null,
      });
      strategyState.reset();
    }

    toast.info(t("form.changesCanceled"));
  };

  const handleRestoreSnapshot = (snapshot: any) => {
    formMethods.reset({
      name: snapshot.name,
      description: snapshot.description,
      isPublic: snapshot.isPublic,
      takeProfitPct: snapshot.tpslLogic?.takeProfitPct,
      stopLossPct: snapshot.tpslLogic?.stopLossPct,
      atrStopLossMultiplier: snapshot.tpslLogic?.atrStopLossMultiplier,
      atrTakeProfitMultiplier: snapshot.tpslLogic?.atrTakeProfitMultiplier,
      atrPeriod: snapshot.tpslLogic?.atrPeriod,
    });

    strategyState.setStrategy({
      longEntryRules: snapshot.longEntryRules,
      longExitRules: snapshot.longExitRules,
      shortEntryRules: snapshot.shortEntryRules,
      shortExitRules: snapshot.shortExitRules,
      targetCoins: snapshot.targetCoins,
    });

    if (snapshot.tpslLogic?.atrPeriod) {
      setTpslMode("atr");
    } else {
      setTpslMode("percentage");
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, onClose]);

  // No early return for loading to avoid jarring layout shifts
  const showContent = !isEditMode || (!!existingStrategy && !isLoadingStrategy);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
        onAIModelSelect={handleAIModelSelect}
        selectionMode={hubSelectionMode}
      />

      {/* Header with close button - fixed at top */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {isEditMode ? t("editTitle") : t("title")}
              </h1>
              <div className="h-4 w-[1px] bg-border/50"></div>
              <p className="text-xs text-muted-foreground">
                {tPage("splitView.keyboardShortcut")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {!showContent ? (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 space-y-8"
            >
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                <div className="flex flex-col gap-8 lg:col-span-3">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                  <Skeleton className="h-[400px] w-full rounded-xl" />
                </div>
                <div className="flex flex-col gap-8 lg:col-span-2">
                  <Skeleton className="h-[300px] w-full rounded-xl" />
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="editor-content"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="p-6"
            >
              <FormProvider {...formMethods}>
                <form
                  onSubmit={formMethods.handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                      <div className="flex flex-col gap-8 lg:col-span-3">
                        <motion.div variants={itemVariants}>
                          <Card>
                            <CardHeader>
                              <CardTitle>{t("form.basicInfoTitle")}</CardTitle>
                              <CardDescription>
                                {t("form.basicInfoDescription")}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <FormField
                                control={formMethods.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t("form.nameLabel")}</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={t("form.namePlaceholder")}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={formMethods.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {t("form.descriptionLabel")}
                                    </FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder={t(
                                          "form.descriptionPlaceholder"
                                        )}
                                        {...field}
                                        value={field.value ?? ""}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={formMethods.control}
                                name="isPublic"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                      <FormLabel>
                                        {t("form.isPublicLabel")}
                                      </FormLabel>
                                      <FormDescription>
                                        {t("form.isPublicDescription")}
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          </Card>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                          <StrategySnapshotList
                            backtests={existingStrategy?.backtests ?? []}
                            onRestore={handleRestoreSnapshot}
                          />
                        </motion.div>
                      </div>
                      <div className="flex flex-col gap-8 lg:col-span-2">
                        <motion.div variants={itemVariants}>
                          <TargetCoinForm
                            targetCoins={strategyState.targetCoins}
                            setTargetCoins={strategyState.setTargetCoins}
                          />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                          <TpslForm
                            form={formMethods}
                            onModeChange={setTpslMode}
                          />
                        </motion.div>
                      </div>
                    </div>

                    <motion.div variants={itemVariants}>
                      <Separator />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <GlassPane className="p-6 md:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                          <h2 className="text-2xl font-bold text-foreground">
                            {t("chartTitle")}
                          </h2>
                          <div className="flex items-center gap-2">
                            <Select
                              value={chartTicker}
                              onValueChange={setChartTicker}
                              disabled={strategyState.targetCoins.length === 0}
                            >
                              <SelectTrigger className="w-[180px] bg-background/50">
                                <SelectValue placeholder="Select a coin" />
                              </SelectTrigger>
                              <SelectContent>
                                {strategyState.targetCoins.map((coin) => (
                                  <SelectItem
                                    key={coin.ticker}
                                    value={coin.ticker}
                                  >
                                    {coin.ticker}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={chartTimeframe}
                              onValueChange={setChartTimeframe}
                            >
                              <SelectTrigger className="w-[100px] bg-background/50">
                                <SelectValue placeholder="Timeframe" />
                              </SelectTrigger>
                              <SelectContent>
                                {[
                                  "1m",
                                  "5m",
                                  "15m",
                                  "30m",
                                  "1h",
                                  "4h",
                                  "1d",
                                  "1w",
                                  "1M",
                                ].map((tf) => (
                                  <SelectItem key={tf} value={tf}>
                                    {tf}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="relative rounded-lg overflow-hidden border border-primary/10">
                          {isLoadingOHLCV ? (
                            <Skeleton className="w-full h-[400px] rounded-lg" />
                          ) : isError ? (
                            <div className="w-full h-[400px] rounded-lg border bg-destructive/10 flex items-center justify-center text-destructive font-semibold">
                              Chart data could not be loaded. (
                              {(error as Error).message})
                            </div>
                          ) : (
                            <DynamicStrategyChart
                              rules={{
                                longEntry: strategyState.longEntryRules,
                                longExit: strategyState.longExitRules,
                                shortEntry: strategyState.shortEntryRules,
                                shortExit: strategyState.shortExitRules,
                              }}
                              ohlcvData={ohlcvData}
                              indicatorData={indicatorData}
                              isLoadingIndicators={isLoadingIndicators}
                              signalData={signalData}
                              isLoadingSignals={isLoadingSignals}
                            />
                          )}
                        </div>
                      </GlassPane>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <Separator />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <h2 className="mb-4 text-2xl font-bold text-foreground">
                        {t("rulesTitle")}
                      </h2>
                      <StrategyBuilderCanvas
                        longEntryRules={strategyState.longEntryRules}
                        longExitRules={strategyState.longExitRules}
                        shortEntryRules={strategyState.shortEntryRules}
                        shortExitRules={strategyState.shortExitRules}
                        onAddTopLevelRule={handleAddTopLevelRule}
                        onTriggerNestedAddRule={handleTriggerNestedAddRule}
                        onTriggerOperandHub={handleTriggerOperandHub}
                        onTriggerReplaceBlock={handleTriggerReplaceBlock}
                        onUpdateRule={(ruleType, id, newBlock) =>
                          strategyState.updateRule(ruleType, id, newBlock)
                        }
                        onDeleteRule={(ruleType, id) =>
                          strategyState.deleteRule(ruleType, id)
                        }
                      />
                    </motion.div>
                  </div>
                </form>
              </FormProvider>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating save bar */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            className="fixed bottom-0 inset-x-0 flex justify-center z-20 p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            variants={barVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="w-full max-w-7xl flex items-center justify-between gap-4">
              <motion.span className="text-sm font-semibold text-foreground hidden sm:inline flex-shrink-0">
                {t("form.unsavedChanges")}
              </motion.span>

              <div className="flex items-center justify-end gap-2 ml-auto">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetChanges}
                >
                  <X className="mr-2 h-4 w-4" />
                  {t("form.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={formMethods.handleSubmit(onSubmit)}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  {t("form.saveButton")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close confirmation dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tPage("splitView.unsavedChanges")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tPage("splitView.confirmClose")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>
              {tPage("splitView.closeEditor")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
