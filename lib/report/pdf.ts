import { formatPercent, formatUSD } from "@/lib/finance/money";
import { yearlyRollup } from "@/lib/finance/analyze";
import type { CashFlowSummary, PlannerState, PointInTime, SimulationResult } from "@/lib/finance/types";
import { disclosures } from "@/lib/education/content";

export interface ReportModel {
  state: PlannerState;
  snapshot: PointInTime;
  cash: CashFlowSummary;
  selected: SimulationResult;
  strategies: SimulationResult[];
  generatedAt: string;
}

const NAVY: [number, number, number] = [16, 36, 63];
const OLIVE: [number, number, number] = [93, 107, 58];
const GOLD: [number, number, number] = [166, 132, 61];

export async function downloadReport(model: ReportModel): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 78, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 78, pageWidth, 4, "F");
  doc.setTextColor(247, 243, 234);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text("Legacy Builders Enterprise Group", margin, 34);
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text("HELOC Strategy Calculator — workshop report", margin, 54);
  doc.setFontSize(9);
  doc.text(model.generatedAt, pageWidth - margin, 54, { align: "right" });

  let y = 108;
  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text(model.state.scenarioName, margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 48, 58);
  const intro = doc.splitTextToSize(
    "This report summarizes manually entered figures and the daily interest model. It is an educational illustration for a Legacy Builders workshop, not a loan offer or a prediction of credit-score changes.",
    pageWidth - margin * 2,
  );
  doc.text(intro, margin, y);
  y += intro.length * 13 + 12;

  y = sectionTitle(doc, "Financial inputs", margin, y);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, textColor: 28, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 180 } },
    body: [
      ["HELOC credit limit", formatUSD(Number(model.state.heloc.creditLimit) || 0)],
      ["Initial withdrawal", formatUSD(Number(model.state.heloc.initialWithdrawal) || 0)],
      ["Current balance", formatUSD(Number(model.state.heloc.currentBalance) || 0)],
      ["Available credit", formatUSD(model.snapshot.availableCredit)],
      ["Utilization", model.snapshot.currentUtilization === null ? "—" : formatPercent(model.snapshot.currentUtilization * 100)],
      ["Rate on start date", `${formatPercent(model.snapshot.ratePercent)} (${model.snapshot.rateLabel})`],
      ["Post-promotional rate", `${model.state.heloc.postPromoAnnualPercent || model.state.heloc.initialAnnualPercent}%`],
      ["Promotional expiration", model.state.heloc.usePromo ? model.state.heloc.promoExpiration : "No promotional rate"],
      ["Day count", model.state.heloc.dayCount],
      ["Payment structure", model.state.heloc.paymentStructure === "interest-only" ? "Interest only during the draw period" : "Principal and interest"],
      ["Draw / repayment", `${model.state.heloc.drawPeriodMonths} months / ${model.state.heloc.repaymentPeriodMonths} months`],
      ["Simulation start", model.state.heloc.startDate],
      ["Average monthly income", formatUSD(model.cash.averageMonthlyIncome)],
      ["Average monthly expenses", formatUSD(model.cash.averageMonthlyExpenses)],
      ["Other debt minimums", formatUSD(model.cash.averageMonthlyDebtMinimums)],
      ["Surplus before HELOC payment", formatUSD(model.cash.averageMonthlySurplusBeforeHeloc)],
      ["Emergency reserve", formatUSD(Number(model.state.emergencyFund) || 0)],
    ],
  });
  y = tableEnd(doc, y) + 18;

  y = sectionTitle(doc, "Selected strategy", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...OLIVE);
  doc.text(model.selected.strategyName, margin, y);
  y += 16;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    headStyles: { fillColor: NAVY, textColor: 255 },
    styles: { fontSize: 9 },
    head: [["Measure", "Result"]],
    body: [
      ["Projected HELOC payoff", model.selected.payoffLabel],
      ["HELOC interest charged", formatUSD(model.selected.totalInterestCharged)],
      ["Interest paid in cash", formatUSD(model.selected.totalInterestPaid)],
      ["Interest added to principal", formatUSD(model.selected.totalInterestCapitalized)],
      ["Fees", formatUSD(model.selected.totalFees)],
      ["Total borrowing cost", formatUSD(model.selected.totalBorrowingCost)],
      ["Ending HELOC principal", formatUSD(model.selected.endingPrincipal)],
      ["Available credit at end", formatUSD(model.selected.availableCredit)],
      ["Ending household debt", formatUSD(model.selected.householdDebtEnd)],
      ["Obligations met", model.selected.canMeetObligations ? "Yes, in this model" : "No — see shortfalls"],
      ["Shortfall total", formatUSD(model.selected.shortfallTotal)],
    ],
  });
  y = tableEnd(doc, y) + 18;

  y = ensureSpace(doc, y, 160);
  y = sectionTitle(doc, "Strategy comparison", margin, y);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    headStyles: { fillColor: OLIVE, textColor: 255 },
    styles: { fontSize: 8, cellPadding: 3 },
    head: [["Strategy", "Payoff", "HELOC interest", "Borrowing cost", "Ending balance", "Meets payments"]],
    body: model.strategies.map((result) => [
      result.strategyName,
      result.payoffLabel,
      formatUSD(result.totalInterestCharged),
      formatUSD(result.totalBorrowingCost),
      formatUSD(result.endingPrincipal),
      result.canMeetObligations ? "Yes" : "No",
    ]),
  });
  y = tableEnd(doc, y) + 18;

  y = ensureSpace(doc, y, 160);
  y = sectionTitle(doc, "Annual HELOC schedule", margin, y);
  const years = yearlyRollup(model.selected);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    headStyles: { fillColor: NAVY, textColor: 255 },
    styles: { fontSize: 9 },
    head: [["Year", "Interest charged", "Principal paid", "Ending principal"]],
    body: years.map((year) => [
      year.year,
      formatUSD(year.interest),
      formatUSD(year.principal),
      formatUSD(year.endingBalance),
    ]),
  });
  y = tableEnd(doc, y) + 18;

  if (model.selected.debts.length > 0) {
    y = ensureSpace(doc, y, 140);
    y = sectionTitle(doc, "Other debts", margin, y);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: NAVY, textColor: 255 },
      styles: { fontSize: 8 },
      head: [["Creditor", "Started", "Transferred", "Ending balance", "Interest"]],
      body: model.selected.debts.map((debt) => [
        debt.creditor,
        formatUSD(debt.startingBalance),
        formatUSD(debt.amountTransferred),
        formatUSD(debt.endingBalance),
        formatUSD(debt.interestCharged),
      ]),
    });
    y = tableEnd(doc, y) + 10;
    doc.setFontSize(9);
    doc.text(
      "A transfer moves unsecured debt onto the HELOC. It does not erase the balance.",
      margin,
      y,
    );
    y += 20;
  }

  y = ensureSpace(doc, y, 180);
  y = sectionTitle(doc, "Key assumptions", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 48, 58);
  for (const assumption of model.selected.assumptions) {
    y = paragraph(doc, assumption, margin, y, pageWidth - margin * 2);
  }

  y = ensureSpace(doc, y, 180);
  y = sectionTitle(doc, "Financial risk disclosures", margin, y);
  for (const disclosure of disclosures) {
    y = paragraph(doc, disclosure, margin, y, pageWidth - margin * 2);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(
      `Legacy Builders HELOC Strategy Calculator  ·  Page ${page} of ${pages}  ·  Not a lending decision`,
      margin,
      doc.internal.pageSize.getHeight() - 28,
    );
  }

  const slug = model.state.scenarioName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`legacy-builders-heloc-${slug || "report"}.pdf`);
}

function sectionTitle(doc: import("jspdf").jsPDF, title: string, x: number, y: number): number {
  if (y > 700) {
    doc.addPage();
    y = 56;
  }
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(title, x, y);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(x, y + 4, x + 180, y + 4);
  return y + 16;
}

function paragraph(doc: import("jspdf").jsPDF, text: string, x: number, y: number, width: number): number {
  const lines = doc.splitTextToSize(text, width);
  const height = lines.length * 12 + 8;
  if (y + height > 740) {
    doc.addPage();
    y = 56;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 48, 58);
  doc.text(lines, x, y);
  return y + height;
}

function tableEnd(doc: import("jspdf").jsPDF, fallback: number): number {
  const last = (doc as import("jspdf").jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return last?.finalY ?? fallback;
}

function ensureSpace(doc: import("jspdf").jsPDF, y: number, needed: number): number {
  if (y + needed > 740) {
    doc.addPage();
    return 56;
  }
  return y;
}

export function reportStamp(): string {
  return new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
}
