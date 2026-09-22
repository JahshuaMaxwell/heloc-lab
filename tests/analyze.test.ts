import { describe, expect, it } from "vitest";
import { cashFlowSummary, pointInTime } from "@/lib/finance/analyze";
import { workshopExample } from "@/lib/finance/defaults";

describe("opening HELOC position", () => {
  it("reports $75,000 available on the workshop line and the promotional daily interest", () => {
    const snapshot = pointInTime(workshopExample());
    expect(snapshot.availableCredit).toBe(75000);
    expect(snapshot.currentUtilization).toBeCloseTo(0.5, 8);
    expect(snapshot.initialUtilization).toBeCloseTo(0.5, 8);
    expect(snapshot.dailyInterest).toBe(10.25);
    expect(snapshot.issue).toBeNull();
  });

  it("averages biweekly income without treating a paycheck as a monthly amount", () => {
    const cash = cashFlowSummary(workshopExample());
    expect(cash.averageMonthlyIncome).toBeGreaterThan(6000);
    expect(cash.averageMonthlyIncome).toBeLessThan(7000);
    expect(cash.averageMonthlyExpenses).toBeGreaterThan(4000);
    expect(cash.averageMonthlyDebtMinimums).toBe(725);
  });
});
