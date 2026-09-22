import Decimal from "decimal.js";

/** Rates are scaled by 1e12 so daily interest stays in integer arithmetic. */
export const RATE_SCALE = 1_000_000_000_000n;

export type Cents = bigint;

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new Error("Division by zero");
  }
  const negative = (numerator < 0n) !== (denominator < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = (n + d / 2n) / d;
  return negative ? -quotient : quotient;
}

export function parseCents(value: string | number | Decimal): Cents {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  if (!decimal.isFinite()) {
    throw new Error(`Invalid amount: ${String(value)}`);
  }
  return BigInt(decimal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).mul(100).toFixed(0));
}

export function parseMoneyInput(value: string): { cents: Cents; ok: boolean } {
  const trimmed = value.trim().replace(/[$,\s]/g, "");
  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return { cents: 0n, ok: true };
  }
  try {
    const decimal = new Decimal(trimmed);
    if (!decimal.isFinite()) return { cents: 0n, ok: false };
    return { cents: parseCents(decimal), ok: true };
  } catch {
    return { cents: 0n, ok: false };
  }
}

export function parsePercentInput(value: string): { percent: Decimal; ok: boolean } {
  const trimmed = value.trim().replace(/[%\s,]/g, "");
  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return { percent: new Decimal(0), ok: true };
  }
  try {
    const decimal = new Decimal(trimmed);
    if (!decimal.isFinite()) return { percent: new Decimal(0), ok: false };
    return { percent: decimal, ok: true };
  } catch {
    return { percent: new Decimal(0), ok: false };
  }
}

export function percentToScaled(percent: string | number | Decimal): bigint {
  const decimal = percent instanceof Decimal ? percent : new Decimal(percent);
  if (!decimal.isFinite() || decimal.lte(0)) return 0n;
  return BigInt(
    decimal.div(100).mul(RATE_SCALE.toString()).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0),
  );
}

export function portionCents(amount: Cents, percent: string | number | Decimal): Cents {
  if (amount <= 0n) return 0n;
  const decimal = percent instanceof Decimal ? percent : new Decimal(percent);
  if (!decimal.isFinite() || decimal.lte(0)) return 0n;
  if (decimal.gte(100)) return amount;
  const scaled = BigInt(
    decimal.div(100).mul(RATE_SCALE.toString()).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0),
  );
  return divRoundHalfUp(amount * scaled, RATE_SCALE);
}

export function dailyInterestCents(
  principalCents: Cents,
  annualRateScaled: bigint,
  dayCountDivisor: number,
): Cents {
  if (principalCents <= 0n || annualRateScaled <= 0n) return 0n;
  const denominator = BigInt(dayCountDivisor) * RATE_SCALE;
  return divRoundHalfUp(principalCents * annualRateScaled, denominator);
}

export function monthlyInterestCents(principalCents: Cents, annualRateScaled: bigint): Cents {
  if (principalCents <= 0n || annualRateScaled <= 0n) return 0n;
  return divRoundHalfUp(principalCents * annualRateScaled, 12n * RATE_SCALE);
}

export function amortizingPaymentCents(
  principalCents: Cents,
  annualPercent: string | number | Decimal,
  months: number,
): Cents {
  if (principalCents <= 0n) return 0n;
  if (months <= 1) return principalCents;
  const annual = annualPercent instanceof Decimal ? annualPercent : new Decimal(annualPercent);
  if (!annual.isFinite() || annual.lte(0)) {
    return divRoundHalfUp(principalCents, BigInt(months));
  }
  const monthlyRate = annual.div(100).div(12);
  const principal = new Decimal(principalCents.toString()).div(100);
  const denominator = new Decimal(1).minus(monthlyRate.plus(1).pow(-months));
  if (denominator.lte(0)) return principalCents;
  const payment = principal.mul(monthlyRate).div(denominator);
  return parseCents(payment);
}

export function centsToDollars(cents: Cents): number {
  return Number(cents) / 100;
}

export function formatCentsPlain(cents: Cents): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const dollars = absolute / 100n;
  const remainder = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${dollars.toString()}.${remainder}`;
}

export function formatUSD(amount: number): string {
  if (!Number.isFinite(amount)) return "\u2014";
  return CURRENCY.format(amount);
}

export function formatPercent(amount: number, digits = 2): string {
  if (!Number.isFinite(amount)) return "\u2014";
  return `${amount.toFixed(digits)}%`;
}

export function minCents(a: Cents, b: Cents): Cents {
  return a < b ? a : b;
}

export function maxCents(a: Cents, b: Cents): Cents {
  return a > b ? a : b;
}
