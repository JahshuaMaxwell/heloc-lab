"use client";

import { MoneyField, SelectField, TextField, ToggleField } from "@/components/fields";
import { MetricCard, PageIntro } from "@/components/metric";
import { usePlanner } from "@/components/planner-provider";
import { useResults } from "@/components/use-results";
import { Button } from "@/components/ui/button";
import { formatPercent, formatUSD } from "@/lib/finance/money";

export default function HelocPage() {
  const { state, updateHeloc, addRatePoint, updateRatePoint, removeRatePoint } = usePlanner();
  const { snapshot, selected } = useResults();
  const heloc = state.heloc;

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Module 1" title="HELOC terms">
        <p>
          Enter the line as the lender described it. The panel on the right is the opening position. Payoff and lifetime interest come from the selected strategy, not from a single static formula.
        </p>
      </PageIntro>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <div className="grid gap-6">
          <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 md:grid-cols-2">
            <h2 className="md:col-span-2 text-xl text-[#10243f]">Line of credit</h2>
            <MoneyField label="Total credit limit" value={heloc.creditLimit} onChange={(value) => updateHeloc({ creditLimit: value })} />
            <MoneyField label="Initial withdrawal" value={heloc.initialWithdrawal} onChange={(value) => updateHeloc({ initialWithdrawal: value })} hint="The original draw. Used for opening utilization." />
            <MoneyField label="Current outstanding balance" value={heloc.currentBalance} onChange={(value) => updateHeloc({ currentBalance: value })} hint="The balance the simulation starts from." />
            <TextField label="Starting simulation date" type="date" value={heloc.startDate} onChange={(value) => updateHeloc({ startDate: value })} />
          </section>
          <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 md:grid-cols-2">
            <h2 className="md:col-span-2 text-xl text-[#10243f]">Interest rates</h2>
            <MoneyField label="Initial annual rate (%)" value={heloc.initialAnnualPercent} onChange={(value) => updateHeloc({ initialAnnualPercent: value })} hint="Used when no promotional rate is active." />
            <ToggleField label="Introductory promotional rate" checked={heloc.usePromo} onChange={(value) => updateHeloc({ usePromo: value })} hint="The promo rate applies through the expiration date." />
            <MoneyField label="Promotional rate (%)" value={heloc.promoAnnualPercent} onChange={(value) => updateHeloc({ promoAnnualPercent: value })} />
            <TextField label="Promotional expiration" type="date" value={heloc.promoExpiration} onChange={(value) => updateHeloc({ promoExpiration: value })} />
            <MoneyField label="Post-promotional rate (%)" value={heloc.postPromoAnnualPercent} onChange={(value) => updateHeloc({ postPromoAnnualPercent: value })} />
            <MoneyField label="Annual rate cap (%)" value={heloc.rateCapPercent} onChange={(value) => updateHeloc({ rateCapPercent: value })} hint="Leave blank if the agreement has no cap." />
            <MoneyField label="Rate floor (%)" value={heloc.rateFloorPercent} onChange={(value) => updateHeloc({ rateFloorPercent: value })} />
            <ToggleField label="Apply stress shocks during the promotion" checked={heloc.applyShockDuringPromo} onChange={(value) => updateHeloc({ applyShockDuringPromo: value })} hint="Off means a promotional rate stays fixed until it expires." />
          </section>
          <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 md:grid-cols-2">
            <h2 className="md:col-span-2 text-xl text-[#10243f]">Payment and term</h2>
            <MoneyField label="Stated monthly minimum ($)" value={heloc.statedMinimumPayment} onChange={(value) => updateHeloc({ statedMinimumPayment: value })} hint="The model still collects accrued interest when it is higher." />
            <SelectField
              label="Payment structure"
              value={heloc.paymentStructure}
              onChange={(value) => updateHeloc({ paymentStructure: value as typeof heloc.paymentStructure })}
              options={[
                { value: "interest-only", label: "Interest-only during the draw period" },
                { value: "principal-and-interest", label: "Principal and interest from the start" },
              ]}
            />
            <TextField label="Draw period (months)" value={heloc.drawPeriodMonths} onChange={(value) => updateHeloc({ drawPeriodMonths: value })} inputMode="numeric" />
            <TextField label="Repayment period (months)" value={heloc.repaymentPeriodMonths} onChange={(value) => updateHeloc({ repaymentPeriodMonths: value })} inputMode="numeric" />
            <TextField label="Payment day of month" value={heloc.paymentDay} onChange={(value) => updateHeloc({ paymentDay: value })} inputMode="numeric" hint="Interest accrued before this day is billed here." />
            <SelectField
              label="Day-count convention"
              value={heloc.dayCount}
              onChange={(value) => updateHeloc({ dayCount: value as typeof heloc.dayCount })}
              options={[
                { value: "actual/365", label: "Actual/365" },
                { value: "actual/360", label: "Actual/360" },
              ]}
            />
            <SelectField
              label="Same-day transaction order"
              value={heloc.transactionOrder}
              onChange={(value) => updateHeloc({ transactionOrder: value as typeof heloc.transactionOrder })}
              options={[
                { value: "deposits-first", label: "Deposits, then withdrawals" },
                { value: "withdrawals-first", label: "Withdrawals, then deposits" },
              ]}
              hint="Interest uses the balance after both, so order matters only when the credit limit binds."
            />
          </section>
          <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 md:grid-cols-2">
            <h2 className="md:col-span-2 text-xl text-[#10243f]">Fees</h2>
            <MoneyField label="Origination fee" value={heloc.originationFee} onChange={(value) => updateHeloc({ originationFee: value })} />
            <MoneyField label="Annual fee" value={heloc.annualFee} onChange={(value) => updateHeloc({ annualFee: value })} />
            <MoneyField label="Draw fee (flat)" value={heloc.drawFeeFlat} onChange={(value) => updateHeloc({ drawFeeFlat: value })} />
            <MoneyField label="Draw fee (%)" value={heloc.drawFeePercent} onChange={(value) => updateHeloc({ drawFeePercent: value })} />
            <MoneyField label="Early closure fee" value={heloc.earlyClosureFee} onChange={(value) => updateHeloc({ earlyClosureFee: value })} />
            <TextField label="Early closure window (months)" value={heloc.earlyClosureWithinMonths} onChange={(value) => updateHeloc({ earlyClosureWithinMonths: value })} inputMode="numeric" />
            <ToggleField label="Add unpaid fees to the HELOC" checked={heloc.financeFees} onChange={(value) => updateHeloc({ financeFees: value })} hint="Otherwise fees are paid from checking, and only the unpaid part is financed." />
            <ToggleField label="Capitalize unpaid HELOC interest" checked={heloc.capitalizeUnpaidInterest} onChange={(value) => updateHeloc({ capitalizeUnpaidInterest: value })} hint="Unpaid interest is added to principal up to the credit limit." />
          </section>
          <section className="grid gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl text-[#10243f]">Custom rate schedule</h2>
              <Button type="button" variant="outline" onClick={addRatePoint}>Add rate change</Button>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Each row replaces the promotional and contract rates on and after its date. Leave the list empty to use the rates above. Stress-test presets ignore this list except for the custom-schedule row.
            </p>
            {heloc.customSchedule.length === 0 ? <p className="text-sm">No custom rates. The contract path is used.</p> : null}
            {heloc.customSchedule.map((point) => (
              <div key={point.id} className="grid gap-3 border-t border-border pt-3 md:grid-cols-[1fr_1fr_auto]">
                <TextField label="Effective date" type="date" value={point.effectiveDate} onChange={(value) => updateRatePoint(point.id, { effectiveDate: value })} />
                <MoneyField label="Annual rate (%)" value={point.annualPercent} onChange={(value) => updateRatePoint(point.id, { annualPercent: value })} />
                <Button type="button" variant="ghost" className="self-end" onClick={() => removeRatePoint(point.id)}>Remove</Button>
              </div>
            ))}
          </section>
        </div>
        <aside className="grid h-fit gap-3 lg:sticky lg:top-4">
          <MetricCard label="Initial utilization" value={snapshot.initialUtilization === null ? "—" : formatPercent(snapshot.initialUtilization * 100, 1)} />
          <MetricCard label="Current utilization" value={snapshot.currentUtilization === null ? "—" : formatPercent(snapshot.currentUtilization * 100, 1)} />
          <MetricCard label="Available credit" value={formatUSD(snapshot.availableCredit)} />
          <MetricCard label="Estimated daily interest" value={formatUSD(snapshot.dailyInterest)} detail={snapshot.rateLabel} />
          <MetricCard label="Estimated monthly interest" value={formatUSD(snapshot.monthlyInterest)} detail="Balance times the annual rate divided by 12, if nothing changes." />
          <MetricCard label="Modeled principal reduction" value={selected ? formatUSD(selected.totalPrincipalPaid) : "—"} detail="Over the full selected strategy, not a single month." />
          <MetricCard label="Projected payoff" value={selected?.payoffLabel ?? "—"} />
          <MetricCard label="Total projected interest" value={selected ? formatUSD(selected.totalInterestCharged) : "—"} />
          <MetricCard label="Total projected borrowing cost" value={selected ? formatUSD(selected.totalBorrowingCost) : "—"} detail="Interest charged plus fees." />
          {snapshot.issue ? <p className="text-sm text-[#8c3a2f]">{snapshot.issue}</p> : null}
        </aside>
      </div>
    </div>
  );
}
