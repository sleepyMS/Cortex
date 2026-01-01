import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface AIWebSocketMessage {
  status: "pending" | "training" | "optimizing" | "completed" | "failed";
  message: string;
  progressPct: number;
  currentMetrics?: {
    phase?: "training" | "optimization" | "final_training";
    epoch?: number;
    total_epochs?: number;
    trainLoss?: number;
    valLoss?: number;
    accuracy?: number;
    rmse?: number;
    [key: string]: any;
  };
}

export function useAITrainingSocket(
  modelId: string,
  isEnabled: boolean = false
) {
  const [lastMessage, setLastMessage] = useState<AIWebSocketMessage | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const t = useTranslations("AILabPage");

  useEffect(() => {
    if (!isEnabled || !modelId) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    const wsUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") ||
      "ws://localhost:8000";
    const socket = new WebSocket(`${wsUrl}/ws/ai-training/${modelId}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log(`📡 WS Connected: ${modelId}`);
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const rawData = JSON.parse(event.data);

        // Map backend snake_case to frontend camelCase if needed
        let currentMetrics = rawData.currentMetrics;
        if (currentMetrics) {
          currentMetrics = {
            ...currentMetrics,
            trainLoss: currentMetrics.trainLoss ?? currentMetrics.train_loss,
            valLoss: currentMetrics.valLoss ?? currentMetrics.val_loss,
            totalEpochs:
              currentMetrics.totalEpochs ?? currentMetrics.total_epochs,
            // Optimization mappings
            totalTrials:
              currentMetrics.totalTrials ?? currentMetrics.total_trials,
            bestValue: currentMetrics.bestValue ?? currentMetrics.best_value,
          };
        }

        const data: AIWebSocketMessage = {
          ...rawData,
          currentMetrics,
        };

        setLastMessage(data);

        // Hybrid Architecture: Re-sync state on critical events
        if (data.status === "completed") {
          toast.success(t("detail.training.completed")); // "학습이 완료되었습니다"
          queryClient.invalidateQueries({ queryKey: ["ai-model", modelId] });
          queryClient.invalidateQueries({
            queryKey: ["ai-model-status", modelId],
          });
          queryClient.invalidateQueries({
            queryKey: ["ai-model-versions", modelId],
          });
        } else if (data.status === "failed") {
          toast.error(`${t("detail.training.failed")}: ${data.message}`);
          queryClient.invalidateQueries({ queryKey: ["ai-model", modelId] });
        }
      } catch (err) {
        console.error("WS Parse Error:", err);
      }
    };

    socket.onclose = () => {
      console.log(`🔌 WS Disconnected: ${modelId}`);
      setIsConnected(false);
    };

    socket.onerror = (error) => {
      console.error("WS Error:", error);
      setIsConnected(false);
    };

    return () => {
      socket.close();
    };
  }, [modelId, isEnabled, queryClient, t]);

  return { lastMessage, isConnected };
}
