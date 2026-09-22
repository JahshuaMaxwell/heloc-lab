"use client";

import { useMemo } from "react";
import { StrategyLines } from "@/components/charts";
import { MoneyField } from "@/components/fields";
import { PageIntro } from "@/components/metric";
import { usePlanner } from "@/components/planner-provider";
import { compareStress } from "@/lib/finance/analyze";
import { formatUSD } from "@/lib/finance/money";

export default function StressPage() {
  const { state, setState } = usePlanner();
  const model = useMemo(() => {
    try {
      return { rows: compareStress(state), error: null as string | null };
    } catch (error) {
      return { rows: [], error: error instanceof Error ? error.message : "The stress test could not be completed." };
    }
  }, [state]);

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Module 6" title="Interest-rate stress test">
        <p>
          Each row uses the dashboard strategy and consolidation plan. Increases apply to the contractual rate after a promotion ends, unless you turned on shocks during the promotion. The custom row uses the schedule entered on the HELOC screen. These are scenarios, not forecasts.
        </p>
      </PageIntro>
      <div className="max-w-sm">
        <MoneyField
          label="Decrease to test (percentage points)"
          value={state.stressDecreasePercent}
          onChange={(value) => setState((current) => ({ ...current, stressDecreasePercent: value }))}
        />
      </div>
      {model.error ? <p className="text-sm text-[#8c3a2f]">{model.error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-[#10243f] text-left text-[#f7f3ea]">
            <tr>
              {["Scenario", "Start rate", "End rate", "First HELOC payment", "Interest", "Payoff", "Ending balance", "Payments met"].map((heading) => (
                <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-3">{row.name}</td>
                <td className="num px-3 py-3">{row.result.rateAtStart.toFixed(2)}%</td>
                <td className="num px-3 py-3">{row.result.rateAtEnd.toFixed(2)}%</td>
                <td className="num px-3 py-3">{row.result.firstHelocPayment === null ? "—" : formatUSD(row.result.firstHelocPayment)}</td>
                <td className="num px-3 py-3">{formatUSD(row.result.totalInterestCharged)}</td>
                <td className="px-3 py-3">{row.result.payoffLabel}</td>
                <td className="num px-3 py-3">{formatUSD(row.result.endingPrincipal)}</td>
                <td className="px-3 py-3">{row.result.canMeetObligations ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {model.rows.length > 0 ? (
        <StrategyLines title="HELOC balance under each rate path" results={model.rows.map((row) => ({ ...row.result, strategyId: row.id, strategyName: row.name }))} mode="balance" />
      ) : null}
    </div>
  );
}
