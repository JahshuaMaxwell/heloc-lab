import { describe, expect, it } from "vitest";
import { minimalPlanner, strategy } from "@/lib/finance/defaults";
import { dailyInterestCents, parseCents, percentToScaled } from "@/lib/finance/money";
import { resolveRate } from "@/lib/finance/rates";
import { simulate } from "@/lib/finance/simulate";
import type { PlannerState, StrategyInput } from "@/lib/finance/types";
import Decimal from "decimal.js";

function run(state: PlannerState, strategyInput?: StrategyInput, horizonEnd?: string) {
  return simulate(state, {
    strategy: strategyInput,
    horizonEnd,
    includeDaily: true,
    dailyLimit: 400,
    useCustomSchedule: false,
  });
}

function accountingGap(result: ReturnType<typeof simulate>): number {
  const expected =
    result.startingPrincipal +
    result.totalDraws +
    result.totalFeesFinanced +
    result.totalInterestCapitalized -
    result.totalPrincipalPaid;
  return Math.round((result.endingPrincipal - expected) * 100);
}

describe("HELOC credit availability", () => {
  it("gives a $150,000 line with a $75,000 balance $75,000 of available credit", () => {
    const result = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          creditLimit: "150000",
          currentBalance: "75000",
          initialAnnualPercent: "0",
        },
      }),
      undefined,
      "2026-10-01",
    );
    expect(result.startingPrincipal).toBe(75000);
    expect(result.availableCredit).toBe(75000);
    expect(result.utilization).toBeCloseTo(0.5, 8);
  });

  it("increases available credit dollar for dollar when principal is repaid", () => {
    const deposit = strategy({
      id: "cycle",
      name: "Deposit",
      kind: "full-paycheck",
    });
    const result = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          currentBalance: "75000",
          creditLimit: "150000",
          initialAnnualPercent: "0",
          usePromo: false,
        },
        incomes: [
          {
            id: "pay",
            name: "Pay",
            amount: "1000",
            frequency: "monthly",
            anchorDate: "2026-10-03",
            dayOfMonth: "3",
            firstDay: "1",
            secondDay: "15",
          },
        ],
        strategies: [deposit],
        selectedStrategyId: deposit.id,
      }),
      deposit,
      "2026-10-03",
    );
    expect(result.endingPrincipal).toBe(74000);
    expect(result.availableCredit).toBe(76000);
    expect(result.totalPrincipalPaid).toBe(1000);
    expect(accountingGap(result)).toBe(0);
  });

  it("increases outstanding principal when the line is drawn", () => {
    const spending = strategy({ id: "cycle", name: "Draw", kind: "full-paycheck" });
    const result = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          currentBalance: "75000",
          creditLimit: "150000",
          initialAnnualPercent: "0",
        },
        expenses: [
          {
            id: "bill",
            name: "Bill",
            category: "other",
            amount: "500",
            frequency: "monthly",
            anchorDate: "2026-10-04",
            dayOfMonth: "4",
            firstDay: "1",
            secondDay: "15",
          },
        ],
        strategies: [spending],
        selectedStrategyId: spending.id,
      }),
      spending,
      "2026-10-04",
    );
    expect(result.endingPrincipal).toBe(75500);
    expect(result.availableCredit).toBe(74500);
    expect(result.totalDraws).toBe(500);
    expect(accountingGap(result)).toBe(0);
  });

  it("refuses withdrawals above available credit", () => {
    const spending = strategy({ id: "cycle", name: "Draw", kind: "full-paycheck" });
    const result = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          creditLimit: "150000",
          currentBalance: "149000",
          initialAnnualPercent: "0",
        },
        expenses: [
          {
            id: "bill",
            name: "Bill",
            category: "other",
            amount: "5000",
            frequency: "monthly",
            anchorDate: "2026-10-04",
            dayOfMonth: "4",
            firstDay: "1",
            secondDay: "15",
          },
        ],
        strategies: [spending],
        selectedStrategyId: spending.id,
      }),
      spending,
      "2026-10-04",
    );
    expect(result.endingPrincipal).toBe(150000);
    expect(result.totalDraws).toBe(1000);
    expect(result.availableCredit).toBe(0);
    expect(result.borrowingCapacityExhausted).toBe(true);
    expect(result.canMeetObligations).toBe(false);
    expect(result.shortfallTotal).toBe(4000);
    expect(accountingGap(result)).toBe(0);
  });
});

