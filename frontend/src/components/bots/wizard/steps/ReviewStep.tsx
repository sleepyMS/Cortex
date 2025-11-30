"use client";

import { WizardData } from "../BotWizard";
import { Card } from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";

interface ReviewStepProps {
  data: WizardData;
}

export function ReviewStep({ data }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review & Create</h2>
        <p className="text-muted-foreground">
          Review your settings before launching the bot.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground">
            Strategy
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Strategy ID</span>
            <span className="font-medium">{data.strategyId}</span>
            <span className="text-muted-foreground">Symbol</span>
            <span className="font-medium">{data.parameters.symbol}</span>
            <span className="text-muted-foreground">Timeframe</span>
            <span className="font-medium">{data.parameters.timeframe}</span>
          </div>
          <Separator />
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Parameters
            </span>
            <pre className="text-xs bg-muted p-2 rounded-md overflow-auto">
              {JSON.stringify(data.parameters, null, 2)}
            </pre>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground">
            Capital & Risk
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Exchange Account</span>
            <span className="font-medium">{data.exchangeAccountId}</span>
            <span className="text-muted-foreground">Initial Capital</span>
            <span className="font-medium">
              ${data.initialCapital.toLocaleString()}
            </span>
            <span className="text-muted-foreground">Leverage</span>
            <span className="font-medium">{data.leverage}x</span>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Take Profit</span>
            <span className="font-medium text-green-500">
              {data.riskSettings.takeProfit}%
            </span>
            <span className="text-muted-foreground">Stop Loss</span>
            <span className="font-medium text-red-500">
              {data.riskSettings.stopLoss}%
            </span>
            <span className="text-muted-foreground">Daily Max Loss</span>
            <span className="font-medium text-red-500">
              {data.riskSettings.dailyMaxLoss}%
            </span>
          </div>
        </Card>
      </div>

      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm text-yellow-500">
        <strong>Disclaimer:</strong> Automated trading involves significant
        risk. Ensure you understand the strategy and have tested it thoroughly
        before deploying with real capital.
      </div>
    </div>
  );
}
