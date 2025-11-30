"use client";

import { Button } from "@/components/ui/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/AlertDialog";
import { Play, Square, AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";

interface BotControlPanelProps {
  status: "running" | "stopped" | "error";
  onStart: () => void;
  onStop: () => void;
  onPanic: () => void;
  onDelete: () => void;
}

export function BotControlPanel({
  status,
  onStart,
  onStop,
  onPanic,
  onDelete,
}: BotControlPanelProps) {
  const [isPanicOpen, setIsPanicOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 mr-auto">
        <Badge
          variant={status === "running" ? "default" : "secondary"}
          className={`text-sm px-3 py-1 ${
            status === "running"
              ? "bg-green-500 hover:bg-green-600"
              : status === "error"
              ? "bg-red-500 hover:bg-red-600"
              : "bg-gray-500 hover:bg-gray-600"
          }`}
        >
          {status.toUpperCase()}
        </Badge>
      </div>

      {status === "stopped" || status === "error" ? (
        <Button
          onClick={onStart}
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          <Play className="h-4 w-4" />
          Start Bot
        </Button>
      ) : (
        <Button onClick={onStop} variant="secondary" className="gap-2">
          <Square className="h-4 w-4 fill-current" />
          Stop Bot
        </Button>
      )}

      <AlertDialog open={isPanicOpen} onOpenChange={setIsPanicOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Panic Sell
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will{" "}
              <strong>immediately close all open positions</strong> at market
              price. This may result in significant slippage or loss depending
              on market conditions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onPanic();
                setIsPanicOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Panic Sell
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="text-muted-foreground hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