describe("daily interest", () => {
  it("changes when the daily balance changes", () => {
    const steady = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          creditLimit: "50000",
          currentBalance: "10000",
          initialWithdrawal: "10000",
          initialAnnualPercent: "10",
          statedMinimumPayment: "0",
        },
      }),
      undefined,
      "2026-10-10",
    );
    const paydown = strategy({ id: "cycle", name: "Paydown", kind: "full-paycheck" });
    const reduced = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          creditLimit: "50000",
          currentBalance: "10000",
          initialWithdrawal: "10000",
          initialAnnualPercent: "10",
          statedMinimumPayment: "0",
        },
        incomes: [
          {
            id: "pay",
            name: "Pay",
            amount: "5000",
            frequency: "monthly",
            anchorDate: "2026-10-06",
            dayOfMonth: "6",
            firstDay: "1",
            secondDay: "15",
          },
        ],
        strategies: [paydown],
        selectedStrategyId: paydown.id,
      }),
      paydown,
      "2026-10-10",
    );

    expect(steady.totalInterestCharged).toBe(27.4);
    expect(reduced.totalInterestCharged).toBe(20.55);
    expect(reduced.daily[0].interestToday).toBe(2.74);
    expect(reduced.daily[5].principal).toBe(5000);
    expect(reduced.daily[5].interestToday).toBe(1.37);
    expect(dailyInterestCents(parseCents(10000), percentToScaled(10), 365)).toBe(274n);
  });

  it("charges more interest at a higher rate when the balance path is unchanged", () => {
    const at = (rate: string) =>
      run(
        minimalPlanner({
          heloc: {
            ...minimalPlanner().heloc,
            creditLimit: "50000",
            currentBalance: "10000",
            initialWithdrawal: "10000",
            initialAnnualPercent: rate,
            statedMinimumPayment: "0",
          },
          startingChecking: "100000",
        }),
        undefined,
        "2026-10-10",
      );
    const lower = at("10");
    const higher = at("12");
    expect(higher.totalInterestCharged).toBeGreaterThan(lower.totalInterestCharged);
    expect(lower.totalInterestCharged).toBe(27.4);
    expect(higher.endingPrincipal).toBe(lower.endingPrincipal);
  });

  it("uses the actual/360 divisor when that convention is selected", () => {
    const result = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          creditLimit: "50000",
          currentBalance: "10000",
          initialWithdrawal: "10000",
          initialAnnualPercent: "10",
          dayCount: "actual/360",
        },
      }),
      undefined,
      "2026-10-01",
    );
    expect(result.daily[0].interestToday).toBe(2.78);
  });
});

describe("promotional rates and stress", () => {
  it("keeps the promotional rate through the expiration date and changes the next day", () => {
    const result = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          creditLimit: "50000",
          currentBalance: "10000",
          initialWithdrawal: "10000",
          initialAnnualPercent: "10",
          usePromo: true,
          promoAnnualPercent: "0",
          promoExpiration: "2026-10-05",
          postPromoAnnualPercent: "10",
        },
      }),
      undefined,
      "2026-10-10",
    );
    expect(result.daily[4].date).toBe("2026-10-05");
    expect(result.daily[4].interestToday).toBe(0);
    expect(result.daily[4].ratePercent).toBe(0);
    expect(result.daily[5].date).toBe("2026-10-06");
    expect(result.daily[5].interestToday).toBe(2.74);
    expect(result.totalInterestCharged).toBe(13.7);
  });

  it("caps a rate shock at the annual cap", () => {
    const resolved = resolveRate({
      date: "2026-10-06",
      initialAnnualPercent: new Decimal(8),
      usePromo: false,
      promoAnnualPercent: new Decimal(0),
      promoExpiration: "",
      postPromoAnnualPercent: new Decimal(8),
      rateCapPercent: new Decimal(10),
      rateFloorPercent: null,
      shockPercentPoints: new Decimal(5),
      applyShockDuringPromo: false,
      ignorePromo: false,
      customSchedule: [],
      useCustomSchedule: false,
    });
    expect(resolved.percent).toBe(10);
  });
});

