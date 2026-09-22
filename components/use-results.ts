"use client";

import { useDeferredValue, useMemo } from "react";
import { cashFlowSummary, narrate, pointInTime, reviewInputs, safeCompareStrategies } from "@/lib/finance/analyze";
import { usePlanner } from "@/components/planner-provider";

export function useResults() {
  const { state } = usePlanner();
  const deferred = useDeferredValue(state);
  const calculated = useMemo(() => {
    const comparison = safeCompareStrategies(deferred);
    const snapshot = pointInTime(deferred);
    const cash = cashFlowSummary(deferred);
    const selected =
      comparison.results.find((result) => result.strategyId === deferred.selectedStrategyId) ??
      comparison.results[0] ??
      null;
    const minimum =
      comparison.results.find((result) => result.strategyId === "minimum") ??
      comparison.results.find((result) => result.effectiveStrategyKind === "minimum") ??
      null;
    return {
      comparison,
      snapshot,
      cash,
      selected,
      minimum,
      narrative: selected ? narrate(selected, minimum) : "",
      notes: reviewInputs(deferred, snapshot, cash),
    };
  }, [deferred]);

  return {
    state: deferred,
    calculating: deferred !== state,
    ...calculated,
  };
}
