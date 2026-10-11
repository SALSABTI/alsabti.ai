import type { Expense, ExpenseCategory, PaymentMethod, Recurrence } from '../types';
import { addDays, addMonths, endOfMonth, monthKey, startOfMonth } from './dates';
import { newId, toCsv } from './format';

export type RangePreset = 'this-month' | 'last-month' | 'last-90' | 'this-year' | 'all' | 'custom';

export interface ExpenseFilter {
  search: string;
  categoryId: string; // '' = all
  paymentMethod: PaymentMethod | '';
  from: string; // '' = open
  to: string; // '' = open
}

export function rangeForPreset(preset: RangePreset, todayIso: string): { from: string; to: string } {
  switch (preset) {
    case 'this-month':
      return { from: startOfMonth(todayIso), to: endOfMonth(todayIso) };
    case 'last-month': {
      const prev = addMonths(startOfMonth(todayIso), -1);
      return { from: prev, to: endOfMonth(prev) };
    }
    case 'last-90':
      return { from: addDays(todayIso, -89), to: todayIso };
    case 'this-year':
      return { from: todayIso.slice(0, 4) + '-01-01', to: todayIso.slice(0, 4) + '-12-31' };
    default:
      return { from: '', to: '' };
  }
}

export function filterExpenses(
  expenses: Expense[],
  filter: ExpenseFilter,
  categories: ExpenseCategory[],
): Expense[] {
  const q = filter.search.trim().toLowerCase();
  const catName = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));
  return expenses
    .filter((e) => {
      if (filter.categoryId && e.categoryId !== filter.categoryId) return false;
      if (filter.paymentMethod && e.paymentMethod !== filter.paymentMethod) return false;
      if (filter.from && e.date < filter.from) return false;
      if (filter.to && e.date > filter.to) return false;
      if (q) {
        const hay = [e.vendor, e.description, e.notes, catName.get(e.categoryId) ?? ''].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
}

export function sumAmounts(expenses: Expense[]): number {
  return round2(expenses.reduce((s, e) => s + e.amount, 0));
}

export function totalsByCategory(expenses: Expense[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of expenses) m.set(e.categoryId, round2((m.get(e.categoryId) ?? 0) + e.amount));
  return m;
}

export function totalsByMonth(expenses: Expense[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of expenses) {
    const k = monthKey(e.date);
    m.set(k, round2((m.get(k) ?? 0) + e.amount));
  }
  return m;
}

export interface BudgetStatus {
  category: ExpenseCategory;
  spent: number;
  ratio: number;
}

/** Spending against each category's monthly budget, for the month containing `todayIso`. */
export function budgetStatus(
  expenses: Expense[],
  categories: ExpenseCategory[],
  todayIso: string,
): BudgetStatus[] {
  const month = monthKey(todayIso);
  const spent = totalsByCategory(expenses.filter((e) => monthKey(e.date) === month));
  return categories
    .filter((c) => c.budget > 0)
    .map((c) => {
      const s = spent.get(c.id) ?? 0;
      return { category: c, spent: s, ratio: s / c.budget };
    });
}

export function nextOccurrence(start: string, recurrence: Recurrence, n: number): string {
  switch (recurrence) {
    case 'weekly':
      return addDays(start, 7 * n);
    case 'monthly':
      return addMonths(start, n);
    case 'yearly':
      return addMonths(start, 12 * n);
    default:
      return start;
  }
}

/**
 * Creates copies of recurring expenses for every occurrence due on or before `todayIso`.
 * Returns the same array when nothing is due.
 */
export function generateRecurring(expenses: Expense[], todayIso: string): Expense[] {
  const created: Expense[] = [];
  const updated = new Map<string, Expense>();
  for (const e of expenses) {
    if (e.recurrence === 'none') continue;
    let n = e.occurrences ?? 0;
    let next = nextOccurrence(e.date, e.recurrence, n + 1);
    // Cap to avoid runaway generation from a template dated far in the past.
    while (next <= todayIso && created.length < 1000) {
      created.push({
        ...e,
        id: newId(),
        date: next,
        recurrence: 'none',
        occurrences: undefined,
        recurringSourceId: e.id,
        receipt: undefined,
      });
      n++;
      next = nextOccurrence(e.date, e.recurrence, n + 1);
    }
    if (n !== (e.occurrences ?? 0)) updated.set(e.id, { ...e, occurrences: n });
  }
  if (created.length === 0) return expenses;
  return [...expenses.map((e) => updated.get(e.id) ?? e), ...created];
}

export function expensesToCsv(expenses: Expense[], categories: ExpenseCategory[]): string {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  return toCsv([
    ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Payment method', 'Recurring', 'Notes'],
    ...expenses.map((e) => [
      e.date,
      catName.get(e.categoryId) ?? 'Uncategorised',
      e.vendor,
      e.description,
      e.amount.toFixed(2),
      e.paymentMethod,
      e.recurrence === 'none' ? (e.recurringSourceId ? 'auto' : '') : e.recurrence,
      e.notes,
    ]),
  ]);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
