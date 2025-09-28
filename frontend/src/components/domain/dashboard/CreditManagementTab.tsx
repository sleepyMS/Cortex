"use client";

import { CreditSummaryCard } from "./CreditSummaryCard";
import { CostEstimator } from "./CostEstimator";
import { CreditTransactionTable } from "./CreditTransactionTable";

export function CreditManagementTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <CreditSummaryCard />
        </div>
        <div className="md:col-span-2">
          <CostEstimator />
        </div>
      </div>
      <div>
        <CreditTransactionTable />
      </div>
    </div>
  );
}
