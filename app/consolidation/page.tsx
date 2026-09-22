"use client";

import { useMemo } from "react";
import { MoneyField, SelectField, TextField, ToggleField } from "@/components/fields";
import { PageIntro } from "@/components/metric";
import { usePlanner } from "@/components/planner-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { compareConsolidation } from "@/lib/finance/analyze";
import { formatPercent, formatUSD } from "@/lib/finance/money";
import type { ConsolidationPlan, DebtType } from "@/lib/finance/types";

const plans: { value: ConsolidationPlan; label: string }[] = [
  { value: "continue", label: "A. Continue existing payments" },
  { value: "transfer", label: "B. Transfer selected balances" },
  { value: "avalanche", label: "C. Avalanche, no transfer" },
  { value: "accelerated", label: "D. Transfer plus accelerated principal" },
];

const debtTypes: { value: DebtType; label: string }[] = [
  { value: "credit-card", label: "Credit card" },
  { value: "personal-loan", label: "Personal loan" },
  { value: "student-loan", label: "Student loan" },
  { value: "auto", label: "Auto loan" },
  { value: "other", label: "Other" },
];

export default function ConsolidationPage() {
  const { state, updateDebt, addDebt, removeDebt, setState } = usePlanner();
  const model = useMemo(() => {
    try {
      return { results: compareConsolidation(state), error: null as string | null };
    } catch (error) {
      return { results: [], error: error instanceof Error ? error.message : "The consolidation comparison could not be completed." };
    }
  }, [state]);
  const selectedPlan = model.results.find((result) => result.consolidationPlan === state.consolidationPlan) ?? null;

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Module 4" title="Debt consolidation">
        <p>
          Moving a credit card or loan onto the HELOC pays that creditor and increases the HELOC. The household still owes the money, and the debt is now secured by the home. This screen does not estimate a credit-score change.
        </p>
      </PageIntro>
      <div className="grid gap-4 rounded-2xl border border-[#e4d3a4] bg-[#fff8ea] p-4 text-sm leading-6 text-[#3d3112]">
        <p>
          Plans A and B use HELOC minimum payments so the transfer itself can be compared. Plan C sends surplus cash, above the checking cushion, to the highest-rate balance and does not move debt onto the house. Plan D transfers the selected balances and adds the accelerated principal amount to the HELOC payment.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField
            label="Plan used on the dashboard"
            value={state.consolidationPlan}
            onChange={(value) => setState((current) => ({ ...current, consolidationPlan: value as ConsolidationPlan }))}
            options={plans}
          />
          <MoneyField
            label="Accelerated extra principal"
            value={state.accelerationAmount}
            onChange={(value) => setState((current) => ({ ...current, accelerationAmount: value }))}
            hint="Used by plan D, on top of the required HELOC payment."
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl text-[#10243f]">Debts</h2>
        <Button type="button" onClick={addDebt}>Add a debt</Button>
      </div>
      {state.debts.map((item) => {
        const limit = Number(item.creditLimit);
        const balance = Number(item.balance);
        const utilization = item.creditLimit.trim() && limit > 0 ? balance / limit : null;
        return (
          <article key={item.id} className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3">
            <TextField label="Creditor" value={item.creditor} onChange={(value) => updateDebt(item.id, { creditor: value })} />
            <SelectField label="Type" value={item.type} onChange={(value) => updateDebt(item.id, { type: value as DebtType })} options={debtTypes} />
            <MoneyField label="Balance" value={item.balance} onChange={(value) => updateDebt(item.id, { balance: value })} />
            <MoneyField label="Annual interest rate (%)" value={item.apr} onChange={(value) => updateDebt(item.id, { apr: value })} />
            <MoneyField label="Minimum payment" value={item.minimumPayment} onChange={(value) => updateDebt(item.id, { minimumPayment: value })} />
            <MoneyField label="Credit limit" value={item.creditLimit} onChange={(value) => updateDebt(item.id, { creditLimit: value })} hint="Leave blank if this debt has no revolving limit." />
            <TextField label="Payment due day" value={item.dueDay} onChange={(value) => updateDebt(item.id, { dueDay: value })} inputMode="numeric" />
            <div className="text-sm">
              <p className="font-medium">Current utilization</p>
              <p className="num mt-2">{utilization === null || !Number.isFinite(utilization) ? "Not revolving" : formatPercent(utilization * 100, 1)}</p>
            </div>
            <ToggleField label="Include in a HELOC transfer" checked={item.includeInTransfer} onChange={(value) => updateDebt(item.id, { includeInTransfer: value })} />
            <div className="md:col-span-3 flex justify-end">
              <Button type="button" variant="ghost" onClick={() => removeDebt(item.id)}>Remove debt</Button>
            </div>
          </article>
        );
      })}
      {model.error ? <p className="text-sm text-[#8c3a2f]">{model.error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-[#10243f] text-left text-[#f7f3ea]">
            <tr>
              {["Plan", "Interest", "Payoff", "HELOC balance", "Available credit", "Debt at start", "Debt after transfer", "Debt at end", "Secured", "Unsecured", "Payments met"].map((heading) => (
                <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.results.map((result) => (
              <tr key={result.strategyId} className="border-t border-border align-top">
                <td className="px-3 py-3">{result.strategyName}</td>
                <td className="num px-3 py-3">{formatUSD(result.totalInterestCharged + result.debts.reduce((sum, debt) => sum + debt.interestCharged, 0))}</td>
                <td className="px-3 py-3">{result.payoffLabel}</td>
                <td className="num px-3 py-3">{formatUSD(result.endingPrincipal)}</td>
                <td className="num px-3 py-3">{formatUSD(result.availableCredit)}</td>
                <td className="num px-3 py-3">{formatUSD(result.householdDebtStart)}</td>
                <td className="num px-3 py-3">{formatUSD(result.householdDebtAfterTransfer)}</td>
                <td className="num px-3 py-3">{formatUSD(result.householdDebtEnd)}</td>
                <td className="num px-3 py-3">{formatUSD(result.securedDebtEnd)}</td>
                <td className="num px-3 py-3">{formatUSD(result.unsecuredDebtEnd)}</td>
                <td className="px-3 py-3">{result.canMeetObligations ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Interest in the table includes HELOC interest and interest accrued on the other debts. Household debt at the moment of a transfer matches the debt before the transfer, aside from fees. Ending secured debt is the HELOC. Ending unsecured debt is everything still outside it.
      </p>
      {selectedPlan ? (
        <section className="grid gap-3">
          <h2 className="text-2xl text-[#10243f]">Dashboard plan detail</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Before {formatUSD(selectedPlan.householdDebtStart)}</Badge>
            <Badge variant="secondary">After transfer {formatUSD(selectedPlan.householdDebtAfterTransfer)}</Badge>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[#e4ead6] text-left">
                <tr>
                  {["Creditor", "Starting balance", "Utilization then", "Transferred", "Ending balance", "Utilization now", "Interest"].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedPlan.debts.map((debt) => (
                  <tr key={debt.id} className="border-t border-border">
                    <td className="px-3 py-2">{debt.creditor}</td>
                    <td className="num px-3 py-2">{formatUSD(debt.startingBalance)}</td>
                    <td className="num px-3 py-2">{debt.startingUtilization === null ? "—" : formatPercent(debt.startingUtilization * 100, 1)}</td>
                    <td className="num px-3 py-2">{formatUSD(debt.amountTransferred)}</td>
                    <td className="num px-3 py-2">{formatUSD(debt.endingBalance)}</td>
                    <td className="num px-3 py-2">{debt.endingUtilization === null ? "—" : formatPercent(debt.endingUtilization * 100, 1)}</td>
                    <td className="num px-3 py-2">{formatUSD(debt.interestCharged)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
