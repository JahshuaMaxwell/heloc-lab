import Decimal from "decimal.js";
import { percentToScaled } from "@/lib/finance/money";
import { isValidISODate } from "@/lib/finance/dates";
import type { RatePoint } from "@/lib/finance/types";

export interface ResolvedRate {
  percent: number;
  scaled: bigint;
  source: "custom" | "promo" | "contract";
}

export interface RateContext {
  date: string;
  initialAnnualPercent: Decimal;
  usePromo: boolean;
  promoAnnualPercent: Decimal;
  promoExpiration: string;
  postPromoAnnualPercent: Decimal;
  rateCapPercent: Decimal | null;
  rateFloorPercent: Decimal | null;
  shockPercentPoints: Decimal;
  applyShockDuringPromo: boolean;
  ignorePromo: boolean;
  customSchedule: RatePoint[];
  useCustomSchedule: boolean;
}

export function resolveRate(context: RateContext): ResolvedRate {
  if (context.useCustomSchedule && context.customSchedule.length > 0) {
    const points = context.customSchedule
      .filter((point) => isValidISODate(point.effectiveDate))
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
    let chosen: RatePoint | null = null;
    for (const point of points) {
      if (point.effectiveDate <= context.date) chosen = point;
    }
    if (chosen) {
      return clampRate(new Decimal(chosen.annualPercent || 0), context, "custom");
    }
  }

  const promoActive =
    context.usePromo &&
    !context.ignorePromo &&
    isValidISODate(context.promoExpiration) &&
    context.date <= context.promoExpiration;

  let percent = promoActive
    ? context.promoAnnualPercent
    : context.usePromo
      ? context.postPromoAnnualPercent
      : context.initialAnnualPercent;

  if (!percent.isFinite()) percent = new Decimal(0);
  const applyShock = !promoActive || context.applyShockDuringPromo;
  if (applyShock && !context.shockPercentPoints.isZero()) {
    percent = percent.plus(context.shockPercentPoints);
  }
  return clampRate(percent, context, promoActive ? "promo" : "contract");
}

function clampRate(
  percent: Decimal,
  context: RateContext,
  source: ResolvedRate["source"],
): ResolvedRate {
  let next = percent;
  if (context.rateFloorPercent) next = Decimal.max(next, context.rateFloorPercent);
  if (context.rateCapPercent) next = Decimal.min(next, context.rateCapPercent);
  if (next.isNeg()) next = new Decimal(0);
  const rounded = next.toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
  return {
    percent: rounded.toNumber(),
    scaled: percentToScaled(rounded),
    source,
  };
}
