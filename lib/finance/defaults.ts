import type {
  DebtInput,
  ExpenseInput,
  IncomeInput,
  PlannerState,
  StrategyInput,
} from "@/lib/finance/types";

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function income(partial: Partial<IncomeInput> = {}): IncomeInput {
  return {
    id: createId("income"),
    name: "Take-home pay",
    amount: "0",
    frequency: "monthly",
    anchorDate: "2026-10-01",
    dayOfMonth: "1",
    firstDay: "1",
    secondDay: "15",
    ...partial,
  };
}

export function expense(partial: Partial<ExpenseInput> = {}): ExpenseInput {
  return {
    id: createId("expense"),
    name: "Expense",
    category: "other",
    amount: "0",
    frequency: "monthly",
    anchorDate: "2026-10-01",
    dayOfMonth: "1",
    firstDay: "1",
    secondDay: "15",
    ...partial,
  };
}

export function debt(partial: Partial<DebtInput> = {}): DebtInput {
  return {
    id: createId("debt"),
    creditor: "Credit card",
    balance: "0",
    apr: "0",
    minimumPayment: "0",
    creditLimit: "",
    dueDay: "15",
    includeInTransfer: false,
    type: "credit-card",
    ...partial,
  };
}

export function strategy(partial: Partial<StrategyInput> = {}): StrategyInput {
  return {
    id: createId("strategy"),
    name: "Minimum payments",
    kind: "minimum",
    fixedMode: "additional",
    fixedAmount: "0",
    partialMode: "percent",
    partialPercent: "0",
    partialAmount: "0",
    ...partial,
  };
}

export function minimalPlanner(partial: Partial<PlannerState> = {}): PlannerState {
  const minimum = strategy({ id: "minimum", name: "Minimum payments", kind: "minimum" });
  const base: PlannerState = {
    version: 1,
    scenarioId: "scenario-test",
    scenarioName: "Test case",
    heloc: {
      creditLimit: "150000",
      initialWithdrawal: "75000",
      currentBalance: "75000",
      initialAnnualPercent: "8.5",
      usePromo: false,
      promoAnnualPercent: "0",
      promoExpiration: "2027-04-01",
      postPromoAnnualPercent: "8.5",
      rateCapPercent: "",
      rateFloorPercent: "",
      statedMinimumPayment: "0",
      paymentStructure: "interest-only",
      drawPeriodMonths: "120",
      repaymentPeriodMonths: "240",
      originationFee: "0",
      annualFee: "0",
      drawFeeFlat: "0",
      drawFeePercent: "0",
      earlyClosureFee: "0",
      earlyClosureWithinMonths: "0",
      startDate: "2026-10-01",
      paymentDay: "1",
      dayCount: "actual/365",
      transactionOrder: "deposits-first",
      capitalizeUnpaidInterest: true,
      financeFees: false,
      applyShockDuringPromo: false,
      customSchedule: [],
    },
    incomes: [],
    expenses: [],
    emergencyFund: "0",
    startingChecking: "0",
    useEmergencyFundForShortfalls: false,
    checkingCushion: "0",
    debts: [],
    strategies: [minimum],
    selectedStrategyId: minimum.id,
    consolidationPlan: "continue",
    accelerationAmount: "500",
    stressDecreasePercent: "1",
  };
  return {
    ...base,
    ...partial,
    heloc: { ...base.heloc, ...partial.heloc },
  };
}

export const workshopStrategies: StrategyInput[] = [
  strategy({
    id: "minimum",
    name: "Minimum Payment Strategy",
    kind: "minimum",
  }),
  strategy({
    id: "fixed-total",
    name: "$2,000 Total Monthly Payment",
    kind: "fixed",
    fixedMode: "total",
    fixedAmount: "2000",
  }),
  strategy({
    id: "fixed-additional",
    name: "$2,000 Additional Principal",
    kind: "fixed",
    fixedMode: "additional",
    fixedAmount: "2000",
  }),
  strategy({
    id: "full-paycheck",
    name: "Entire Paycheck Strategy",
    kind: "full-paycheck",
  }),
  strategy({
    id: "partial-25",
    name: "25% Paycheck Cycling",
    kind: "partial-paycheck",
    partialMode: "percent",
    partialPercent: "25",
  }),
  strategy({
    id: "partial-50",
    name: "50% Paycheck Cycling",
    kind: "partial-paycheck",
    partialMode: "percent",
    partialPercent: "50",
  }),
  strategy({
    id: "partial-75",
    name: "75% Paycheck Cycling",
    kind: "partial-paycheck",
    partialMode: "percent",
    partialPercent: "75",
  }),
];

