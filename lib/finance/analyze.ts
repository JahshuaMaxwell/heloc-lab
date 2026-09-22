import Decimal from "decimal.js";
import { addMonths, isValidISODate } from "@/lib/finance/dates";
import {
  centsToDollars,
  dailyInterestCents,
  formatUSD,
  monthlyInterestCents,
  parseMoneyInput,
  parsePercentInput,
  percentToScaled,
} from "@/lib/finance/money";
import { resolveRate } from "@/lib/finance/rates";
import { expandRecurring, mergeAmountMaps, upcomingDates } from "@/lib/finance/schedule";
import { InputError, simulate } from "@/lib/finance/simulate";
import type {
  CashFlowSummary,
  PlannerState,
  PointInTime,
  SimulationOverrides,
  SimulationResult,
  StrategyInput,
} from "@/lib/finance/types";

export function runSimulation(state: PlannerState, overrides: SimulationOverrides = {}): SimulationResult {
  return simulate(state, overrides);
}

export function safeSimulation(
  state: PlannerState,
  overrides: SimulationOverrides = {},
): { result: SimulationResult | null; error: string | null } {
  try {
    return { result: simulate(state, overrides), error: null };
  } catch (error) {
    if (error instanceof InputError) return { result: null, error: error.issues.join(" ") };
    if (error instanceof Error) return { result: null, error: error.message };
    return { result: null, error: "The calculation could not be completed." };
  }
}

export function compareStrategies(state: PlannerState): SimulationResult[] {
  return state.strategies.map((item) =>
    simulate(state, { strategy: item, consolidationPlan: "continue" }),
  );
}

export function safeCompareStrategies(state: PlannerState): { results: SimulationResult[]; error: string | null } {
  const results: SimulationResult[] = [];
  for (const item of state.strategies) {
    const outcome = safeSimulation(state, { strategy: item, consolidationPlan: "continue" });
    if (!outcome.result) return { results: [], error: outcome.error };
    results.push(outcome.result);
  }
  return { results, error: null };
}

export function selectedStrategy(state: PlannerState): StrategyInput {
  return (
    state.strategies.find((item) => item.id === state.selectedStrategyId) ??
    state.strategies[0]
  );
}

export function compareConsolidation(state: PlannerState): SimulationResult[] {
  const baseline = state.strategies.find((item) => item.kind === "minimum") ?? selectedStrategy(state);
  const plans = [
    ["continue", "A. Continue existing payments"],
    ["transfer", "B. Transfer selected balances to the HELOC"],
    ["avalanche", "C. Avalanche without transferring balances"],
    ["accelerated", "D. HELOC transfer plus accelerated principal"],
  ] as const;
  return plans.map(([plan, name]) =>
    simulate(state, {
      consolidationPlan: plan,
      strategy: { ...baseline, id: plan, name },
    }),
  );
}

export interface StressRow {
  id: string;
  name: string;
  result: SimulationResult;
}

export function compareStress(state: PlannerState): StressRow[] {
  const strategy = selectedStrategy(state);
  const decrease = state.stressDecreasePercent.trim() || "1";
  const rows: { id: string; name: string; overrides: SimulationOverrides }[] = [
    { id: "flat", name: "Current rate path", overrides: { shockPercentPoints: "0", ignorePromo: false, useCustomSchedule: false } },
    { id: "plus1", name: "Rates increase by 1%", overrides: { shockPercentPoints: "1", useCustomSchedule: false } },
    { id: "plus2", name: "Rates increase by 2%", overrides: { shockPercentPoints: "2", useCustomSchedule: false } },
    { id: "plus3", name: "Rates increase by 3%", overrides: { shockPercentPoints: "3", useCustomSchedule: false } },
    {
      id: "down",
      name: `Rates decrease by ${decrease}%`,
      overrides: { shockPercentPoints: `-${decrease.replace(/^-/, "")}`, useCustomSchedule: false },
    },
    {
      id: "promo",
      name: "Promotional rate ends on the start date",
      overrides: { shockPercentPoints: "0", ignorePromo: true, useCustomSchedule: false },
    },
    {
      id: "custom",
      name: "Custom monthly rate schedule",
      overrides: { shockPercentPoints: "0", ignorePromo: false, useCustomSchedule: true },
    },
  ];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    result: simulate(state, { ...row.overrides, strategy, consolidationPlan: state.consolidationPlan }),
  }));
}

