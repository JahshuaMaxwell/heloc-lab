# Product requirements

Working title: Legacy Builders HELOC Strategy Calculator. Prepared for Bryan Hoskin, Legacy Builders Enterprise Group.

## Purpose

Help a homeowner see how income, expenses, debt balances, interest rates, and repayment choices change a HELOC balance, available credit, interest cost, and the time required to pay the line off. The tool is for consultations and workshops. It is an illustration, not a loan offer.

## Primary case

A household has a $150,000 HELOC and has drawn $75,000. They want to compare a fixed monthly payment with depositing each paycheck into the line and paying household bills from it. The result must be allowed to show no advantage.

## Modules

1. **HELOC terms.** Limit, initial draw, current balance, contract rate, promotional rate and expiration, post-promotional rate, cap and floor, minimum payment, interest-only or principal-and-interest, draw and repayment months, origination, annual, draw, and early-closure fees, and the simulation start date. The screen shows utilization, available credit, daily and monthly interest at the current balance, and the selected strategy’s payoff, interest, and borrowing cost.
2. **Income and expenses.** Multiple income sources, weekly through monthly schedules, exact anchor dates, living-expense categories, variable spending, emergency reserves, and the resulting surplus or deficit.
3. **Strategies.** Minimum payments; a fixed amount as either the total payment or additional principal; full paycheck cycling; partial paycheck cycling at more than one percentage.
4. **Consolidation.** Several debts, with an option to transfer selected balances. Compare continuing payments, a transfer, an avalanche with no transfer, and a transfer plus accelerated HELOC principal. Show that unsecured debt became home-secured debt. Do not predict a credit score.
5. **Daily interest engine.** Each calendar day applies transactions, then accrues interest with actual/365 or actual/360, using integer cents and half-up rounding.
6. **Stress test.** Unchanged, +1%, +2%, +3%, a user-chosen decrease, immediate promotional expiration, and a custom rate schedule.
7. **Dashboard.** Balances, utilization, interest, payoff, household debt, surplus, reserves, and charts.
8. **Scenarios.** Create, save, duplicate, open, delete, and compare up to three scenarios in the browser.
9. **Education.** HELOC basics, daily interest, velocity banking, principal, income versus credit, utilization, variable rates, consolidation risk, draw versus repayment, and foreclosure.
10. **Report.** A downloadable PDF with inputs, the selected strategy, the annual schedule, comparisons, assumptions, and disclosures.

## Out of scope for this release

Bank-account connections, payments, credit pulls, user accounts, and a live CRM. Manual entry only.

## Acceptance checks

The automated tests lock the opening available credit, dollar-for-dollar principal and draws, the credit-limit ceiling, daily balance sensitivity, promotional expiration, higher rates, the absence of invented income in paycheck cycling, equivalent same-day cash flows, and missed-payment detection.
