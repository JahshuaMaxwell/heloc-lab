# Architecture

The calculator is a Next.js application. All financial results are produced in `lib/finance` and then displayed. The interface does not reimplement interest math.

## Stack

- Next.js App Router and React, TypeScript
- Tailwind CSS and shadcn/ui for form and layout primitives
- Recharts for the dashboard graphs
- jsPDF for the workshop PDF, generated in the browser
- Vitest for the calculation tests

No database is required. Scenario JSON is stored in `localStorage`.

## Calculation boundary

`lib/finance/simulate.ts` is the daily engine. It accepts the planner state and optional overrides for strategy, consolidation plan, rate shock, promotional bypass, custom schedule, and an early horizon used by tests.

`lib/finance/analyze.ts` runs the strategy comparison, the four consolidation plans, the stress cases, the opening HELOC snapshot, and the cash-flow average. Pages call those functions. They do not accumulate interest themselves.

Money is an integer number of cents. Annual rates are scaled by 1e12 and divided with half-up rounding, so daily interest does not depend on binary floating-point error. The UI converts cent totals to numbers only after rounding.

## Day loop

For each calendar day the engine:

1. Charges the origination fee and, when the plan says so, draws the HELOC to pay selected debts on the start date.
2. Charges an annual fee on each anniversary.
3. Applies income and household expenses. Full paycheck cycling deposits the paycheck and redraws bills. Partial cycling deposits the chosen share. Other strategies leave income in checking and draw the HELOC only when checking cannot pay a bill.
4. On the HELOC payment date, collects the required payment and any fixed extra principal. Interest is paid before principal. Unpaid interest is added to principal up to the remaining credit limit.
5. Pays other debts that are due. Cycling strategies may draw the HELOC for those payments. That draw increases the HELOC by the same amount the other debt decreases.
6. Accrues that day’s interest on the ending principal.
7. Closes the line once principal and accrued HELOC interest are both zero. Later bills are paid from checking and are not borrowed again.

The contractual maturity is the start date plus the draw period plus the repayment period. New draws stop when the draw period ends. Repayment then uses a recast principal-and-interest payment.

## Interfaces left for later

`ScenarioRepository` in `lib/scenarios/storage.ts` is implemented by `LocalScenarioRepository`. `CrmScenarioRepository` has the same methods and throws until a CRM adapter is added. The UI uses only the local repository.

## Deployment

The app is a standard Next.js deployment. It has no server secrets. PDF generation and scenario storage run on the client, so a static or serverless host such as Vercel is sufficient.
