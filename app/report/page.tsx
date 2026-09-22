"use client";

import { useState } from "react";
import { PageIntro } from "@/components/metric";
import { useResults } from "@/components/use-results";
import { Button } from "@/components/ui/button";
import { disclosures } from "@/lib/education/content";
import { yearlyRollup } from "@/lib/finance/analyze";
import { formatPercent, formatUSD } from "@/lib/finance/money";
import { downloadReport, reportStamp } from "@/lib/report/pdf";

export default function ReportPage() {
  const { state, comparison, snapshot, cash, selected } = useResults();
  const [message, setMessage] = useState<string | null>(null);
  const years = selected ? yearlyRollup(selected) : [];

  async function download() {
    if (!selected) {
      setMessage(comparison.error ?? "Fix the inputs before downloading a report.");
      return;
    }
    setMessage(null);
    try {
      await downloadReport({
        state,
        snapshot,
        cash,
        selected,
        strategies: comparison.results,
        generatedAt: reportStamp(),
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The PDF could not be created.");
    }
  }

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Module 10" title="Workshop report">
        <p>
          The page below is the same story the PDF carries: inputs, the selected strategy, the comparison, the annual schedule, assumptions, and the risk disclosures. Download it for a consultation packet. It is not a lender statement.
        </p>
      </PageIntro>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={download}>Download PDF</Button>
        {message ? <p className="text-sm text-[#8c3a2f]">{message}</p> : null}
      </div>
      {selected ? (
        <article className="grid gap-6 rounded-2xl border border-border bg-card p-5">
          <header className="border-b border-[#e4c57a] pb-4">
            <p className="text-xs tracking-[0.16em] text-[#8d7340] uppercase">Legacy Builders Enterprise Group</p>
            <h2 className="mt-1 text-3xl text-[#10243f]">{state.scenarioName}</h2>
          </header>
          <section>
            <h3 className="text-xl text-[#10243f]">Inputs</h3>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3"><dt>Credit limit</dt><dd className="num">{formatUSD(Number(state.heloc.creditLimit) || 0)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Current balance</dt><dd className="num">{formatUSD(Number(state.heloc.currentBalance) || 0)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Available credit</dt><dd className="num">{formatUSD(snapshot.availableCredit)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Utilization</dt><dd className="num">{snapshot.currentUtilization === null ? "—" : formatPercent(snapshot.currentUtilization * 100, 1)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Monthly income</dt><dd className="num">{formatUSD(cash.averageMonthlyIncome)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Monthly expenses</dt><dd className="num">{formatUSD(cash.averageMonthlyExpenses)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Surplus before HELOC</dt><dd className="num">{formatUSD(cash.averageMonthlySurplusBeforeHeloc)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Emergency reserve</dt><dd className="num">{formatUSD(Number(state.emergencyFund) || 0)}</dd></div>
            </dl>
          </section>
          <section>
            <h3 className="text-xl text-[#10243f]">Selected strategy</h3>
            <p className="mt-1 text-sm text-[#5d6b3a]">{selected.strategyName}</p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3"><dt>Payoff</dt><dd>{selected.payoffLabel}</dd></div>
              <div className="flex justify-between gap-3"><dt>HELOC interest</dt><dd className="num">{formatUSD(selected.totalInterestCharged)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Borrowing cost</dt><dd className="num">{formatUSD(selected.totalBorrowingCost)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Ending balance</dt><dd className="num">{formatUSD(selected.endingPrincipal)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Household debt</dt><dd className="num">{formatUSD(selected.householdDebtEnd)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Payments met</dt><dd>{selected.canMeetObligations ? "Yes" : `No · short ${formatUSD(selected.shortfallTotal)}`}</dd></div>
            </dl>
          </section>
          <section className="overflow-x-auto">
            <h3 className="text-xl text-[#10243f]">Comparison</h3>
            <table className="mt-3 w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Strategy", "Payoff", "Interest", "Cost", "Meets payments"].map((heading) => <th key={heading} className="py-2 pr-3 font-medium">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {comparison.results.map((result) => (
                  <tr key={result.strategyId} className={result.strategyId === selected.strategyId ? "border-b border-border bg-[#f7f8f1]" : "border-b border-border"}>
                    <td className="py-2 pr-3">{result.strategyName}{result.strategyId === selected.strategyId ? " (selected)" : ""}</td>
                    <td className="py-2 pr-3">{result.payoffLabel}</td>
                    <td className="num py-2 pr-3">{formatUSD(result.totalInterestCharged)}</td>
                    <td className="num py-2 pr-3">{formatUSD(result.totalBorrowingCost)}</td>
                    <td className="py-2 pr-3">{result.canMeetObligations ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="overflow-x-auto">
            <h3 className="text-xl text-[#10243f]">Annual schedule</h3>
            <table className="mt-3 w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Year", "Interest", "Principal paid", "Ending principal"].map((heading) => <th key={heading} className="py-2 pr-3 font-medium">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {years.map((year) => (
                  <tr key={year.year} className="border-b border-border">
                    <td className="py-2 pr-3">{year.year}</td>
                    <td className="num py-2 pr-3">{formatUSD(year.interest)}</td>
                    <td className="num py-2 pr-3">{formatUSD(year.principal)}</td>
                    <td className="num py-2 pr-3">{formatUSD(year.endingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h3 className="text-xl text-[#10243f]">Assumptions</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6">
              {selected.assumptions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
          <section>
            <h3 className="text-xl text-[#10243f]">Risk disclosures</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6">
              {disclosures.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        </article>
      ) : (
        <p className="text-sm text-[#8c3a2f]">{comparison.error}</p>
      )}
    </div>
  );
}