export function pointInTime(state: PlannerState): PointInTime {
  const limit = parseMoneyInput(state.heloc.creditLimit);
  const balance = parseMoneyInput(state.heloc.currentBalance);
  const withdrawal = parseMoneyInput(state.heloc.initialWithdrawal);
  if (!limit.ok || !balance.ok || !withdrawal.ok || limit.cents <= 0n) {
    return emptyPoint("Enter a credit limit and balances to calculate utilization and interest.");
  }
  if (balance.cents > limit.cents || withdrawal.cents > limit.cents) {
    return {
      ...emptyPoint("Balances cannot exceed the credit limit."),
      availableCredit: centsToDollars(limit.cents > balance.cents ? limit.cents - balance.cents : 0n),
    };
  }
  const rate = startingRate(state);
  const scaled = percentToScaled(rate.percent);
  return {
    initialUtilization: Number(withdrawal.cents) / Number(limit.cents),
    currentUtilization: Number(balance.cents) / Number(limit.cents),
    availableCredit: centsToDollars(limit.cents - balance.cents),
    dailyInterest: centsToDollars(dailyInterestCents(balance.cents, scaled, state.heloc.dayCount === "actual/360" ? 360 : 365)),
    monthlyInterest: centsToDollars(monthlyInterestCents(balance.cents, scaled)),
    ratePercent: rate.percent,
    rateLabel: rate.label,
    issue: null,
  };
}

export function cashFlowSummary(state: PlannerState): CashFlowSummary {
  const start = isValidISODate(state.heloc.startDate) ? state.heloc.startDate : "2026-10-01";
  const end = addMonths(start, 12);
  const incomeMaps = state.incomes.map((item) =>
    expandRecurring(
      {
        amount: parseMoneyInput(item.amount).cents,
        frequency: item.frequency,
        anchorDate: item.anchorDate,
        dayOfMonth: numberOr(item.dayOfMonth, 1),
        firstDay: numberOr(item.firstDay, 1),
        secondDay: numberOr(item.secondDay, 15),
      },
      start,
      end,
    ),
  );
  const expenseMaps = state.expenses.map((item) =>
    expandRecurring(
      {
        amount: parseMoneyInput(item.amount).cents,
        frequency: item.frequency,
        anchorDate: item.anchorDate,
        dayOfMonth: numberOr(item.dayOfMonth, 1),
        firstDay: numberOr(item.firstDay, 1),
        secondDay: numberOr(item.secondDay, 15),
      },
      start,
      end,
    ),
  );
  const income = sumMap(mergeAmountMaps(incomeMaps));
  const expenses = sumMap(mergeAmountMaps(expenseMaps));
  const debtMinimums = state.debts.reduce((sum, debt) => sum + parseMoneyInput(debt.minimumPayment).cents, 0n);
  const monthlyIncome = centsToDollars(income) / 12;
  const monthlyExpenses = centsToDollars(expenses) / 12;
  const monthlyDebt = centsToDollars(debtMinimums);
  const pays: CashFlowSummary["nextPayDates"] = [];
  for (const item of state.incomes) {
    for (const event of upcomingDates(
      item.anchorDate,
      item.frequency,
      numberOr(item.dayOfMonth, 1),
      numberOr(item.firstDay, 1),
      numberOr(item.secondDay, 15),
      start,
      3,
      item.amount,
    )) {
      pays.push({ name: item.name || "Income", date: event.date, amount: event.amount });
    }
  }
  pays.sort((a, b) => a.date.localeCompare(b.date));
  return {
    averageMonthlyIncome: monthlyIncome,
    averageMonthlyExpenses: monthlyExpenses,
    averageMonthlyDebtMinimums: monthlyDebt,
    averageMonthlySurplusBeforeHeloc: monthlyIncome - monthlyExpenses - monthlyDebt,
    nextPayDates: pays.slice(0, 6),
  };
}

export function narrate(current: SimulationResult, minimum: SimulationResult | null): string {
  const sentences: string[] = [];
  if (!current.canMeetObligations) {
    sentences.push(
      `${current.strategyName} does not cover every required payment or expense. A lower interest total is not a financial advantage if the household cannot fund the plan.`,
    );
  }
  if (minimum && current.strategyId !== minimum.strategyId) {
    const delta = minimum.totalInterestCharged - current.totalInterestCharged;
    if (delta > 1) {
      sentences.push(
        `Modeled HELOC interest is ${formatUSD(delta)} lower than minimum payments. The difference comes from the daily balance and the rate path. Depositing income does not create new money.`,
      );
    } else if (delta < -1) {
      sentences.push(
        `Modeled HELOC interest is ${formatUSD(-delta)} higher than minimum payments under these assumptions.`,
      );
    } else {
      sentences.push("Modeled HELOC interest is effectively the same as minimum payments.");
    }
  }
  if (current.effectiveStrategyKind === "full-paycheck" || current.effectiveStrategyKind === "partial-paycheck") {
    const net = current.totalDeposits - current.totalDraws;
    sentences.push(
      `Deposits to the HELOC total ${formatUSD(current.totalDeposits)} and draws total ${formatUSD(current.totalDraws)}. Net principal from that activity is ${formatUSD(net)} before interest and fees.`,
    );
    if (current.totalInterestCapitalized > 0) {
      sentences.push(
        `${formatUSD(current.totalInterestCapitalized)} of unpaid HELOC interest was added back to principal.`,
      );
    }
  }
  sentences.push(current.paidOff ? `The HELOC reaches zero on ${current.payoffLabel}.` : `${current.payoffLabel}.`);
  if (current.strategyBehaviorOverridden) {
    sentences.push("The selected consolidation plan changes how the HELOC payment is calculated.");
  }
  return sentences.join(" ");
}

