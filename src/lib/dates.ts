// All dates are ISO "YYYY-MM-DD" strings handled in UTC so time zones never shift a day.

export function today(): string {
  const d = new Date();
  return toIso(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Adds months, clamping to the last day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(iso: string, months: number): string {
  const d = parseIso(iso);
  const total = d.getUTCMonth() + months;
  const year = d.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const day = Math.min(d.getUTCDate(), daysInMonth(year, month));
  return toIso(new Date(Date.UTC(year, month, day)));
}

export function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + '01';
}

export function endOfMonth(iso: string): string {
  return addDays(addMonths(startOfMonth(iso), 1), -1);
}

export function monthLabel(key: string): string {
  return parseIso(key + '-01').toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
