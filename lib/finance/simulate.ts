import Decimal from "decimal.js";
import {
  addDays,
  addMonths,
  formatDisplayDate,
  isScheduledDay,
  isValidISODate,
  monthKey,
  monthsBetween,
} from "@/lib/finance/dates";
import {
  amortizingPaymentCents,
  centsToDollars,
  dailyInterestCents,
  divRoundHalfUp,
  maxCents,
  minCents,
  parseMoneyInput,
  parsePercentInput,
  portionCents,
  type Cents,
} from "@/lib/finance/money";
import { resolveRate, type RateContext } from "@/lib/finance/rates";
import { expandRecurring, mergeAmountMaps, type RecurringItem } from "@/lib/finance/schedule";
import type {
  ConsolidationPlan,
  DailyPoint,
  DebtInput,
  DebtSnapshot,
  DebtType,
  ExpenseInput,
  HelocInput,
  IncomeInput,
  MonthPoint,
  PlannerState,
  ShortfallEvent,
  ShortfallKind,
  SimulationOverrides,
  SimulationResult,
  StrategyInput,
  StrategyKind,
} from "@/lib/finance/types";

export class InputError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join(" "));
    this.name = "InputError";
    this.issues = issues;
  }
}

interface LiveDebt {
  id: string;
  creditor: string;
  type: DebtType;
  balance: Cents;
  accrued: Cents;
  aprPercent: number;
  aprScaled: bigint;
  minimum: Cents;
  limit: Cents | null;
  dueDay: number;
  includeInTransfer: boolean;
  startingBalance: Cents;
  transferredAmount: Cents;
  fullyTransferred: boolean;
  interestCharged: Cents;
  interestPaid: Cents;
  principalPaid: Cents;
}

interface ParsedRun {
  issues: string[];
  limit: Cents;
  openingBalance: Cents;
  dayCountDivisor: number;
  paymentDay: number;
  paymentStructure: HelocInput["paymentStructure"];
  statedMinimum: Cents;
  drawEnd: string;
  maturity: string;
  startDate: string;
  transactionOrder: HelocInput["transactionOrder"];
  capitalize: boolean;
  financeFees: boolean;
  originationFee: Cents;
  annualFee: Cents;
  drawFeeFlat: Cents;
  drawFeePercent: Decimal;
  earlyClosureFee: Cents;
  earlyClosureDeadline: string;
  checking: Cents;
  emergency: Cents;
  useEmergency: boolean;
  cushion: Cents;
  incomes: Map<string, Cents>;
  expenses: Map<string, Cents>;
  debts: LiveDebt[];
  rateBase: Omit<RateContext, "date">;
  strategy: StrategyInput;
  strategyKind: StrategyKind;
  strategyOverridden: boolean;
  additional: Cents;
  fixedTotal: Cents;
  partialMode: StrategyInput["partialMode"];
  partialPercent: Decimal;
  partialAmount: Cents;
  plan: ConsolidationPlan;
  transferDebts: boolean;
  avalanche: boolean;
  horizonEnd: string;
  includeDaily: boolean;
  dailyLimit: number;
  assumptions: string[];
}

/**
 * Day order, after the opening balance:
 * 1. Origination fee and selected debt transfers on the start date.
 * 2. Annual fee on anniversary dates.
 * 3. Income, then household expenses (or the reverse when withdrawals are first).
 * 4. Contractual HELOC payment, other debt payments, then an avalanche sweep.
 * 5. Interest for today on the ending principal, rounded half-up to the cent.
 * Promotional rates apply through the expiration date, inclusive.
 */
export function simulate(state: PlannerState, overrides: SimulationOverrides = {}): SimulationResult {
  const parsed = parseRun(state, overrides);
  if (parsed.issues.length > 0) {
    throw new InputError(parsed.issues);
  }
  return run(parsed);
}

