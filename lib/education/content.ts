export interface Lesson {
  id: string;
  title: string;
  paragraphs: string[];
}

export const lessons: Lesson[] = [
  {
    id: "heloc",
    title: "What a HELOC is",
    paragraphs: [
      "A home equity line of credit is a revolving loan secured by a home. The lender sets a credit limit. The borrower can draw up to that limit during the draw period, repay principal, and usually borrow again if credit is available.",
      "The outstanding balance is debt. Available credit is not income, not cash in the bank, and not equity that has been magically freed. Using available credit increases the amount owed and the lien against the property.",
      "Legacy Builders uses this calculator to show the arithmetic of a proposal. It does not approve a line, quote a lender, or recommend borrowing.",
    ],
  },
  {
    id: "daily-interest",
    title: "How daily interest works",
    paragraphs: [
      "Most HELOCs accrue interest every day on that day's outstanding principal. This model divides the annual rate by 365 or by 360, depending on the convention you select, and rounds each day half-up to the cent.",
      "Interest is not compounded every day. It collects in an accrued-interest balance and is billed on the payment date. If the payment covers the accrued interest, the interest does not join the principal. If it does not, unpaid interest is added to principal up to the credit limit. From that day forward, the added amount accrues interest too.",
      "A lower balance on a given day produces lower interest that day. Paying principal early in the month reduces more days of interest than paying the same principal at the end of the month. The difference is often modest compared with the effect of paying extra principal at all.",
    ],
  },
  {
    id: "velocity",
    title: "What velocity banking means",
    paragraphs: [
      "Velocity banking, sometimes called paycheck cycling, means depositing income into the HELOC as soon as it arrives and then drawing the line to pay household bills. The hope is that the principal balance, and therefore the interest, stays lower during the days between the deposit and the bills.",
      "The deposit is still the same paycheck. The draws are still the same bills. The strategy does not create income and does not cancel debt. Principal declines only by the amount of income that is not spent, minus interest and fees that get added back.",
      "If every dollar of income is swept into the line, checking may not have the cash to pay the HELOC's own interest. This model capitalizes that unpaid interest and flags it. A plan that ignores the interest payment can show a falling balance that quietly grows back.",
    ],
  },
  {
    id: "principal",
    title: "Why paying principal reduces interest",
    paragraphs: [
      "Interest for a day is the principal that day multiplied by the daily rate. Every dollar of principal that stays outstanding is charged again tomorrow. A dollar of principal repaid today is a dollar that is not charged for the remaining life of the balance.",
      "That is ordinary loan math. It is true for a HELOC, a mortgage, and a credit card. The account the payment is sent to does not change the arithmetic. What changes the result is how much principal is paid, when it is paid, and what interest rate applies.",
      "An interest-only minimum keeps the principal intact during the draw period. The line can remain fully drawn for years while the household pays only the cost of carrying it.",
    ],
  },
  {
    id: "income-vs-credit",
    title: "Income and available credit are different",
    paragraphs: [
      "Income is money the household earned and can spend without increasing debt. Available credit is permission to borrow. Spending available credit raises the HELOC balance dollar for dollar, plus any draw fee.",
      "A paycheck deposited into the HELOC is a principal payment. The same dollars drawn out the next day to buy groceries put the principal back. Only the unspent portion, and only for the days it actually stayed there, changes the interest calculation.",
      "The cash-flow page separates take-home pay, living expenses, and debt payments so those flows are not counted twice.",
    ],
  },
  {
    id: "utilization",
    title: "How credit utilization works",
    paragraphs: [
      "HELOC utilization in this model is outstanding principal divided by the credit limit. Accrued interest that has not yet been added to principal does not reduce available credit. A $150,000 limit with a $75,000 balance has $75,000 available and 50 percent utilization.",
      "Paying principal increases available credit by the same amount, assuming no fee or limit change. A new draw reduces available credit by the draw and any financed draw fee. The model will not draw more than the remaining credit.",
      "Credit-card utilization is that card's balance divided by its limit. Moving a card balance to a HELOC can make the card look unused while the HELOC utilization rises. Those are not the same kind of debt: one is unsecured, and the other is secured by the home.",
    ],
  },
  {
    id: "variable-rates",
    title: "Risks of variable interest rates",
    paragraphs: [
      "Many HELOCs use a variable rate. The payment that fits today can grow if the index rises, even when the household's income does not. A promotional rate has an expiration date. This model uses the promotional rate through that date and the post-promotional rate afterward.",
      "The stress test reprices the contractual rate by one, two, and three percentage points, and by a decrease you choose. It also shows the path if the promotion ends immediately, and a custom schedule if you enter one. The annual cap, when entered, limits the modeled rate.",
      "A stress result is a scenario, not a forecast. No one can know the future index. The useful question is whether the household can still pay if the rate is higher for a long time.",
    ],
  },
  {
    id: "consolidation-risk",
    title: "Risks of consolidating debt with home equity",
    paragraphs: [
      "Transferring a credit card or personal loan to a HELOC pays that creditor. It does not eliminate the debt. The same dollars become part of the HELOC balance. Total household debt is unchanged at the moment of transfer, except for fees, which can make it larger.",
      "The interest rate may be lower, so the carrying cost can fall. The tradeoff is collateral. Credit-card default can lead to collection and a lawsuit. HELOC default can lead to foreclosure because the home secures the line. A lower rate does not remove that risk.",
      "This calculator does not predict a credit-score increase. Scores depend on what the lender reports and which scoring model a later creditor uses. Utilization, account age, payment history, and inquiries can move in different directions.",
    ],
  },
  {
    id: "draw-vs-repay",
    title: "Draw periods and repayment periods",
    paragraphs: [
      "During the draw period the borrower can usually take new advances, and the required payment is often interest only. Principal does not have to fall. When the draw period ends, new advances stop in this model, and the remaining balance is repaid over the repayment period with a principal-and-interest payment that is recast from the balance, the rate, and the months left.",
      "A plan that depends on redrawing expenses after the draw period ends will show those expenses as unpaid. A balance that is still large when repayment begins can produce a much higher required payment.",
      "If the line is not paid off by the contractual maturity date, the model reports the remaining balance. It does not assume the lender will extend the term.",
    ],
  },
  {
    id: "foreclosure",
    title: "Foreclosure and the limit of this tool",
    paragraphs: [
      "Borrowing against home equity creates a risk of foreclosure if the repayment obligation is not met. Losing the home is not comparable to falling behind on an unsecured card. Any strategy that increases the HELOC balance, including a consolidation or a month of expense draws, increases the secured debt.",
      "The calculator shows whether the entered income, expenses, and payments can keep up. It cannot know job loss, medical bills, a divorce, a decline in home value, or a lender's actual default timeline.",
      "Nothing in this application is a loan offer, a tax opinion, or personal financial advice. Workshop figures are illustrations from the numbers entered on the screen. Decisions about a real HELOC belong with the household and, where appropriate, a licensed advisor and the lender's own documents.",
    ],
  },
];

export const disclosures: string[] = [
  "Educational illustration only. Legacy Builders Enterprise Group does not, through this calculator, offer credit, guarantee interest savings, or advise that a HELOC or velocity-banking strategy is suitable for any household.",
  "Borrowing against a home creates a risk of foreclosure if required payments are not made. Transferring unsecured balances to a HELOC converts them into debt secured by the property. It does not eliminate the debt.",
  "Credit-score effects are not predicted. Reporting practices and scoring models differ by lender and bureau.",
  "Rates, fees, day-count conventions, and payment rules differ by HELOC agreement. The lender's note and periodic statement control. Promotional rates expire, and variable rates can rise up to the cap in the agreement.",
  "Results stay in this browser unless you download a report. The application does not connect to bank accounts or move money.",
];
