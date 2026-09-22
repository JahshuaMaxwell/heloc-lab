"use client";

import { MoneyField, SelectField, TextField, ToggleField } from "@/components/fields";
import { MetricCard, PageIntro } from "@/components/metric";
import { usePlanner } from "@/components/planner-provider";
import { useResults } from "@/components/use-results";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/finance/dates";
import { formatUSD } from "@/lib/finance/money";
import type { ExpenseCategory, ExpenseFrequency, PayFrequency } from "@/lib/finance/types";

const frequencies: { value: PayFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "semimonthly", label: "Semimonthly" },
  { value: "monthly", label: "Monthly" },
];

const expenseFrequencies: { value: ExpenseFrequency; label: string }[] = [
  ...frequencies,
  { value: "annual", label: "Annual" },
];

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "mortgage", label: "Mortgage" },
  { value: "utilities", label: "Utilities" },
  { value: "transportation", label: "Transportation" },
  { value: "insurance", label: "Insurance" },
  { value: "groceries", label: "Groceries" },
  { value: "other", label: "Other recurring" },
  { value: "variable", label: "Variable" },
];

export default function CashFlowPage() {
  const { state, updateIncome, addIncome, removeIncome, updateExpense, addExpense, removeExpense, setState } = usePlanner();
  const { cash } = useResults();

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Module 2" title="Income and expenses">
        <p>
          Paycheck amounts are per paycheck, not per month. Debt payments entered on the consolidation screen are paid by the model automatically — do not list those same payments here or they will be counted twice. Variable expenses are the monthly estimate you enter, paid on the date you choose.
        </p>
      </PageIntro>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Average monthly income" value={formatUSD(cash.averageMonthlyIncome)} detail="Next 12 months, converted to a monthly average" />
        <MetricCard label="Average monthly expenses" value={formatUSD(cash.averageMonthlyExpenses)} />
        <MetricCard label="Other debt minimums" value={formatUSD(cash.averageMonthlyDebtMinimums)} />
        <MetricCard
          label="Surplus or deficit"
          value={formatUSD(cash.averageMonthlySurplusBeforeHeloc)}
          detail="Before the HELOC payment"
          tone={cash.averageMonthlySurplusBeforeHeloc < 0 ? "warn" : "good"}
        />
      </section>
      <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 md:grid-cols-2">
        <MoneyField label="Emergency fund" value={state.emergencyFund} onChange={(value) => setState((current) => ({ ...current, emergencyFund: value }))} hint="Shown as reserves. It is not spent unless the switch below is on." />
        <MoneyField label="Starting checking balance" value={state.startingChecking} onChange={(value) => setState((current) => ({ ...current, startingChecking: value }))} />
        <MoneyField label="Checking cushion" value={state.checkingCushion} onChange={(value) => setState((current) => ({ ...current, checkingCushion: value }))} hint="Avalanche sweeps leave at least this much in checking." />
        <ToggleField
          label="Use the emergency fund for shortfalls"
          checked={state.useEmergencyFundForShortfalls}
          onChange={(value) => setState((current) => ({ ...current, useEmergencyFundForShortfalls: value }))}
          hint="Off by default, so a shortfall stays visible instead of quietly draining savings."
        />
      </section>
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl text-[#10243f]">Income sources</h2>
          <Button type="button" onClick={addIncome}>Add income</Button>
        </div>
        {state.incomes.map((item) => (
          <article key={item.id} className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3">
            <TextField label="Name" value={item.name} onChange={(value) => updateIncome(item.id, { name: value })} />
            <MoneyField label="Amount per paycheck" value={item.amount} onChange={(value) => updateIncome(item.id, { amount: value })} />
            <SelectField label="Frequency" value={item.frequency} onChange={(value) => updateIncome(item.id, { frequency: value as PayFrequency })} options={frequencies} />
            <TextField label="First paycheck or anchor date" type="date" value={item.anchorDate} onChange={(value) => updateIncome(item.id, { anchorDate: value, dayOfMonth: value.slice(8, 10).replace(/^0/, "") })} hint="Weekly and biweekly dates repeat from this day." />
            <TextField label="Monthly day" value={item.dayOfMonth} onChange={(value) => updateIncome(item.id, { dayOfMonth: value })} inputMode="numeric" />
            <TextField label="First semimonthly day" value={item.firstDay} onChange={(value) => updateIncome(item.id, { firstDay: value })} inputMode="numeric" hint="Used only for semimonthly pay." />
            <TextField label="Second semimonthly day" value={item.secondDay} onChange={(value) => updateIncome(item.id, { secondDay: value })} inputMode="numeric" />
            <div className="md:col-span-3 flex justify-end">
              <Button type="button" variant="ghost" onClick={() => removeIncome(item.id)}>Remove income</Button>
            </div>
          </article>
        ))}
        <div className="rounded-2xl border border-border bg-[#f7f8f1] p-4">
          <h3 className="text-lg text-[#10243f]">Upcoming paychecks</h3>
          <ul className="mt-2 grid gap-1 text-sm">
            {cash.nextPayDates.length === 0 ? <li>Add an income source to see paycheck dates.</li> : null}
            {cash.nextPayDates.map((pay) => (
              <li key={`${pay.name}-${pay.date}`} className="num flex justify-between gap-3">
                <span>{pay.name}</span>
                <span>{formatDisplayDate(pay.date)} · {formatUSD(pay.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl text-[#10243f]">Expenses</h2>
          <Button type="button" onClick={addExpense}>Add expense</Button>
        </div>
        {state.expenses.map((item) => (
          <article key={item.id} className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3">
            <TextField label="Name" value={item.name} onChange={(value) => updateExpense(item.id, { name: value })} />
            <SelectField label="Category" value={item.category} onChange={(value) => updateExpense(item.id, { category: value as ExpenseCategory })} options={categories} />
            <MoneyField label="Amount" value={item.amount} onChange={(value) => updateExpense(item.id, { amount: value })} />
            <SelectField label="Frequency" value={item.frequency} onChange={(value) => updateExpense(item.id, { frequency: value as ExpenseFrequency })} options={expenseFrequencies} />
            <TextField label="Payment date anchor" type="date" value={item.anchorDate} onChange={(value) => updateExpense(item.id, { anchorDate: value })} />
            <TextField label="Day of month" value={item.dayOfMonth} onChange={(value) => updateExpense(item.id, { dayOfMonth: value })} inputMode="numeric" />
            <div className="md:col-span-3 flex justify-end">
              <Button type="button" variant="ghost" onClick={() => removeExpense(item.id)}>Remove expense</Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
