# Testing report

Run date: September 22, 2026. Command: `npm test` (`vitest run`). Result: 17 tests passed across 3 files.

## Engine

- A $150,000 HELOC with a $75,000 balance has $75,000 of available credit and 50 percent utilization.
- A $1,000 principal deposit lowers the balance to $74,000 and raises available credit to $76,000.
- A $500 draw raises principal to $75,500 and lowers available credit to $74,500.
- A $5,000 draw against $1,000 of remaining credit borrows only $1,000, leaves the balance at the limit, and records a $4,000 shortfall.
- Ten days at 10 percent actual/365 on $10,000 charges $27.40. Paying the balance to $5,000 halfway through charges $20.55. The daily amounts are $2.74 and $1.37.
- The same balance path at 12 percent charges more interest than at 10 percent.
- Actual/360 on $10,000 at 10 percent charges $2.78 for one day.
- A 0 percent promotional rate through October 5, 2026 charges no interest that day and $2.74 on October 6, when a 10 percent rate begins.
- A rate cap of 10 percent limits an 8 percent rate plus a 5 point shock to 10 percent.
- Paycheck cycling with $3,000 of income and $3,000 of expenses on the same day deposits exactly as much as it draws. The balance rises by capitalized interest. No income is invented.
- A $500 additional principal payment and a $500 paycheck deposited on the same payment dates, with interest paid from cash, produce the same balances and the same interest.
- A required payment with no cash is reported as a HELOC payment shortfall.
- Transferring an $8,500 card onto a $75,000 HELOC raises the line to $83,500 and leaves total household debt unchanged.
- Redrawing a $100 card payment from the HELOC reduces the card and increases the line by the same $100.
- The accounting identity holds: ending principal equals the opening balance plus draws, financed fees, and capitalized interest, minus principal paid.

## Opening snapshot and cash flow

- The workshop example reports $75,000 available and $10.25 of daily interest at the 4.99 percent promotional rate.
- Biweekly pay of $3,000 averages between $6,000 and $7,000 per month. The four sample debt minimums total $725.

## Workshop strategies

All seven sample strategies complete a full draw-plus-repayment simulation in under 8 seconds (about half a second on the test machine). The minimum-payment path meets its obligations. Interest totals are finite, balances stay non-negative, and utilization stays between 0 and 100 percent.

## Browser check

Checked September 22, 2026 in the running app at http://127.0.0.1:43123, desktop and a 390px-wide viewport.

- The workshop dashboard opened at a $75,000 balance, $75,000 available credit, 50 percent utilization, and the Entire Paycheck Strategy, with a shortfall warning and charts drawn.
- Raising the current balance to $80,000 changed available credit to $70,000 and utilization to 53.3 percent. Restoring $75,000 restored the original figures.
- Cash flow showed about $6,750 of average monthly income, $4,300 of living expenses, $725 of other debt minimums, and a $1,725 surplus before the HELOC payment.
- Strategy cards distinguished a $2,000 total payment from $2,000 of additional principal. Choosing Minimum Payment Strategy updated the dashboard label and the “payments covered” status.
- Consolidation stated that a transfer does not eliminate debt and that the balance becomes secured by the home. No credit-score change was estimated.
- The stress table listed the unchanged path, +1, +2, and +3 points, a 1 point decrease, immediate promotional expiration, and the custom schedule.
- Saving a scenario stored it in the browser. Reload workshop example restored the sample. The education accordion opened the foreclosure explanation. Download PDF produced `legacy-builders-heloc-workshop-example.pdf`.
- At 390px the primary figures and navigation remained usable, with no overlapping text.

Lender-specific billing rules that differ from the documented day-count and payment conventions are not reproduced.
