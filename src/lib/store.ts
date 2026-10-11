import { useCallback, useEffect, useState } from 'react';
import type { AppData, ExpenseCategory } from '../types';
import { generateRecurring } from './expenses';
import { today } from './dates';

const STORAGE_KEY = 'autra-oud-data';

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'raw', name: 'Raw materials (oud, oils)', budget: 0 },
  { id: 'packaging', name: 'Bottles & packaging', budget: 0 },
  { id: 'rent', name: 'Rent', budget: 0 },
  { id: 'salaries', name: 'Salaries', budget: 0 },
  { id: 'utilities', name: 'Utilities', budget: 0 },
  { id: 'marketing', name: 'Marketing & ads', budget: 0 },
  { id: 'shipping', name: 'Shipping & delivery', budget: 0 },
  { id: 'equipment', name: 'Equipment', budget: 0 },
  { id: 'fees', name: 'Licenses & fees', budget: 0 },
  { id: 'other', name: 'Other', budget: 0 },
];

export function emptyData(): AppData {
  return {
    version: 1,
    settings: { businessName: 'Autra Oud', currency: 'OMR' },
    categories: DEFAULT_CATEGORIES,
    expenses: [],
    products: [],
    customers: [],
    sales: [],
  };
}

/** Accepts loaded/imported JSON and fills in anything missing. Throws on non-objects. */
export function normalizeData(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('Not a valid backup file');
  const r = raw as Partial<AppData>;
  const base = emptyData();
  return {
    version: 1,
    settings: { ...base.settings, ...(r.settings ?? {}) },
    categories: Array.isArray(r.categories) && r.categories.length ? r.categories : base.categories,
    expenses: Array.isArray(r.expenses) ? r.expenses : [],
    products: Array.isArray(r.products) ? r.products : [],
    customers: Array.isArray(r.customers) ? r.customers : [],
    sales: Array.isArray(r.sales) ? r.sales : [],
  };
}

function load(): AppData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? normalizeData(JSON.parse(s)) : emptyData();
  } catch {
    return emptyData();
  }
}

export type Updater = (fn: (d: AppData) => AppData) => void;

export function useAppData(): { data: AppData; update: Updater; saveError: string } {
  const [data, setData] = useState<AppData>(() => {
    const d = load();
    return { ...d, expenses: generateRecurring(d.expenses, today()) };
  });
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveError('');
    } catch {
      setSaveError('Could not save data in this browser (storage may be full — try removing large receipt images).');
    }
  }, [data]);

  const update = useCallback<Updater>((fn) => {
    setData((d) => {
      const next = fn(d);
      return { ...next, expenses: generateRecurring(next.expenses, today()) };
    });
  }, []);

  return { data, update, saveError };
}
