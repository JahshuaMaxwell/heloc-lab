# Financial calculation specification

## Money and rates

Currency is stored as integer cents. A displayed dollar amount is cents divided by 100 after rounding. Each day’s HELOC interest is:

`round half up(principal cents × annual rate / day-count divisor)`

The annual rate is a decimal (8.5% is 0.085) scaled by 1,000,000,000,000 before the division, so the rounding step is exact integer arithmetic. Actual/365 uses 365 on every calendar day, including leap-year days. Actual/360 uses 360 and still accrues on every calendar day.

Interest does not compound daily. It accumulates until the payment date. A payment pays accrued interest first and principal second. If interest remains and capitalization is on, it is added to principal up to the credit limit. After that, the new principal accrues interest.

## Available credit

`available credit = max(0, credit limit − principal)`

Accrued interest that has not been capitalized does not reduce available credit. A principal payment increases available credit by the amount applied. A draw increases principal by the amount received plus any draw fee that is financed. A draw is capped so principal cannot exceed the limit. The unpaid remainder is a shortfall.

Principal cannot fall below zero. A deposit larger than the balance leaves the excess in checking.

## Promotional rate

If a promotional rate is enabled, it applies on every date through the expiration date, inclusive. The next day uses the post-promotional rate. If no promotion is enabled, the initial annual rate applies throughout. A custom schedule, when present, replaces both on and after each effective date. An annual cap and floor are applied after the rate is chosen. Rate shocks in the stress test are added to the non-promotional rate unless “apply shocks during the promotion” is on. Shock presets ignore a custom schedule; the custom row uses it.

## HELOC payment

On each payment day after the start date:

- During an interest-only draw period, the required payment is the greater of accrued interest and the stated minimum, capped at the payoff amount.
- Otherwise the payment is recast from the current principal, the current annual rate, and the months remaining until maturity, and it is at least accrued interest.
- A fixed **total** payment uses the greater of that required payment and the entered amount.
- A fixed **additional** payment uses the required payment plus the entered principal amount.
- Paycheck deposits already made since the prior payment count toward the principal portion. They do not pay the interest. Interest still has to be paid in cash.

The payment is taken from checking, then from the emergency fund only if that option is on. Any unpaid interest is capitalized when that option is on.

## Paycheck cycling

Full cycling deposits 100% of each paycheck, then draws household expenses and, if checking cannot cover them, other debt minimums. Partial cycling deposits the selected percent or dollar amount and pays bills from checking first.

Gross deposits are not debt reduction. The principal effect is deposits minus draws, then interest and fees. If income equals expenses and they occur on the same day, the HELOC balance does not fall because of the deposit. Interest still accrues and, if unpaid, increases the balance.

Two strategies with the same net principal reduction on the same days, before that day’s interest accrual, produce the same HELOC interest.

Once the HELOC principal and accrued interest reach zero, the line is closed. It is not redrawn.

## Other debts

Other debts accrue daily with the same day-count convention. On the due date the stated minimum is paid. Unpaid accrued interest on that debt is added to its balance. An avalanche plan, after the HELOC payment, sends checking cash above the cushion to the highest-rate balance still open, which may be the HELOC.

A consolidation transfer on the start date draws the HELOC and reduces the selected debts by the same dollars. Total household debt does not fall at the moment of transfer. Fees can make it larger. The transferred amount is secured by the home.

## Cash flow

Average monthly income and expenses are the scheduled amounts over the twelve months beginning on the start date, divided by twelve. Debt minimums are the sum of the entered monthly minimums. The surplus shown on the dashboard is income minus expenses minus those minimums, before the HELOC payment.

## What the model will not do

It will not create income from a deposit, erase debt by moving it, borrow more than available credit, or estimate a credit score. If a payment or bill cannot be made, the result records a shortfall and does not treat that strategy as successful merely because interest is lower.
