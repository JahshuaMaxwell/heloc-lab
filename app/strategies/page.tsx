"use client";

import { StrategyLines } from "@/components/charts";
import { MoneyField, SelectField, TextField } from "@/components/fields";
import { PageIntro } from "@/components/metric";
import { usePlanner } from "@/components/planner-provider";
import { useResults } from "@/components/use-results";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUSD } from "@/lib/finance/money";
import type { FixedPaymentMode, PartialMode } from "@/lib/finance/types";

export default function StrategiesPage() {
  const { state, updateStrategy, addPartialStrategy, removeStrategy, selectStrategy } = usePlanner();
  const { comparison, selected } = useResults();

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Module 3" title="Repayment strategies">
        <p>
          Minimum payments, a fixed monthly amount, a full paycheck deposit, and a partial paycheck deposit are calculated on the same daily balance. A $2,000 total payment is the whole check to the HELOC. A $2,000 additional payment is extra principal on top of the required minimum. Neither is assumed to win.
        </p>
      </PageIntro>
      {comparison.error ? <p className="text-sm text-[#8c3a2f]">{comparison.error}</p> : null}
      <div className="grid gap-4">
        {state.strategies.map((item) => {
          const result = comparison.results.find((candidate) => candidate.strategyId === item.id);
          const active = state.selectedStrategyId === item.id;
          return (
            <article key={item.id} className="grid gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl text-[#10243f]">{item.name}</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{describe(item.kind, item.fixedMode)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {active ? <Badge>Selected</Badge> : <Button type="button" variant="outline" onClick={() => selectStrategy(item.id)}>Use on dashboard</Button>}
                  {result ? <Badge variant={result.canMeetObligations ? "secondary" : "destructive"}>{result.canMeetObligations ? "Payments covered" : "Has shortfalls"}</Badge> : null}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <TextField label="Name" value={item.name} onChange={(value) => updateStrategy(item.id, { name: value })} />
                {item.kind === "fixed" ? (
                  <>
                    <SelectField
                      label="What the amount means"
                      value={item.fixedMode}
                      onChange={(value) => updateStrategy(item.id, { fixedMode: value as FixedPaymentMode })}
                      options={[
                        { value: "total", label: "Total HELOC payment" },
                        { value: "additional", label: "Additional principal on top of the minimum" },
                      ]}
                    />
                    <MoneyField label="Monthly amount" value={item.fixedAmount} onChange={(value) => updateStrategy(item.id, { fixedAmount: value })} />
                  </>
                ) : null}
                {item.kind === "partial-paycheck" ? (
                  <>
                    <SelectField
                      label="Contribution"
                      value={item.partialMode}
                      onChange={(value) => updateStrategy(item.id, { partialMode: value as PartialMode })}
                      options={[
                        { value: "percent", label: "Percent of each paycheck" },
                        { value: "amount", label: "Dollar amount of each paycheck" },
                      ]}
                    />
                    {item.partialMode === "percent" ? (
                      <MoneyField label="Percent of paycheck" value={item.partialPercent} onChange={(value) => updateStrategy(item.id, { partialPercent: value })} hint="The rest stays in checking for bills." />
                    ) : (
                      <MoneyField label="Dollars per paycheck" value={item.partialAmount} onChange={(value) => updateStrategy(item.id, { partialAmount: value })} />
                    )}
                  </>
                ) : null}
              </div>
              {result ? (
                <dl className="num grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-muted-foreground">Payoff</dt><dd>{result.payoffLabel}</dd></div>
                  <div><dt className="text-muted-foreground">HELOC interest</dt><dd>{formatUSD(result.totalInterestCharged)}</dd></div>
                  <div><dt className="text-muted-foreground">Borrowing cost</dt><dd>{formatUSD(result.totalBorrowingCost)}</dd></div>
                  <div><dt className="text-muted-foreground">Ending balance</dt><dd>{formatUSD(result.endingPrincipal)}</dd></div>
                  <div><dt className="text-muted-foreground">Average daily balance</dt><dd>{formatUSD(result.averageDailyBalance)}</dd></div>
                  <div><dt className="text-muted-foreground">Deposits</dt><dd>{formatUSD(result.totalDeposits)}</dd></div>
                  <div><dt className="text-muted-foreground">Draws</dt><dd>{formatUSD(result.totalDraws)}</dd></div>
                  <div><dt className="text-muted-foreground">Shortfalls</dt><dd>{formatUSD(result.shortfallTotal)}</dd></div>
                </dl>
              ) : null}
              {item.kind === "partial-paycheck" ? (
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" onClick={() => removeStrategy(item.id)}>Remove this percentage</Button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <Button type="button" variant="outline" onClick={addPartialStrategy}>Compare another contribution percentage</Button>
      {selected ? <StrategyLines title="Balance comparison" results={comparison.results} mode="balance" /> : null}
    </div>
  );
}

function describe(kind: string, mode: string): string {
  if (kind === "minimum") return "Pays only the required HELOC payment. During an interest-only draw, principal does not fall unless the stated minimum exceeds interest.";
  if (kind === "fixed" && mode === "total") return "Sends a fixed total amount to the HELOC. If that amount is below the required payment, the model schedules the required payment instead and says so.";
  if (kind === "fixed") return "Pays the required HELOC payment plus the extra principal amount. This is not the same as a total payment of that size.";
  if (kind === "full-paycheck") return "Deposits each paycheck into the HELOC, then draws household bills and other debt payments back out. HELOC interest must still be paid in cash. If it is not, it is added to principal.";
  return "Deposits part of each paycheck into the HELOC. The remainder stays in checking and is used for bills before any draw.";
}
