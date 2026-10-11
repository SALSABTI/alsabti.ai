import { describe, expect, it } from 'vitest';
import type { Expense, ExpenseCategory } from '../types';
import { budgetStatus, expensesToCsv, filterExpenses, generateRecurring, rangeForPreset, sumAmounts } from './expenses';
import { addMonths } from './dates';

const cats: ExpenseCategory[] = [
  { id: 'rent', name: 'Rent', budget: 500 },
  { id: 'raw', name: 'Raw materials', budget: 0 },
];

function exp(p: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(36),
    date: '2026-10-05',
    amount: 10,
    categoryId: 'raw',
    vendor: '',
    description: '',
    paymentMethod: 'Cash',
    notes: '',
    recurrence: 'none',
    ...p,
  };
}

describe('dates', () => {
  it('clamps month-end when adding months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
  });
});

describe('rangeForPreset', () => {
  it('computes month ranges', () => {
    expect(rangeForPreset('this-month', '2026-10-11')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(rangeForPreset('last-month', '2026-03-31')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(rangeForPreset('all', '2026-10-11')).toEqual({ from: '', to: '' });
  });
});

describe('filterExpenses', () => {
  const list = [
    exp({ date: '2026-10-01', vendor: 'Oud House', categoryId: 'raw' }),
    exp({ date: '2026-09-01', description: 'October rent', categoryId: 'rent', paymentMethod: 'Bank transfer' }),
    exp({ date: '2026-10-09', notes: 'glass bottles', categoryId: 'raw' }),
  ];
  const base = { search: '', categoryId: '', paymentMethod: '' as const, from: '', to: '' };

  it('filters by date, category, payment and text, newest first', () => {
    expect(filterExpenses(list, { ...base, from: '2026-10-01', to: '2026-10-31' }, cats).map((e) => e.date)).toEqual([
      '2026-10-09',
      '2026-10-01',
    ]);
    expect(filterExpenses(list, { ...base, categoryId: 'rent' }, cats)).toHaveLength(1);
    expect(filterExpenses(list, { ...base, paymentMethod: 'Bank transfer' }, cats)).toHaveLength(1);
    expect(filterExpenses(list, { ...base, search: 'BOTTLES' }, cats)).toHaveLength(1);
    expect(filterExpenses(list, { ...base, search: 'raw mat' }, cats)).toHaveLength(2);
  });
});

describe('generateRecurring', () => {
  it('creates monthly copies up to today and records progress', () => {
    const tpl = exp({ id: 'tpl', date: '2026-07-31', amount: 400, recurrence: 'monthly', receipt: 'data:x' });
    const out = generateRecurring([tpl], '2026-10-11');
    const copies = out.filter((e) => e.recurringSourceId === 'tpl');
    expect(copies.map((c) => c.date)).toEqual(['2026-08-31', '2026-09-30']);
    expect(copies.every((c) => c.recurrence === 'none' && c.amount === 400 && !c.receipt)).toBe(true);
    expect(out.find((e) => e.id === 'tpl')!.occurrences).toBe(2);
    // Running again generates nothing new.
    expect(generateRecurring(out, '2026-10-11')).toBe(out);
    // Next due date follows.
    expect(generateRecurring(out, '2026-10-31').filter((e) => e.recurringSourceId === 'tpl')).toHaveLength(3);
  });

  it('does nothing for one-off and future-dated expenses', () => {
    const list = [exp({}), exp({ date: '2026-12-01', recurrence: 'weekly' })];
    expect(generateRecurring(list, '2026-10-11')).toBe(list);
  });

  it('handles weekly and yearly', () => {
    expect(generateRecurring([exp({ id: 'w', date: '2026-09-20', recurrence: 'weekly' })], '2026-10-11')).toHaveLength(4);
    expect(generateRecurring([exp({ id: 'y', date: '2024-02-29', recurrence: 'yearly' })], '2026-10-11').map((e) => e.date)).toEqual([
      '2024-02-29',
      '2025-02-28',
      '2026-02-28',
    ]);
  });
});

describe('budgets and totals', () => {
  it('reports current-month spend against budgets', () => {
    const list = [
      exp({ categoryId: 'rent', amount: 300, date: '2026-10-01' }),
      exp({ categoryId: 'rent', amount: 300, date: '2026-10-02' }),
      exp({ categoryId: 'rent', amount: 999, date: '2026-09-02' }),
    ];
    const [rent] = budgetStatus(list, cats, '2026-10-11');
    expect(rent.spent).toBe(600);
    expect(rent.ratio).toBeCloseTo(1.2);
    expect(budgetStatus(list, cats, '2026-10-11')).toHaveLength(1); // categories without a budget are skipped
  });

  it('sums without float drift', () => {
    expect(sumAmounts([exp({ amount: 0.1 }), exp({ amount: 0.2 })])).toBe(0.3);
  });
});

describe('expensesToCsv', () => {
  it('escapes commas and quotes', () => {
    const csv = expensesToCsv([exp({ description: 'Oil, "premium"', amount: 12.5, categoryId: 'rent' })], cats);
    expect(csv.split('\r\n')[1]).toBe('2026-10-05,Rent,,"Oil, ""premium""",12.50,Cash,,');
  });
});
