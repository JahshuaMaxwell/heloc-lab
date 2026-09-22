"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createId, income, expense, debt, strategy, workshopExample, coercePlanner } from "@/lib/finance/defaults";
import type { DebtInput, ExpenseInput, HelocInput, IncomeInput, PlannerState, RatePoint, StrategyInput } from "@/lib/finance/types";
import { DRAFT_KEY, writeDraft } from "@/lib/scenarios/storage";

function useStoredDraft(): string | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      const notify = () => onStoreChange();
      window.addEventListener("storage", notify);
      window.addEventListener("lbheloc-draft", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("lbheloc-draft", notify);
      };
    },
    () => window.localStorage.getItem(DRAFT_KEY),
    () => null,
  );
}

interface PlannerApi {
  state: PlannerState;
  hydrated: boolean;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
  updateHeloc: (patch: Partial<HelocInput>) => void;
  updateIncome: (id: string, patch: Partial<IncomeInput>) => void;
  addIncome: () => void;
  removeIncome: (id: string) => void;
  updateExpense: (id: string, patch: Partial<ExpenseInput>) => void;
  addExpense: () => void;
  removeExpense: (id: string) => void;
  updateDebt: (id: string, patch: Partial<DebtInput>) => void;
  addDebt: () => void;
  removeDebt: (id: string) => void;
  updateStrategy: (id: string, patch: Partial<StrategyInput>) => void;
  addPartialStrategy: () => void;
  removeStrategy: (id: string) => void;
  selectStrategy: (id: string) => void;
  addRatePoint: () => void;
  updateRatePoint: (id: string, patch: Partial<RatePoint>) => void;
  removeRatePoint: (id: string) => void;
  resetExample: () => void;
  loadScenario: (next: PlannerState) => void;
}

const PlannerContext = createContext<PlannerApi | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const storedDraft = useStoredDraft();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const external = useMemo(() => {
    if (!storedDraft) return workshopExample();
    try {
      return coercePlanner(JSON.parse(storedDraft));
    } catch {
      return workshopExample();
    }
  }, [storedDraft]);
  const [override, setOverride] = useState<PlannerState | null>(null);
  const state = override ?? external;

  useEffect(() => {
    if (!hydrated || !override) return;
    writeDraft(override);
    window.dispatchEvent(new Event("lbheloc-draft"));
  }, [hydrated, override]);

  const setState: React.Dispatch<React.SetStateAction<PlannerState>> = (action) => {
    setOverride((current) => {
      const base = current ?? external;
      return typeof action === "function" ? action(base) : action;
    });
  };

  const patchList = <T extends { id: string }>(key: "incomes" | "expenses" | "debts" | "strategies", id: string, patch: Partial<T>) => {
    setState((current) => ({
      ...current,
      [key]: current[key].map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };
  const api: PlannerApi = {
      state,
      hydrated,
      setState,
      updateHeloc: (patch) => setState((current) => ({ ...current, heloc: { ...current.heloc, ...patch } })),
      updateIncome: (id, patch) => patchList<IncomeInput>("incomes", id, patch),
      addIncome: () => setState((current) => ({ ...current, incomes: [...current.incomes, income({ name: "Additional income" })] })),
      removeIncome: (id) => setState((current) => ({ ...current, incomes: current.incomes.filter((item) => item.id !== id) })),
      updateExpense: (id, patch) => patchList<ExpenseInput>("expenses", id, patch),
      addExpense: () => setState((current) => ({ ...current, expenses: [...current.expenses, expense({ name: "New expense" })] })),
      removeExpense: (id) => setState((current) => ({ ...current, expenses: current.expenses.filter((item) => item.id !== id) })),
      updateDebt: (id, patch) => patchList<DebtInput>("debts", id, patch),
      addDebt: () => setState((current) => ({ ...current, debts: [...current.debts, debt({ creditor: "New creditor" })] })),
      removeDebt: (id) => setState((current) => ({ ...current, debts: current.debts.filter((item) => item.id !== id) })),
      updateStrategy: (id, patch) => patchList<StrategyInput>("strategies", id, patch),
      addPartialStrategy: () =>
        setState((current) => ({
          ...current,
          strategies: [
            ...current.strategies,
            strategy({
              id: createId("partial"),
              name: "Custom paycheck share",
              kind: "partial-paycheck",
              partialMode: "percent",
              partialPercent: "40",
            }),
          ],
        })),
      removeStrategy: (id) =>
        setState((current) => {
          if (current.strategies.length <= 1) return current;
          const strategies = current.strategies.filter((item) => item.id !== id);
          return {
            ...current,
            strategies,
            selectedStrategyId: current.selectedStrategyId === id ? strategies[0].id : current.selectedStrategyId,
          };
        }),
      selectStrategy: (id) => setState((current) => ({ ...current, selectedStrategyId: id })),
      addRatePoint: () =>
        setState((current) => ({
          ...current,
          heloc: {
            ...current.heloc,
            customSchedule: [
              ...current.heloc.customSchedule,
              { id: createId("rate"), effectiveDate: current.heloc.startDate, annualPercent: current.heloc.postPromoAnnualPercent || "8.50" },
            ],
          },
        })),
      updateRatePoint: (id, patch) =>
        setState((current) => ({
          ...current,
          heloc: {
            ...current.heloc,
            customSchedule: current.heloc.customSchedule.map((point) => (point.id === id ? { ...point, ...patch } : point)),
          },
        })),
      removeRatePoint: (id) =>
        setState((current) => ({
          ...current,
          heloc: { ...current.heloc, customSchedule: current.heloc.customSchedule.filter((point) => point.id !== id) },
        })),
      resetExample: () => setState(workshopExample()),
      loadScenario: (next) => setState(coercePlanner(next)),
  };

  return <PlannerContext.Provider value={api}>{children}</PlannerContext.Provider>;
}

export function usePlanner(): PlannerApi {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("usePlanner must be used within PlannerProvider");
  return value;
}