describe("paycheck cycling", () => {
  it("does not invent income or erase debt when paychecks equal expenses", () => {
    const cycling = strategy({ id: "cycle", name: "Entire paycheck", kind: "full-paycheck" });
    const result = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          creditLimit: "50000",
          currentBalance: "10000",
          initialWithdrawal: "10000",
          initialAnnualPercent: "10",
          statedMinimumPayment: "0",
          paymentStructure: "interest-only",
          annualFee: "0",
        },
        startingChecking: "0",
        incomes: [
          {
            id: "pay",
            name: "Pay",
            amount: "3000",
            frequency: "monthly",
            anchorDate: "2026-10-15",
            dayOfMonth: "15",
            firstDay: "1",
            secondDay: "15",
          },
        ],
        expenses: [
          {
            id: "bills",
            name: "Bills",
            category: "other",
            amount: "3000",
            frequency: "monthly",
            anchorDate: "2026-10-15",
            dayOfMonth: "15",
            firstDay: "1",
            secondDay: "15",
          },
        ],
        strategies: [cycling],
        selectedStrategyId: cycling.id,
      }),
      cycling,
      "2027-04-01",
    );

    expect(result.totalDeposits).toBe(result.totalDraws);
    expect(result.totalDeposits).toBe(18000);
    expect(result.totalInterestCharged).toBeGreaterThan(0);
    expect(result.endingPrincipal).toBeGreaterThan(10000);
    expect(result.capitalizationEvents).toBeGreaterThan(0);
    expect(accountingGap(result)).toBe(0);
    const netCash = Math.round((result.totalDeposits - result.totalDraws) * 100);
    expect(netCash).toBe(0);
  });

  it("matches a same-day additional principal payment when net cash flow and timing match", () => {
    const shared = {
      ...minimalPlanner().heloc,
      creditLimit: "50000",
      currentBalance: "10000",
      initialWithdrawal: "10000",
      initialAnnualPercent: "10",
      statedMinimumPayment: "0",
      paymentStructure: "interest-only" as const,
      paymentDay: "1",
      annualFee: "0",
    };
    const fixed = strategy({
      id: "fixed",
      name: "Additional 500",
      kind: "fixed",
      fixedMode: "additional",
      fixedAmount: "500",
    });
    const cycling = strategy({ id: "cycle", name: "Paycheck 500", kind: "full-paycheck" });
    const fixedResult = run(
      minimalPlanner({
        heloc: shared,
        startingChecking: "100000",
        strategies: [fixed],
        selectedStrategyId: fixed.id,
      }),
      fixed,
      "2027-04-01",
    );
    const cycledResult = run(
      minimalPlanner({
        heloc: shared,
        startingChecking: "100000",
        incomes: [
          {
            id: "pay",
            name: "Pay",
            amount: "500",
            frequency: "monthly",
            anchorDate: "2026-11-01",
            dayOfMonth: "1",
            firstDay: "1",
            secondDay: "15",
          },
        ],
        strategies: [cycling],
        selectedStrategyId: cycling.id,
      }),
      cycling,
      "2027-04-01",
    );

    expect(cycledResult.endingPrincipal).toBe(fixedResult.endingPrincipal);
    expect(cycledResult.totalInterestCharged).toBe(fixedResult.totalInterestCharged);
    expect(cycledResult.totalPrincipalPaid).toBe(fixedResult.totalPrincipalPaid);
    expect(cycledResult.monthly.map((month) => month.endingPrincipal)).toEqual(
      fixedResult.monthly.map((month) => month.endingPrincipal),
    );
    expect(accountingGap(fixedResult)).toBe(0);
    expect(accountingGap(cycledResult)).toBe(0);
  });
});