export function workshopExample(): PlannerState {
  return {
    version: 1,
    scenarioId: "workshop-example",
    scenarioName: "Workshop example",
    heloc: {
      creditLimit: "150000",
      initialWithdrawal: "75000",
      currentBalance: "75000",
      initialAnnualPercent: "8.50",
      usePromo: true,
      promoAnnualPercent: "4.99",
      promoExpiration: "2027-04-01",
      postPromoAnnualPercent: "8.50",
      rateCapPercent: "18.00",
      rateFloorPercent: "3.00",
      statedMinimumPayment: "100",
      paymentStructure: "interest-only",
      drawPeriodMonths: "120",
      repaymentPeriodMonths: "240",
      originationFee: "0",
      annualFee: "75",
      drawFeeFlat: "0",
      drawFeePercent: "0",
      earlyClosureFee: "350",
      earlyClosureWithinMonths: "36",
      startDate: "2026-10-01",
      paymentDay: "1",
      dayCount: "actual/365",
      transactionOrder: "deposits-first",
      capitalizeUnpaidInterest: true,
      financeFees: false,
      applyShockDuringPromo: false,
      customSchedule: [],
    },
    incomes: [
      income({
        id: "income-primary",
        name: "Primary take-home pay",
        amount: "3000",
        frequency: "biweekly",
        anchorDate: "2026-10-02",
        dayOfMonth: "2",
      }),
    ],
    expenses: [
      expense({ id: "exp-mortgage", name: "Mortgage", category: "mortgage", amount: "1800", dayOfMonth: "1", anchorDate: "2026-10-01" }),
      expense({ id: "exp-utilities", name: "Utilities", category: "utilities", amount: "350", dayOfMonth: "12", anchorDate: "2026-10-12" }),
      expense({ id: "exp-transport", name: "Transportation", category: "transportation", amount: "400", dayOfMonth: "5", anchorDate: "2026-10-05" }),
      expense({ id: "exp-insurance", name: "Insurance", category: "insurance", amount: "250", dayOfMonth: "8", anchorDate: "2026-10-08" }),
      expense({ id: "exp-groceries", name: "Groceries", category: "groceries", amount: "800", dayOfMonth: "6", anchorDate: "2026-10-06" }),
      expense({ id: "exp-other", name: "Other recurring", category: "other", amount: "300", dayOfMonth: "22", anchorDate: "2026-10-22" }),
      expense({ id: "exp-variable", name: "Variable spending", category: "variable", amount: "250", dayOfMonth: "25", anchorDate: "2026-10-25" }),
    ],
    emergencyFund: "5000",
    startingChecking: "1500",
    useEmergencyFundForShortfalls: false,
    checkingCushion: "500",
    debts: [
      debt({
        id: "debt-visa",
        creditor: "Visa",
        balance: "8500",
        apr: "22.99",
        minimumPayment: "250",
        creditLimit: "12000",
        dueDay: "15",
        includeInTransfer: true,
        type: "credit-card",
      }),
      debt({
        id: "debt-mastercard",
        creditor: "Mastercard",
        balance: "4200",
        apr: "19.99",
        minimumPayment: "125",
        creditLimit: "8000",
        dueDay: "20",
        includeInTransfer: true,
        type: "credit-card",
      }),
      debt({
        id: "debt-personal",
        creditor: "Credit union personal loan",
        balance: "6000",
        apr: "11.50",
        minimumPayment: "200",
        creditLimit: "",
        dueDay: "18",
        includeInTransfer: false,
        type: "personal-loan",
      }),
      debt({
        id: "debt-student",
        creditor: "Student loan",
        balance: "12000",
        apr: "6.50",
        minimumPayment: "150",
        creditLimit: "",
        dueDay: "20",
        includeInTransfer: false,
        type: "student-loan",
      }),
    ],
    strategies: workshopStrategies,
    selectedStrategyId: "full-paycheck",
    consolidationPlan: "continue",
    accelerationAmount: "500",
    stressDecreasePercent: "1",
  };
}

export function coercePlanner(value: unknown): PlannerState {
  const example = workshopExample();
  if (!value || typeof value !== "object") return example;
  const record = value as Partial<PlannerState>;
  return {
    ...example,
    ...record,
    version: 1,
    heloc: { ...example.heloc, ...record.heloc, customSchedule: record.heloc?.customSchedule ?? [] },
    incomes: Array.isArray(record.incomes) ? record.incomes : example.incomes,
    expenses: Array.isArray(record.expenses) ? record.expenses : example.expenses,
    debts: Array.isArray(record.debts) ? record.debts : example.debts,
    strategies: Array.isArray(record.strategies) && record.strategies.length > 0 ? record.strategies : example.strategies,
  };
}

export const SCENARIO_NAMES = [
  "Minimum Payment Strategy",
  "$2,000 Monthly Repayment",
  "Entire Paycheck Strategy",
  "Credit Card Consolidation",
  "Accelerated Debt Elimination",
] as const;