function parseRun(state: PlannerState, overrides: SimulationOverrides): ParsedRun {
  const issues: string[] = [];
  const heloc = state.heloc;
  const limit = money(heloc.creditLimit, "HELOC credit limit", issues, { minExclusive: 0n });
  const openingBalance = money(heloc.currentBalance, "Current HELOC balance", issues, { min: 0n });
  const initialWithdrawal = money(heloc.initialWithdrawal, "Initial HELOC withdrawal", issues, { min: 0n });
  if (limit > 0n && openingBalance > limit) {
    issues.push("Current HELOC balance cannot exceed the credit limit.");
  }
  if (limit > 0n && initialWithdrawal > limit) {
    issues.push("Initial HELOC withdrawal cannot exceed the credit limit.");
  }

  const startDate = heloc.startDate;
  if (!isValidISODate(startDate)) issues.push("Starting simulation date is not a valid calendar date.");

  const paymentDay = whole(heloc.paymentDay, "HELOC payment day", issues, 1, 31);
  const drawMonths = whole(heloc.drawPeriodMonths, "Draw period", issues, 0, 600);
  const repayMonths = whole(heloc.repaymentPeriodMonths, "Repayment period", issues, 0, 600);
  if (drawMonths + repayMonths <= 0) {
    issues.push("Draw period and repayment period must cover at least one month.");
  }

  const initialRate = percent(heloc.initialAnnualPercent, "Initial interest rate", issues, 0, 100);
  const promoRate = percent(heloc.promoAnnualPercent, "Promotional interest rate", issues, 0, 100);
  const postRate = percent(heloc.postPromoAnnualPercent, "Post-promotional interest rate", issues, 0, 100);
  const cap = optionalPercent(heloc.rateCapPercent, "Interest rate cap", issues, 0, 100);
  const floor = optionalPercent(heloc.rateFloorPercent, "Interest rate floor", issues, 0, 100);
  const shock = percent(overrides.shockPercentPoints ?? "0", "Rate shock", issues, -30, 30);
  if (heloc.usePromo && !isValidISODate(heloc.promoExpiration)) {
    issues.push("Promotional rate expiration date is not a valid calendar date.");
  }

  const drawEnd = isValidISODate(startDate) ? addMonths(startDate, drawMonths) : startDate;
  const maturity = isValidISODate(startDate) ? addMonths(startDate, drawMonths + repayMonths) : startDate;
  let horizonEnd = maturity;
  if (overrides.horizonEnd) {
    if (!isValidISODate(overrides.horizonEnd)) issues.push("Horizon date is invalid.");
    else horizonEnd = overrides.horizonEnd < maturity ? overrides.horizonEnd : maturity;
  }

  const plan = overrides.consolidationPlan ?? state.consolidationPlan;
  const selected =
    state.strategies.find((strategy) => strategy.id === state.selectedStrategyId) ?? state.strategies[0];
  const requested = overrides.strategy ?? selected;
  if (!requested) issues.push("Choose a repayment strategy.");

  let strategyKind: StrategyKind = requested?.kind ?? "minimum";
  let strategyOverridden = false;
  if (plan === "avalanche" && strategyKind !== "minimum") {
    strategyKind = "minimum";
    strategyOverridden = true;
  }
  if (plan === "accelerated") {
    strategyKind = "fixed";
    strategyOverridden = requested?.kind !== "fixed" || requested.fixedMode !== "additional";
  }

  const additionalSource = plan === "accelerated" ? state.accelerationAmount : requested?.fixedAmount ?? "0";
  const additional = money(additionalSource, "Additional principal payment", issues, { min: 0n });
  const fixedTotal = money(requested?.fixedAmount ?? "0", "Fixed total payment", issues, { min: 0n });
  const partialPercent = percent(requested?.partialPercent ?? "0", "Paycheck contribution percent", issues, 0, 100);
  const partialAmount = money(requested?.partialAmount ?? "0", "Paycheck contribution amount", issues, { min: 0n });

  const incomes = new Map<string, Cents>();
  const expenses = new Map<string, Cents>();
  if (isValidISODate(startDate) && isValidISODate(horizonEnd)) {
    const incomeMaps = state.incomes.map((income) => {
      const amount = money(income.amount, `Income “${income.name || "Untitled"}”`, issues, { min: 0n });
      return expandRecurring(recurring(income, amount), startDate, horizonEnd);
    });
    const expenseMaps = state.expenses.map((expense) => {
      const amount = money(expense.amount, `Expense “${expense.name || "Untitled"}”`, issues, { min: 0n });
      return expandRecurring(recurring(expense, amount), startDate, horizonEnd);
    });
    for (const [date, amount] of mergeAmountMaps(incomeMaps)) incomes.set(date, amount);
    for (const [date, amount] of mergeAmountMaps(expenseMaps)) expenses.set(date, amount);
  }

  const debts = state.debts.map((debt) => parseDebt(debt, issues));
  const schedule = heloc.customSchedule.map((point) => {
    if (!isValidISODate(point.effectiveDate)) {
      issues.push("Each custom rate needs a valid effective date.");
    }
    percent(point.annualPercent, "Custom schedule rate", issues, 0, 100);
    return point;
  });

  const assumptions = [
    `Interest accrues every calendar day using ${heloc.dayCount}. Each day's interest is principal times the annual rate divided by ${heloc.dayCount === "actual/360" ? "360" : "365"}, rounded half-up to the cent.`,
    "Interest does not compound daily. On the payment date it is paid from cash, and unpaid interest is added to principal only up to the remaining credit limit.",
    "The promotional rate applies on every date through the expiration date, inclusive. The following day uses the post-promotional rate.",
    `Same-day transactions are applied ${heloc.transactionOrder === "deposits-first" ? "deposits first, then withdrawals" : "withdrawals first, then deposits"}. Interest uses the principal balance after those transactions.`,
    "Available credit equals the credit limit minus outstanding principal. Accrued, uncapitalized interest does not reduce available credit.",
    "Paycheck cycling deposits real income and redraws real expenses and other debt payments. It does not create income. Principal falls only by the net amount actually left in the line, minus interest and fees.",
    "The HELOC's own interest is not paid by borrowing from the same line. Unpaid interest is added to principal and remains debt.",
    "When the HELOC principal and accrued interest both reach zero, the line is treated as closed. Later expenses are paid from checking and are not borrowed again.",
    "Transferring a balance to the HELOC converts unsecured debt into debt secured by the home. It does not erase the debt.",
    "Consumer-debt interest in this model also accrues daily and is capitalized into that balance when a payment does not cover it. Lender billing methods vary.",
    "No credit-score change is estimated. Scoring depends on the lender's reporting and the scoring model.",
    "This is an educational model, not a lender disclosure, loan offer, or personal financial advice.",
  ];

  return {
    issues,
    limit,
    openingBalance,
    dayCountDivisor: heloc.dayCount === "actual/360" ? 360 : 365,
    paymentDay,
    paymentStructure: heloc.paymentStructure,
    statedMinimum: money(heloc.statedMinimumPayment, "Stated minimum payment", issues, { min: 0n }),
    drawEnd,
    maturity,
    startDate,
    transactionOrder: heloc.transactionOrder,
    capitalize: heloc.capitalizeUnpaidInterest,
    financeFees: heloc.financeFees,
    originationFee: money(heloc.originationFee, "Origination fee", issues, { min: 0n }),
    annualFee: money(heloc.annualFee, "Annual fee", issues, { min: 0n }),
    drawFeeFlat: money(heloc.drawFeeFlat, "Draw fee", issues, { min: 0n }),
    drawFeePercent: percent(heloc.drawFeePercent, "Draw fee percent", issues, 0, 100),
    earlyClosureFee: money(heloc.earlyClosureFee, "Early closure fee", issues, { min: 0n }),
    earlyClosureDeadline: isValidISODate(startDate)
      ? addMonths(startDate, whole(heloc.earlyClosureWithinMonths, "Early closure window", issues, 0, 600))
      : startDate,
    checking: money(state.startingChecking, "Starting checking balance", issues, { min: 0n }),
    emergency: money(state.emergencyFund, "Emergency fund", issues, { min: 0n }),
    useEmergency: state.useEmergencyFundForShortfalls,
    cushion: money(state.checkingCushion, "Checking cushion", issues, { min: 0n }),
    incomes,
    expenses,
    debts,
    rateBase: {
      initialAnnualPercent: initialRate,
      usePromo: heloc.usePromo,
      promoAnnualPercent: promoRate,
      promoExpiration: heloc.promoExpiration,
      postPromoAnnualPercent: postRate,
      rateCapPercent: cap,
      rateFloorPercent: floor,
      shockPercentPoints: shock,
      applyShockDuringPromo: overrides.applyShockDuringPromo ?? heloc.applyShockDuringPromo,
      ignorePromo: overrides.ignorePromo ?? false,
      customSchedule: schedule,
      useCustomSchedule: overrides.useCustomSchedule ?? true,
    },
    strategy: requested ?? {
      id: "minimum",
      name: "Minimum payments",
      kind: "minimum",
      fixedMode: "additional",
      fixedAmount: "0",
      partialMode: "percent",
      partialPercent: "0",
      partialAmount: "0",
    },
    strategyKind,
    strategyOverridden,
    additional,
    fixedTotal,
    partialMode: requested?.partialMode ?? "percent",
    partialPercent,
    partialAmount,
    plan,
    transferDebts: plan === "transfer" || plan === "accelerated",
    avalanche: plan === "avalanche",
    horizonEnd,
    includeDaily: overrides.includeDaily ?? false,
    dailyLimit: overrides.dailyLimit ?? 120,
    assumptions,
  };
}

