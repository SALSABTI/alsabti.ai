import type { Product, Sale } from '../types';
import { monthKey } from './dates';
import { round2 } from './expenses';

export function saleTotal(s: Sale): number {
  return round2(Math.max(0, s.quantity * s.unitPrice - s.discount));
}

export function saleCost(s: Sale, products: Product[]): number {
  const p = products.find((x) => x.id === s.productId);
  return round2((p?.cost ?? 0) * s.quantity);
}

export function salesInMonth(sales: Sale[], month: string): Sale[] {
  return sales.filter((s) => monthKey(s.date) === month);
}