describe("payment capacity and consolidation", () => {
  it("identifies a household that cannot make the required HELOC payment", () => {
    const result = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          creditLimit: "20000",
          currentBalance: "10000",
          initialWithdrawal: "10000",
          initialAnnualPercent: "12",
          statedMinimumPayment: "800",
          paymentStructure: "interest-only",
        },
        startingChecking: "0",
      }),
      undefined,
      "2026-12-01",
    );
    expect(result.canMeetObligations).toBe(false);
    expect(result.shortfallCount).toBeGreaterThan(0);
    expect(result.shortfalls.some((event) => event.kind === "heloc-payment-short")).toBe(true);
  });

  it("does not reduce total household debt when balances move onto the HELOC", () => {
    const result = simulate(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          creditLimit: "150000",
          currentBalance: "75000",
          initialAnnualPercent: "8",
        },
        debts: [
          {
            id: "visa",
            creditor: "Visa",
            balance: "8500",
            apr: "22.99",
            minimumPayment: "250",
            creditLimit: "12000",
            dueDay: "15",
            includeInTransfer: true,
            type: "credit-card",
          },
          {
            id: "loan",
            creditor: "Personal loan",
            balance: "6000",
            apr: "11.5",
            minimumPayment: "200",
            creditLimit: "",
            dueDay: "18",
            includeInTransfer: false,
            type: "personal-loan",
          },
        ],
        consolidationPlan: "transfer",
      }),
      { horizonEnd: "2026-10-01", useCustomSchedule: false },
    );
    expect(result.debts.find((debt) => debt.id === "visa")?.transferred).toBe(true);
    expect(result.debts.find((debt) => debt.id === "loan")?.transferred).toBe(false);
    expect(result.householdDebtAfterTransfer).toBe(result.householdDebtStart);
    expect(result.endingPrincipal).toBe(83500);
    expect(result.securedDebtEnd).toBeGreaterThan(75000);
  });

  it("does not erase a debt payment that is redrawn from the HELOC", () => {
    const cycling = strategy({ id: "cycle", name: "Entire paycheck", kind: "full-paycheck" });
    const result = run(
      minimalPlanner({
        heloc: {
          ...minimalPlanner().heloc,
          creditLimit: "50000",
          currentBalance: "10000",
          initialWithdrawal: "10000",
          initialAnnualPercent: "0",
          statedMinimumPayment: "0",
        },
        incomes: [
          {
            id: "pay",
            name: "Pay",
            amount: "1000",
            frequency: "monthly",
            anchorDate: "2026-10-10",
            dayOfMonth: "10",
            firstDay: "1",
            secondDay: "15",
          },
        ],
        debts: [
          {
            id: "visa",
            creditor: "Visa",
            balance: "2000",
            apr: "0",
            minimumPayment: "100",
            creditLimit: "5000",
            dueDay: "15",
            includeInTransfer: false,
            type: "credit-card",
          },
        ],
        strategies: [cycling],
        selectedStrategyId: cycling.id,
      }),
      cycling,
      "2026-10-15",
    );
    const card = result.debts[0];
    expect(card.endingBalance).toBe(1900);
    expect(result.totalDraws).toBe(100);
    expect(result.endingPrincipal).toBe(9100);
    expect(result.householdDebtEnd).toBe(11000);
    expect(accountingGap(result)).toBe(0);
  });
});