function run(parsed: ParsedRun): SimulationResult {
  let principal = parsed.openingBalance;
  let accrued: Cents = 0n;
  let checking = parsed.checking;
  let emergency = parsed.emergency;
  let totalInterest: Cents = 0n;
  let totalInterestPaid: Cents = 0n;
  let totalCapitalized: Cents = 0n;
  let totalPrincipalPaid: Cents = 0n;
  let totalFees: Cents = 0n;
  let totalFeesFinanced: Cents = 0n;
  let totalDraws: Cents = 0n;
  let totalDeposits: Cents = 0n;
  let principalBalanceSum: Cents = 0n;
  let days = 0;
  let cycleNetIncrease: Cents = 0n;
  let canMeet = true;
  let capacityExhausted = false;
  let shortfallCount = 0;
  let shortfallTotal: Cents = 0n;
  let capitalizationEvents = 0;
  let firstPayment: Cents | null = null;
  let warnedFixedShort = false;
  let earlyFeeCharged = false;
  let payoffDate: string | null = null;
  let lineClosed = false;
  let maturedWithBalance = false;
  const warnings: string[] = [];
  const shortfalls: ShortfallEvent[] = [];
  const monthly: MonthPoint[] = [];
  const daily: DailyPoint[] = [];

  let monthInterest: Cents = 0n;
  let monthInterestPaid: Cents = 0n;
  let monthPrincipal: Cents = 0n;
  let monthDraws: Cents = 0n;
  let monthFees: Cents = 0n;
  let monthLabel = monthKey(parsed.startDate);

  const debts = parsed.debts;
  const householdStart = parsed.openingBalance + debts.reduce((sum, debt) => sum + debt.startingBalance, 0n);
  let householdAfterTransfer = householdStart;

  const record = (date: string, kind: ShortfallKind, amount: Cents, detail: string) => {
    if (amount <= 0n) return;
    shortfallCount += 1;
    shortfallTotal += amount;
    canMeet = false;
    if (kind === "credit-limit" || kind === "draw-period-closed") capacityExhausted = true;
    if (shortfalls.length < 12) {
      shortfalls.push({ date, kind, amount: centsToDollars(amount), detail });
    }
  };

  const takeCash = (amount: Cents): Cents => {
    if (amount <= 0n) return 0n;
    const fromChecking = minCents(checking, amount);
    checking -= fromChecking;
    let paid = fromChecking;
    const need = amount - paid;
    if (need > 0n && parsed.useEmergency) {
      const fromEmergency = minCents(emergency, need);
      emergency -= fromEmergency;
      paid += fromEmergency;
    }
    return paid;
  };

  const chargeFee = (date: string, amount: Cents, label: string) => {
    if (amount <= 0n) return;
    totalFees += amount;
    monthFees += amount;
    if (!parsed.financeFees) {
      const paid = takeCash(amount);
      const unpaid = amount - paid;
      if (unpaid <= 0n) return;
      const room = maxCents(0n, parsed.limit - principal);
      const financed = minCents(unpaid, room);
      principal += financed;
      totalFeesFinanced += financed;
      cycleNetIncrease += financed;
      if (financed < unpaid) record(date, "heloc-payment-short", unpaid - financed, label);
      else warnings.push(`${label} on ${formatDisplayDate(date)} was added to the HELOC because cash did not cover it.`);
      return;
    }
    const room = maxCents(0n, parsed.limit - principal);
    const financed = minCents(amount, room);
    principal += financed;
    totalFeesFinanced += financed;
    cycleNetIncrease += financed;
    const remainder = amount - financed;
    if (remainder > 0n) {
      const paid = takeCash(remainder);
      if (paid < remainder) record(date, "heloc-payment-short", remainder - paid, label);
    }
  };

  const reducePrincipal = (amount: Cents, source: "deposit" | "payment"): Cents => {
    if (amount <= 0n || principal <= 0n) return 0n;
    const applied = minCents(amount, principal);
    principal -= applied;
    totalPrincipalPaid += applied;
    monthPrincipal += applied;
    cycleNetIncrease -= applied;
    if (source === "deposit") totalDeposits += applied;
    return applied;
  };

  const draw = (
    date: string,
    requested: Cents,
  ): { drawn: Cents; unmet: Cents; reason: "ok" | "credit-limit" | "draw-period-closed" } => {
    if (requested <= 0n) return { drawn: 0n, unmet: 0n, reason: "ok" };
    if (date >= parsed.drawEnd) {
      return { drawn: 0n, unmet: requested, reason: "draw-period-closed" };
    }
    const room = parsed.limit - principal;
    if (room <= 0n) return { drawn: 0n, unmet: requested, reason: "credit-limit" };

    let drawn = 0n;
    let fee: Cents = 0n;
    if (parsed.drawFeePercent.lte(0)) {
      if (room > parsed.drawFeeFlat) {
        drawn = minCents(requested, room - parsed.drawFeeFlat);
        fee = drawn > 0n ? parsed.drawFeeFlat : 0n;
      }
    } else {
      const roomAfterFlat = room - parsed.drawFeeFlat;
      if (roomAfterFlat > 0n) {
        const maxDrawn = new Decimal(roomAfterFlat.toString())
          .div(100)
          .div(parsed.drawFeePercent.div(100).plus(1));
        drawn = minCents(requested, parseMoneyInput(maxDrawn.toFixed(8)).cents);
        fee = parsed.drawFeeFlat + portionCents(drawn, parsed.drawFeePercent);
        while (drawn > 0n && drawn + fee > room) {
          drawn -= 1n;
          fee = parsed.drawFeeFlat + portionCents(drawn, parsed.drawFeePercent);
        }
      }
    }

    if (drawn <= 0n) return { drawn: 0n, unmet: requested, reason: "credit-limit" };
    principal += drawn + fee;
    cycleNetIncrease += drawn + fee;
    totalDraws += drawn;
    monthDraws += drawn;
    if (fee > 0n) {
      totalFees += fee;
      totalFeesFinanced += fee;
      monthFees += fee;
    }
    const unmet = requested - drawn;
    if (unmet > 0n) capacityExhausted = true;
    return { drawn, unmet, reason: unmet > 0n ? "credit-limit" : "ok" };
  };

  const applyHelocPayment = (paid: Cents) => {
    const toInterest = minCents(paid, accrued);
    accrued -= toInterest;
    totalInterestPaid += toInterest;
    monthInterestPaid += toInterest;
    const toPrincipal = paid - toInterest;
    if (toPrincipal > 0n) reducePrincipal(toPrincipal, "payment");
  };

  const applyDebtPayment = (debt: LiveDebt, paid: Cents) => {
    const toInterest = minCents(paid, debt.accrued);
    debt.accrued -= toInterest;
    debt.interestPaid += toInterest;
    const toPrincipal = minCents(paid - toInterest, debt.balance);
    debt.balance -= toPrincipal;
    debt.principalPaid += toPrincipal;
  };

  const rateFor = (date: string) => resolveRate({ ...parsed.rateBase, date });
  const rateAtStart = rateFor(parsed.startDate);

  if (parsed.strategyOverridden && parsed.plan === "avalanche") {
    warnings.push("The avalanche comparison pays only the HELOC minimum, then sends surplus cash to the highest-rate balance.");
  }
  if (parsed.strategyOverridden && parsed.plan === "accelerated") {
    warnings.push("Accelerated consolidation uses a fixed additional principal payment and transfers the selected balances.");
  }

  let date = parsed.startDate;
  while (date <= parsed.horizonEnd) {
    if (monthKey(date) !== monthLabel) {
      monthLabel = monthKey(date);
      monthInterest = 0n;
      monthInterestPaid = 0n;
      monthPrincipal = 0n;
      monthDraws = 0n;
      monthFees = 0n;
    }

    const rate = rateFor(date);
    let dayDeposits: Cents = 0n;
    let dayDraws: Cents = 0n;

    if (date === parsed.startDate) {
      chargeFee(date, parsed.originationFee, "Origination fee");
      if (parsed.transferDebts) {
        const selected = debts
          .filter((debt) => debt.includeInTransfer && debt.balance > 0n)
          .sort((a, b) => b.aprPercent - a.aprPercent);
        if (selected.length === 0) {
          warnings.push("No debts are selected to transfer, so this plan does not move balances onto the HELOC.");
        }
        for (const debt of selected) {
          const result = draw(date, debt.balance);
          debt.balance -= result.drawn;
          debt.transferredAmount += result.drawn;
          dayDraws += result.drawn;
          if (debt.balance === 0n) debt.fullyTransferred = true;
          if (result.unmet > 0n) {
            record(date, result.reason === "ok" ? "credit-limit" : result.reason, result.unmet, `Could not fully transfer ${debt.creditor}`);
          }
        }
      }
      householdAfterTransfer = principal + accrued;
      for (const debt of debts) householdAfterTransfer += debt.balance + debt.accrued;
    }

    const anniversary =
      date > parsed.startDate && addMonths(parsed.startDate, monthsBetween(parsed.startDate, date)) === date &&
      monthsBetween(parsed.startDate, date) > 0 &&
      monthsBetween(parsed.startDate, date) % 12 === 0;
    if (anniversary && (principal > 0n || accrued > 0n)) {
      chargeFee(date, parsed.annualFee, "Annual fee");
    }

    const income = parsed.incomes.get(date) ?? 0n;
    const expense = parsed.expenses.get(date) ?? 0n;
    const applyIncome = () => {
      if (income <= 0n) return;
      if (!lineClosed && (parsed.strategyKind === "full-paycheck" || parsed.strategyKind === "partial-paycheck")) {
        const toHeloc =
          parsed.strategyKind === "full-paycheck"
            ? income
            : parsed.partialMode === "amount"
              ? minCents(income, parsed.partialAmount)
              : portionCents(income, parsed.partialPercent);
        checking += income - toHeloc;
        const applied = reducePrincipal(toHeloc, "deposit");
        dayDeposits += applied;
        const leftover = toHeloc - applied;
        if (leftover > 0n) checking += leftover;
      } else {
        checking += income;
      }
    };
    const applyExpenses = () => {
      if (expense <= 0n) return;
      if (!lineClosed && parsed.strategyKind === "full-paycheck") {
        const result = draw(date, expense);
        dayDraws += result.drawn;
        if (result.unmet > 0n) {
          record(date, result.reason === "ok" ? "expense-unpaid" : result.reason, result.unmet, "Household expense");
        }
        return;
      }
      const paid = takeCash(expense);
      const gap = expense - paid;
      if (gap > 0n && lineClosed) {
        record(date, "expense-unpaid", gap, "Household expense after the HELOC was closed");
        return;
      }
      if (gap > 0n) {
        const result = draw(date, gap);
        dayDraws += result.drawn;
        if (result.unmet > 0n) {
          record(
            date,
            result.reason === "draw-period-closed" ? "draw-period-closed" : "credit-limit",
            result.unmet,
            "Household expense",
          );
        }
      }
    };

    if (parsed.transactionOrder === "withdrawals-first") {
      applyExpenses();
      applyIncome();
    } else {
      applyIncome();
      applyExpenses();
    }

    if (!lineClosed && isScheduledDay(date, parsed.paymentDay) && date !== parsed.startDate) {
      const interestDue = accrued;
      const monthsLeft = monthsBetween(date, parsed.maturity);
      let required: Cents;
      if (monthsLeft <= 0) required = principal + interestDue;
      else if (date < parsed.drawEnd && parsed.paymentStructure === "interest-only") {
        required = maxCents(parsed.statedMinimum, interestDue);
      } else {
        const amort = amortizingPaymentCents(principal, rate.percent, Math.max(monthsLeft, 1));
        required = maxCents(parsed.statedMinimum, maxCents(amort, interestDue));
      }
      required = minCents(required, principal + interestDue);
      const principalPortion = maxCents(0n, required - interestDue);
      const prepaid = maxCents(0n, -cycleNetIncrease);
      const principalStill = maxCents(0n, principalPortion - prepaid);

      let due = interestDue + principalStill;
      const additionalMode =
        parsed.strategyKind === "fixed" &&
        (parsed.plan === "accelerated" || parsed.strategy.fixedMode === "additional");
      if (additionalMode) {
        due = interestDue + principalStill + parsed.additional;
      } else if (parsed.strategyKind === "fixed" && parsed.strategy.fixedMode === "total") {
        if (parsed.fixedTotal < required && !warnedFixedShort) {
          warnings.push(
            "The requested fixed payment is below the required HELOC payment in at least one month. The model schedules the required payment instead.",
          );
          warnedFixedShort = true;
        }
        due = maxCents(required, parsed.fixedTotal);
      }
      due = minCents(due, principal + interestDue);
      if (firstPayment === null && due > 0n) firstPayment = due;

      const paid = takeCash(due);
      if (paid < due) record(date, "heloc-payment-short", due - paid, "HELOC payment");
      applyHelocPayment(paid);
      if (parsed.capitalize && accrued > 0n) {
        const room = maxCents(0n, parsed.limit - principal);
        const capitalized = minCents(accrued, room);
        if (capitalized > 0n) {
          principal += capitalized;
          accrued -= capitalized;
          totalCapitalized += capitalized;
          cycleNetIncrease += capitalized;
          capitalizationEvents += 1;
        }
      }
      cycleNetIncrease = 0n;
    }

    for (const debt of debts) {
      if (debt.balance <= 0n && debt.accrued <= 0n) continue;
      if (!isScheduledDay(date, debt.dueDay) || date === parsed.startDate) continue;
      const payoff = debt.balance + debt.accrued;
      const due = minCents(debt.minimum, payoff);
      const paidCash = takeCash(due);
      let paid = paidCash;
      const gap = due - paidCash;
      if (gap > 0n && !lineClosed && (parsed.strategyKind === "full-paycheck" || parsed.strategyKind === "partial-paycheck")) {
        const drawn = draw(date, gap);
        dayDraws += drawn.drawn;
        paid += drawn.drawn;
        if (drawn.unmet > 0n) {
          record(date, drawn.reason === "draw-period-closed" ? "draw-period-closed" : "credit-limit", drawn.unmet, debt.creditor);
        }
      } else if (gap > 0n) {
        record(date, "debt-payment-short", gap, debt.creditor);
      }
      applyDebtPayment(debt, paid);
      if (debt.accrued > 0n) {
        debt.balance += debt.accrued;
        debt.accrued = 0n;
      }
    }

    if (parsed.avalanche && isScheduledDay(date, parsed.paymentDay) && date !== parsed.startDate) {
      const spare = checking - parsed.cushion;
      if (spare > 0n) {
        const targets: { apr: number; kind: "heloc" | "debt"; debt?: LiveDebt; owed: Cents }[] = [];
        if (principal + accrued > 0n) {
          targets.push({ apr: rate.percent, kind: "heloc", owed: principal + accrued });
        }
        for (const debt of debts) {
          const owed = debt.balance + debt.accrued;
          if (owed > 0n) targets.push({ apr: debt.aprPercent, kind: "debt", debt, owed });
        }
        targets.sort((a, b) => b.apr - a.apr);
        const top = targets[0];
        if (top) {
          const paid = takeCash(minCents(spare, top.owed));
          if (top.kind === "heloc") applyHelocPayment(paid);
          else if (top.debt) applyDebtPayment(top.debt, paid);
        }
      }
    }

    let interestToday: Cents = 0n;
    if (principal > 0n) {
      interestToday = dailyInterestCents(principal, rate.scaled, parsed.dayCountDivisor);
      accrued += interestToday;
      totalInterest += interestToday;
      monthInterest += interestToday;
    }
    for (const debt of debts) {
      if (debt.balance <= 0n) continue;
      const interest = dailyInterestCents(debt.balance, debt.aprScaled, parsed.dayCountDivisor);
      debt.accrued += interest;
      debt.interestCharged += interest;
    }

    principalBalanceSum += principal;
    days += 1;

    const debtsSettled = debts.every((debt) => debt.balance === 0n && debt.accrued === 0n);
    const helocSettled = principal === 0n && accrued === 0n;
    if (helocSettled && payoffDate === null) {
      payoffDate = date;
      lineClosed = true;
      if (!earlyFeeCharged && parsed.earlyClosureFee > 0n && date < parsed.earlyClosureDeadline) {
        earlyFeeCharged = true;
        totalFees += parsed.earlyClosureFee;
        monthFees += parsed.earlyClosureFee;
        const paid = takeCash(parsed.earlyClosureFee);
        if (paid < parsed.earlyClosureFee) {
          record(date, "heloc-payment-short", parsed.earlyClosureFee - paid, "Early closure fee");
        }
      }
    }

    if (parsed.includeDaily && daily.length < parsed.dailyLimit) {
      const available = maxCents(0n, parsed.limit - principal);
      daily.push({
        date,
        principal: centsToDollars(principal),
        accruedInterest: centsToDollars(accrued),
        availableCredit: centsToDollars(available),
        interestToday: centsToDollars(interestToday),
        checking: centsToDollars(checking),
        ratePercent: rate.percent,
        deposits: centsToDollars(dayDeposits),
        draws: centsToDollars(dayDraws),
      });
    }

    const next = addDays(date, 1);
    const finished = (helocSettled && debtsSettled) || date === parsed.horizonEnd;
    const monthEnded = monthKey(next) !== monthKey(date) || finished;
    if (monthEnded) {
      const position = debtPosition(principal, accrued, debts);
      const available = maxCents(0n, parsed.limit - principal);
      monthly.push({
        month: monthKey(date),
        endingPrincipal: centsToDollars(principal),
        availableCredit: centsToDollars(available),
        utilization: parsed.limit > 0n ? Number(principal) / Number(parsed.limit) : 0,
        interestCharged: centsToDollars(monthInterest),
        interestPaid: centsToDollars(monthInterestPaid),
        principalPaid: centsToDollars(monthPrincipal),
        draws: centsToDollars(monthDraws),
        fees: centsToDollars(monthFees),
        endingChecking: centsToDollars(checking),
        householdDebt: centsToDollars(position.total),
        securedDebt: centsToDollars(position.secured),
        unsecuredDebt: centsToDollars(position.unsecured),
        ratePercent: rate.percent,
      });
    }

    if (finished) {
      if (date === parsed.maturity && (principal > 0n || accrued > 0n)) maturedWithBalance = true;
      break;
    }
    date = next;
  }

  if (capitalizationEvents > 0) {
    warnings.push(
      `Unpaid HELOC interest was added to principal on ${capitalizationEvents} payment date${capitalizationEvents === 1 ? "" : "s"}, totaling ${centsToDollars(totalCapitalized).toLocaleString("en-US", { style: "currency", currency: "USD" })}. That interest is still debt.`,
    );
  }
  if (maturedWithBalance) {
    warnings.push("The HELOC still had a balance when the contractual term ended.");
  }
  if (!canMeet) {
    warnings.push("At least one required payment or household expense could not be fully covered.");
  }

  const ending = debtPosition(principal, accrued, debts);
  const available = maxCents(0n, parsed.limit - principal);
  const rateAtEnd = rateFor(date);

  return {
    strategyId: parsed.strategy.id,
    strategyName: parsed.strategy.name,
    consolidationPlan: parsed.plan,
    payoffDate,
    payoffLabel: payoffDate ? formatDisplayDate(payoffDate) : `Not paid off by ${formatDisplayDate(parsed.maturity)}`,
    paidOff: payoffDate !== null,
    maturedWithBalance,
    maturityDate: parsed.maturity,
    startingPrincipal: centsToDollars(parsed.openingBalance),
    endingPrincipal: centsToDollars(principal),
    endingAccruedInterest: centsToDollars(accrued),
    payoffAmount: centsToDollars(principal + accrued),
    availableCredit: centsToDollars(available),
    utilization: parsed.limit > 0n ? Number(principal) / Number(parsed.limit) : 0,
    totalInterestCharged: centsToDollars(totalInterest),
    totalInterestPaid: centsToDollars(totalInterestPaid),
    totalInterestCapitalized: centsToDollars(totalCapitalized),
    totalPrincipalPaid: centsToDollars(totalPrincipalPaid),
    totalFees: centsToDollars(totalFees),
    totalFeesFinanced: centsToDollars(totalFeesFinanced),
    totalBorrowingCost: centsToDollars(totalInterest + totalFees),
    totalDraws: centsToDollars(totalDraws),
    totalDeposits: centsToDollars(totalDeposits),
    averageDailyBalance: days > 0 ? centsToDollars(divRoundHalfUp(principalBalanceSum, BigInt(days))) : 0,
    daysSimulated: days,
    firstHelocPayment: firstPayment === null ? null : centsToDollars(firstPayment),
    canMeetObligations: canMeet,
    borrowingCapacityExhausted: capacityExhausted,
    shortfallCount,
    shortfallTotal: centsToDollars(shortfallTotal),
    capitalizationEvents,
    householdDebtStart: centsToDollars(householdStart),
    householdDebtAfterTransfer: centsToDollars(householdAfterTransfer),
    householdDebtEnd: centsToDollars(ending.total),
    securedDebtEnd: centsToDollars(ending.secured),
    unsecuredDebtEnd: centsToDollars(ending.unsecured),
    endingChecking: centsToDollars(checking),
    endingEmergency: centsToDollars(emergency),
    rateAtStart: rateAtStart.percent,
    rateAtEnd: rateAtEnd.percent,
    effectiveStrategyKind: parsed.strategyKind,
    strategyBehaviorOverridden: parsed.strategyOverridden,
    warnings: unique(warnings),
    assumptions: parsed.assumptions,
    monthly,
    daily,
    debts: debts.map(snapshotDebt),
    shortfalls,
  };
}

