"use client";

import Link from "next/link";
import { InterestBars, StrategyLines } from "@/components/charts";
import { MetricCard, NoticeList, PageIntro } from "@/components/metric";
import { useResults } from "@/components/use-results";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from "@/lib/finance/dates";
import { formatPercent, formatUSD } from "@/lib/finance/money";

export default function DashboardPage() {
  const { state, calculating, comparison, snapshot, cash, selected, narrative, notes } = useResults();

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Dashboard" title="Where the HELOC stands">
        <p>
          {state.scenarioName} starts with a {formatUSD(Number(state.heloc.creditLimit) || 0)} line and{" "}
          {formatUSD(Number(state.heloc.currentBalance) || 0)} outstanding. The selected path is{" "}
          <strong>{selected?.strategyName ?? "not available"}</strong>. Olive bars below are strategies that meet
          every modeled payment. Terracotta bars miss at least one.
        </p>
      </PageIntro>
      {calculating ? <p className="text-sm text-muted-foreground">Updating the daily model…</p> : null}
      {comparison.error ? (
        <NoticeList items={[comparison.error]} />
      ) : selected ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="HELOC balance" value={formatUSD(Number(state.heloc.currentBalance) || 0)} detail="Entered outstanding principal" />
            <MetricCard label="Credit limit" value={formatUSD(Number(state.heloc.creditLimit) || 0)} />
            <MetricCard label="Available credit" value={formatUSD(snapshot.availableCredit)} detail={snapshot.rateLabel} />
            <MetricCard
              label="Utilization"
              value={snapshot.currentUtilization === null ? "—" : formatPercent(snapshot.currentUtilization * 100, 1)}
              detail={snapshot.initialUtilization === null ? undefined : `Initial draw ${formatPercent(snapshot.initialUtilization * 100, 1)}`}
              tone={snapshot.currentUtilization !== null && snapshot.currentUtilization > 0.8 ? "warn" : "default"}
            />
            <MetricCard label="Monthly interest, if unchanged" value={formatUSD(snapshot.monthlyInterest)} detail={`About ${formatUSD(snapshot.dailyInterest)} per day at today's balance`} />
            <MetricCard label="Principal repaid in the model" value={formatUSD(selected.totalPrincipalPaid)} detail="Paycheck deposits and scheduled principal" />
            <MetricCard label="Total HELOC interest" value={formatUSD(selected.totalInterestCharged)} detail={`Borrowing cost ${formatUSD(selected.totalBorrowingCost)} including fees`} />
            <MetricCard label="Projected payoff" value={selected.paidOff ? formatDisplayDate(selected.payoffDate) : "Not within term"} detail={selected.payoffLabel} tone={selected.paidOff ? "good" : "warn"} />
            <MetricCard label="Household debt" value={formatUSD(selected.householdDebtEnd)} detail={`Starts at ${formatUSD(selected.householdDebtStart)} including other debts entered`} />
            <MetricCard
              label="Monthly surplus"
              value={formatUSD(cash.averageMonthlySurplusBeforeHeloc)}
              detail="Income minus living expenses and other debt minimums, before the HELOC bill"
              tone={cash.averageMonthlySurplusBeforeHeloc < 0 ? "warn" : "good"}
            />
            <MetricCard label="Emergency reserve" value={formatUSD(Number(state.emergencyFund) || 0)} detail={state.useEmergencyFundForShortfalls ? "Used for shortfalls" : "Held aside, not spent automatically"} />
            <MetricCard
              label="Payment capacity"
              value={selected.canMeetObligations ? "Payments covered" : "Shortfalls"}
              detail={selected.canMeetObligations ? "Modeled obligations were paid" : `${formatUSD(selected.shortfallTotal)} could not be paid`}
              tone={selected.canMeetObligations ? "good" : "warn"}
            />
          </section>
          <section className="rounded-2xl border border-[#d7e0c8] bg-[#f7f8f1] px-4 py-4 text-sm leading-6 text-[#24301a]">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Reading the result</Badge>
              {!selected.canMeetObligations ? <Badge variant="destructive">Does not meet every payment</Badge> : null}
            </div>
            <p>{narrative}</p>
          </section>
          <NoticeList items={notes} />
          <div className="grid gap-4 xl:grid-cols-2">
            <StrategyLines title="HELOC balance over time" results={comparison.results} mode="balance" />
            <StrategyLines title="Available credit over time" results={comparison.results} mode="credit" />
            <StrategyLines title="Cumulative HELOC interest" results={comparison.results} mode="interest" />
            <StrategyLines title="Total household debt" results={comparison.results} mode="household" />
            <div className="xl:col-span-2">
              <InterestBars results={comparison.results} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Adjust the line, cash flow, or strategy on the next screens, or open the{" "}
            <Link className="underline" href="/report">workshop report</Link>.
          </p>
        </>
      ) : null}
    </div>
  );
}
