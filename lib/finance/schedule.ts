import type { Cents } from "@/lib/finance/money";
import { parseCents } from "@/lib/finance/money";
import {
  addDays,
  addMonths,
  dateOnDay,
  daysBetween,
  isValidISODate,
  parseISODate,
} from "@/lib/finance/dates";
import type { ExpenseFrequency, PayFrequency } from "@/lib/finance/types";

export interface RecurringItem {
  amount: Cents;
  frequency: ExpenseFrequency;
  anchorDate: string;
  dayOfMonth: number;
  firstDay: number;
  secondDay: number;
}

export function expandRecurring(
  item: RecurringItem,
  start: string,
  end: string,
): Map<string, Cents> {
  const map = new Map<string, Cents>();
  if (item.amount <= 0n || !isValidISODate(item.anchorDate) || !isValidISODate(start)) {
    return map;
  }

  const add = (date: string) => {
    if (date < start || date > end) return;
    map.set(date, (map.get(date) ?? 0n) + item.amount);
  };

  if (item.frequency === "weekly" || item.frequency === "biweekly") {
    const step = item.frequency === "weekly" ? 7 : 14;
    let date = item.anchorDate;
    if (date < start) {
      const elapsed = daysBetween(date, start);
      const steps = Math.floor(elapsed / step);
      date = addDays(date, steps * step);
      if (date < start) date = addDays(date, step);
    }
    while (date <= end) {
      add(date);
      date = addDays(date, step);
    }
    return map;
  }

  if (item.frequency === "semimonthly") {
    let cursor = `${start.slice(0, 7)}-01`;
    while (cursor <= end) {
      const parsed = parseISODate(cursor);
      const year = parsed.getUTCFullYear();
      const month = parsed.getUTCMonth();
      add(dateOnDay(year, month, item.firstDay));
      add(dateOnDay(year, month, item.secondDay));
      cursor = addMonths(cursor, 1);
    }
    return map;
  }

  const step = item.frequency === "annual" ? 12 : 1;
  let date = firstOccurrence(item.anchorDate, item.dayOfMonth, start, step);
  while (date <= end) {
    add(date);
    date = addMonths(date, step);
  }
  return map;
}

function firstOccurrence(anchor: string, dayOfMonth: number, start: string, step: number): string {
  const anchorDate = parseISODate(anchor);
  const year = anchorDate.getUTCFullYear();
  const month = anchorDate.getUTCMonth();
  let date = dateOnDay(year, month, dayOfMonth);
  if (date < anchor) {
    const shifted = addMonths(date, step);
    date = shifted;
  }
  while (date < start) {
    date = addMonths(date, step);
  }
  return date;
}

export function mergeAmountMaps(maps: Map<string, Cents>[]): Map<string, Cents> {
  const merged = new Map<string, Cents>();
  for (const map of maps) {
    for (const [date, amount] of map) {
      merged.set(date, (merged.get(date) ?? 0n) + amount);
    }
  }
  return merged;
}

export function upcomingDates(
  anchorDate: string,
  frequency: PayFrequency,
  dayOfMonth: number,
  firstDay: number,
  secondDay: number,
  start: string,
  count: number,
  amount: string,
): { date: string; amount: number }[] {
  let cents: Cents;
  try {
    cents = parseCents(amount || "0");
  } catch {
    return [];
  }
  const end = addMonths(start, 8);
  const map = expandRecurring(
    {
      amount: cents,
      frequency,
      anchorDate,
      dayOfMonth,
      firstDay,
      secondDay,
    },
    start,
    end,
  );
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, count)
    .map(([date, value]) => ({ date, amount: Number(value) / 100 }));
}