function debtPosition(principal: Cents, accrued: Cents, debts: LiveDebt[]) {
  let unsecured = 0n;
  for (const debt of debts) unsecured += debt.balance + debt.accrued;
  const secured = principal + accrued;
  return { secured, unsecured, total: secured + unsecured };
}

function snapshotDebt(debt: LiveDebt): DebtSnapshot {
  const utilization = (balance: Cents) =>
    debt.limit && debt.limit > 0n ? Number(balance) / Number(debt.limit) : null;
  return {
    id: debt.id,
    creditor: debt.creditor,
    type: debt.type,
    startingBalance: centsToDollars(debt.startingBalance),
    endingBalance: centsToDollars(debt.balance + debt.accrued),
    creditLimit: debt.limit === null ? null : centsToDollars(debt.limit),
    startingUtilization: utilization(debt.startingBalance),
    endingUtilization: utilization(debt.balance + debt.accrued),
    interestCharged: centsToDollars(debt.interestCharged),
    transferred: debt.fullyTransferred,
    amountTransferred: centsToDollars(debt.transferredAmount),
    paidOff: debt.balance === 0n && debt.accrued === 0n,
  };
}

function parseDebt(debt: DebtInput, issues: string[]): LiveDebt {
  const label = debt.creditor || "Untitled debt";
  const balance = money(debt.balance, `${label} balance`, issues, { min: 0n });
  const apr = percent(debt.apr, `${label} APR`, issues, 0, 100);
  const minimum = money(debt.minimumPayment, `${label} minimum payment`, issues, { min: 0n });
  const limitRaw = debt.creditLimit.trim();
  const limit = limitRaw ? money(debt.creditLimit, `${label} credit limit`, issues, { min: 0n }) : null;
  const dueDay = whole(debt.dueDay, `${label} due day`, issues, 1, 31);
  return {
    id: debt.id,
    creditor: debt.creditor || "Untitled debt",
    type: debt.type,
    balance,
    accrued: 0n,
    aprPercent: apr.toNumber(),
    aprScaled: parseMoneyRate(apr),
    minimum,
    limit,
    dueDay,
    includeInTransfer: debt.includeInTransfer,
    startingBalance: balance,
    transferredAmount: 0n,
    fullyTransferred: false,
    interestCharged: 0n,
    interestPaid: 0n,
    principalPaid: 0n,
  };
}

