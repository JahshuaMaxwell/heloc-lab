export type DayCount = "actual/365" | "actual/360";

export type PaymentStructure = "interest-only" | "principal-and-interest";

export type TransactionOrder = "deposits-first" | "withdrawals-first";

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export type ExpenseFrequency = PayFrequency | "annual";

export type ExpenseCategory =
  | "mortgage"
  | "utilities"
  | "transportation"
  | "insurance"
  | "groceries"
  | "other"
  | "variable";

export type DebtType =
  | "credit-card"
  | "personal-loan"
  | "student-loan"
  | "auto"
  | "other";

export type StrategyKind = "minimum" | "fixed" | "full-paycheck" | "partial-paycheck";

export type FixedPaymentMode = "total" | "additional";

export type PartialMode = "percent" | "amount";

export type ConsolidationPlan = "continue" | "transfer" | "avalanche" | "accelerated";

export interface RatePoint {
  id: string;
  effectiveDate: string;
  annualPercent: string;
}

export interface HelocInput {
  creditLimit: string;
  initialWithdrawal: string;
  currentBalance: string;
  initialAnnualPercent: string;
  usePromo: boolean;
  promoAnnualPercent: string;
  promoExpiration: string;
  postPromoAnnualPercent: string;
  rateCapPercent: string;
  rateFloorPercent: string;
  statedMinimumPayment: string;
  paymentStructure: PaymentStructure;
  drawPeriodMonths: string;
  repaymentPeriodMonths: string;
  originationFee: string;
  annualFee: string;
  drawFeeFlat: string;
  drawFeePercent: string;
  earlyClosureFee: string;
  earlyClosureWithinMonths: string;
  startDate: string;
  paymentDay: string;
  dayCount: DayCount;
  transactionOrder: TransactionOrder;
  capitalizeUnpaidInterest: boolean;
  financeFees: boolean;
  applyShockDuringPromo: boolean;
  customSchedule: RatePoint[];
}

export interface IncomeInput {
  id: string;
  name: string;
  amount: string;
  frequency: PayFrequency;
  anchorDate: string;
  dayOfMonth: string;
  firstDay: string;
  secondDay: string;
}

export interface ExpenseInput {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: string;
  frequency: ExpenseFrequency;
  anchorDate: string;
  dayOfMonth: string;
  firstDay: string;
  secondDay: string;
}

export interface DebtInput {
  id: string;
  creditor: string;
  balance: string;
  apr: string;
  minimumPayment: string;
  creditLimit: string;
  dueDay: string;
  includeInTransfer: boolean;
  type: DebtType;
}

export interface StrategyInput {
  id: string;
  name: string;
  kind: StrategyKind;
  fixedMode: FixedPaymentMode;
  fixedAmount: string;
  partialMode: PartialMode;
  partialPercent: string;
  partialAmount: string;
}

export interface PlannerState {
  version: 1;
  scenarioId: string;
  scenarioName: string;
  heloc: HelocInput;
  incomes: IncomeInput[];
  expenses: ExpenseInput[];
  emergencyFund: string;
  startingChecking: string;
  useEmergencyFundForShortfalls: boolean;
  checkingCushion: string;
  debts: DebtInput[];
  strategies: StrategyInput[];
  selectedStrategyId: string;
  consolidationPlan: ConsolidationPlan;
  accelerationAmount: string;
  stressDecreasePercent: string;
}

export interface MonthPoint {
  month: string;
  endingPrincipal: number;
  availableCredit: number;
  utilization: number;
  interestCharged: number;
  interestPaid: number;
  principalPaid: number;
  draws: number;
  fees: number;
  endingChecking: number;
  householdDebt: number;
  securedDebt: number;
  unsecuredDebt: number;
  ratePercent: number;
}

export interface DailyPoint {
  date: string;
  principal: number;
  accruedInterest: number;
  availableCredit: number;
  interestToday: number;
  checking: number;
  ratePercent: number;
  deposits: number;
  draws: number;
}

export interface DebtSnapshot {
  id: string;
  creditor: string;
  type: DebtType;
  startingBalance: number;
  endingBalance: number;
  creditLimit: number | null;
  startingUtilization: number | null;
  endingUtilization: number | null;
  interestCharged: number;
  transferred: boolean;
  amountTransferred: number;
  paidOff: boolean;
}

export type ShortfallKind =
  | "expense-unpaid"
  | "heloc-payment-short"
  | "debt-payment-short"
  | "credit-limit"
  | "draw-period-closed";

export interface ShortfallEvent {
  date: string;
  kind: ShortfallKind;
  amount: number;
  detail: string;
}

export interface SimulationResult {
  strategyId: string;
  strategyName: string;
  consolidationPlan: ConsolidationPlan;
  payoffDate: string | null;
  payoffLabel: string;
  paidOff: boolean;
  maturedWithBalance: boolean;
  maturityDate: string;
  startingPrincipal: number;
  endingPrincipal: number;
  endingAccruedInterest: number;
  payoffAmount: number;
  availableCredit: number;
  utilization: number;
  totalInterestCharged: number;
  totalInterestPaid: number;
  totalInterestCapitalized: number;
  totalPrincipalPaid: number;
  totalFees: number;
  totalFeesFinanced: number;
  totalBorrowingCost: number;
  totalDraws: number;
  totalDeposits: number;
  averageDailyBalance: number;
  daysSimulated: number;
  firstHelocPayment: number | null;
  canMeetObligations: boolean;
  borrowingCapacityExhausted: boolean;
  shortfallCount: number;
  shortfallTotal: number;
  capitalizationEvents: number;
  householdDebtStart: number;
  householdDebtAfterTransfer: number;
  householdDebtEnd: number;
  securedDebtEnd: number;
  unsecuredDebtEnd: number;
  endingChecking: number;
  endingEmergency: number;
  rateAtStart: number;
  rateAtEnd: number;
  effectiveStrategyKind: StrategyKind;
  strategyBehaviorOverridden: boolean;
  warnings: string[];
  assumptions: string[];
  monthly: MonthPoint[];
  daily: DailyPoint[];
  debts: DebtSnapshot[];
  shortfalls: ShortfallEvent[];
}

export interface SimulationOverrides {
  strategy?: StrategyInput;
  consolidationPlan?: ConsolidationPlan;
  shockPercentPoints?: string;
  ignorePromo?: boolean;
  useCustomSchedule?: boolean;
  horizonEnd?: string;
  includeDaily?: boolean;
  dailyLimit?: number;
  applyShockDuringPromo?: boolean;
}

export interface CashFlowSummary {
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageMonthlyDebtMinimums: number;
  averageMonthlySurplusBeforeHeloc: number;
  nextPayDates: { name: string; date: string; amount: number }[];
}

export interface PointInTime {
  initialUtilization: number | null;
  currentUtilization: number | null;
  availableCredit: number;
  dailyInterest: number;
  monthlyInterest: number;
  ratePercent: number;
  rateLabel: string;
  issue: string | null;
}
