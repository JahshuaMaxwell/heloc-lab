export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseISODate(iso: string): Date {
  if (!isValidISODate(iso)) {
    throw new Error(`Invalid date: ${iso}`);
  }
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatISODate(date);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(iso: string, months: number): string {
  const date = parseISODate(iso);
  const day = date.getUTCDate();
  const index = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const year = Math.floor(index / 12);
  const monthIndex = index - year * 12;
  const dim = daysInMonth(year, monthIndex + 1);
  return formatISODate(new Date(Date.UTC(year, monthIndex, Math.min(day, dim))));
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function daysBetween(start: string, end: string): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.round(ms / 86_400_000);
}

export function monthsBetween(start: string, end: string): number {
  const a = parseISODate(start);
  const b = parseISODate(end);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

export function formatDisplayDate(iso: string | null): string {
  if (!iso || !isValidISODate(iso)) return "Not paid off";
  return parseISODate(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isScheduledDay(iso: string, dayOfMonth: number): boolean {
  const date = parseISODate(iso);
  const dim = daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  const due = Math.min(Math.max(dayOfMonth, 1), dim);
  return date.getUTCDate() === due;
}

export function dateOnDay(year: number, monthIndex: number, dayOfMonth: number): string {
  const dim = daysInMonth(year, monthIndex + 1);
  const day = Math.min(Math.max(dayOfMonth, 1), dim);
  return formatISODate(new Date(Date.UTC(year, monthIndex, day)));
}