function parseMoneyRate(percentValue: Decimal): bigint {
  return portionScale(percentValue);
}

function portionScale(percentValue: Decimal): bigint {
  return BigInt(
    percentValue.div(100).mul("1000000000000").toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0),
  );
}

function recurring(item: IncomeInput | ExpenseInput, amount: Cents): RecurringItem {
  return {
    amount,
    frequency: item.frequency,
    anchorDate: item.anchorDate,
    dayOfMonth: positiveInt(item.dayOfMonth, 1),
    firstDay: positiveInt(item.firstDay, 1),
    secondDay: positiveInt(item.secondDay, 15),
  };
}

function money(
  value: string,
  label: string,
  issues: string[],
  bounds: { min?: Cents; minExclusive?: Cents },
): Cents {
  const parsed = parseMoneyInput(value);
  if (!parsed.ok) {
    issues.push(`${label} must be a dollar amount.`);
    return 0n;
  }
  if (bounds.min !== undefined && parsed.cents < bounds.min) {
    issues.push(`${label} cannot be negative.`);
    return 0n;
  }
  if (bounds.minExclusive !== undefined && parsed.cents <= bounds.minExclusive) {
    issues.push(`${label} must be greater than zero.`);
    return 0n;
  }
  return parsed.cents;
}

function percent(value: string, label: string, issues: string[], min: number, max: number): Decimal {
  const parsed = parsePercentInput(value);
  if (!parsed.ok || parsed.percent.lt(min) || parsed.percent.gt(max)) {
    issues.push(`${label} must be between ${min} and ${max}.`);
    return new Decimal(0);
  }
  return parsed.percent;
}

function optionalPercent(
  value: string,
  label: string,
  issues: string[],
  min: number,
  max: number,
): Decimal | null {
  if (value.trim() === "") return null;
  return percent(value, label, issues, min, max);
}

function whole(value: string, label: string, issues: string[], min: number, max: number): number {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    issues.push(`${label} must be a whole number.`);
    return min;
  }
  const parsed = Number(trimmed);
  if (parsed < min || parsed > max) {
    issues.push(`${label} must be between ${min} and ${max}.`);
    return min;
  }
  return parsed;
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) return fallback;
  return parsed;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