export function reviewInputs(state: PlannerState, snapshot: PointInTime, cash: CashFlowSummary): string[] {
  const notes: string[] = [];
  if (snapshot.issue) notes.push(snapshot.issue);
  if (snapshot.currentUtilization !== null && snapshot.currentUtilization > 0.8) {
    notes.push("Current HELOC utilization is above 80 percent. That leaves little room for expense draws or a balance transfer.");
  }
  if (state.heloc.paymentStructure === "interest-only") {
    notes.push("During the draw period, an interest-only payment does not reduce principal. The balance stays in place unless extra principal is paid.");
  }
  if (state.heloc.usePromo && isValidISODate(state.heloc.promoExpiration) && isValidISODate(state.heloc.startDate)) {
    if (state.heloc.promoExpiration < state.heloc.startDate) {
      notes.push("The promotional rate expires before the simulation starts, so the post-promotional rate applies immediately.");
    }
  }
  if (state.heloc.customSchedule.length > 0) {
    notes.push("A custom rate schedule is active. It replaces the promotional and post-promotional rates on and after each effective date.");
  }
  if (cash.averageMonthlySurplusBeforeHeloc < 0) {
    notes.push("Average monthly cash flow is negative before the HELOC payment. The household may need to draw the line, miss bills, or cut spending.");
  }
  const aggressive = state.strategies.find((item) => item.kind === "fixed" && item.fixedMode === "additional");
  if (aggressive) {
    const extra = Number(aggressive.fixedAmount);
    if (Number.isFinite(extra) && extra > cash.averageMonthlySurplusBeforeHeloc) {
      notes.push(
        `The ${formatUSD(extra)} additional principal payment is larger than the estimated monthly surplus before HELOC interest. The model will show shortfalls where cash cannot support it.`,
      );
    }
  }
  if (!state.useEmergencyFundForShortfalls && Number(state.emergencyFund) > 0) {
    notes.push("The emergency fund is reported as a reserve. It is not spent unless you turn on using it for shortfalls.");
  }
  return notes;
}

export function yearlyRollup(result: SimulationResult): { year: string; interest: number; principal: number; endingBalance: number }[] {
  const years = new Map<string, { interest: number; principal: number; endingBalance: number }>();
  for (const month of result.monthly) {
    const year = month.month.slice(0, 4);
    const current = years.get(year) ?? { interest: 0, principal: 0, endingBalance: 0 };
    current.interest += month.interestCharged;
    current.principal += month.principalPaid;
    current.endingBalance = month.endingPrincipal;
    years.set(year, current);
  }
  return [...years.entries()].map(([year, value]) => ({ year, ...value }));
}

function startingRate(state: PlannerState): { percent: number; label: string } {
  const read = (value: string) => {
    const parsed = parsePercentInput(value);
    return parsed.ok ? parsed.percent : new Decimal(0);
  };
  const cap = state.heloc.rateCapPercent.trim() ? read(state.heloc.rateCapPercent) : null;
  const floor = state.heloc.rateFloorPercent.trim() ? read(state.heloc.rateFloorPercent) : null;
  const date = isValidISODate(state.heloc.startDate) ? state.heloc.startDate : "2026-10-01";
  const resolved = resolveRate({
    date,
    initialAnnualPercent: read(state.heloc.initialAnnualPercent),
    usePromo: state.heloc.usePromo,
    promoAnnualPercent: read(state.heloc.promoAnnualPercent),
    promoExpiration: state.heloc.promoExpiration,
    postPromoAnnualPercent: read(state.heloc.postPromoAnnualPercent),
    rateCapPercent: cap,
    rateFloorPercent: floor,
    shockPercentPoints: new Decimal(0),
    applyShockDuringPromo: state.heloc.applyShockDuringPromo,
    ignorePromo: false,
    customSchedule: state.heloc.customSchedule,
    useCustomSchedule: true,
  });
  const label =
    resolved.source === "promo"
      ? "Promotional rate on the start date"
      : resolved.source === "custom"
        ? "Custom schedule on the start date"
        : "Contract rate on the start date";
  return { percent: resolved.percent, label };
}

function emptyPoint(issue: string): PointInTime {
  return {
    initialUtilization: null,
    currentUtilization: null,
    availableCredit: 0,
    dailyInterest: 0,
    monthlyInterest: 0,
    ratePercent: 0,
    rateLabel: "Unavailable",
    issue,
  };
}

function sumMap(map: Map<string, bigint>): bigint {
  let total = 0n;
  for (const amount of map.values()) total += amount;
  return total;
}

function numberOr(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}
