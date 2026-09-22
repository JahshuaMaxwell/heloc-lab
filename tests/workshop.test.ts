import { describe, expect, it } from "vitest";
import { workshopExample } from "@/lib/finance/defaults";
import { simulate } from "@/lib/finance/simulate";

describe("workshop example", () => {
  it("compares the consultation strategies without throwing", () => {
    const state = workshopExample();
    const started = Date.now();
    const results = state.strategies.map((item) =>
      simulate(state, { strategy: item, consolidationPlan: "continue" }),
    );
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(8000);
    expect(results).toHaveLength(state.strategies.length);
    for (const result of results) {
      expect(Number.isFinite(result.totalInterestCharged)).toBe(true);
      expect(result.endingPrincipal).toBeGreaterThanOrEqual(0);
      expect(result.availableCredit).toBeGreaterThanOrEqual(0);
      expect(result.utilization).toBeGreaterThanOrEqual(0);
      expect(result.utilization).toBeLessThanOrEqual(1);
    }
    const minimum = results.find((result) => result.strategyId === "minimum");
    const cycling = results.find((result) => result.strategyId === "full-paycheck");
    expect(minimum?.canMeetObligations).toBe(true);
    expect(minimum?.totalInterestCharged).toBeGreaterThan(0);
    expect(cycling?.totalDeposits).toBeGreaterThan(0);
    expect(cycling && minimum && cycling.totalInterestCharged).toBeGreaterThan(0);
  });
});
