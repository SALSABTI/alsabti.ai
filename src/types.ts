export type PaymentMethod = 'Cash' | 'Card' | 'Bank transfer' | 'Cheque' | 'Other';
export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Card', 'Bank transfer', 'Cheque', 'Other'];

export type Recurrence = 'none' | 'weekly' | 'monthly' | 'yearly';
export const RECURRENCES: Recurrence[] = ['none', 'weekly', 'monthly', 'yearly'];

export interface ExpenseCategory {
  id: string;
  name: string;
  /** Monthly budget; 0 means no budget. */
  budget: number;
}

export interface Expense {
  id: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  amount: number;
  categoryId: string;
  vendor: string;
  description: string;
  paymentMethod: PaymentMethod;
  notes: string;
  /** Receipt image as a data URL. */
  receipt?: string;
  recurrence: Recurrence;
  /** For a recurring template: how many copies have been generated so far. */
  occurrences?: number;
  /** Set on copies generated from a recurring template. */
  recurringSourceId?: string;
}

export type ProductType = 'Oud oil' | 'Perfume' | 'Bakhoor' | 'Oud wood' | 'Gift set' | 'Other';
export const PRODUCT_TYPES: ProductType[] = ['Oud oil', 'Perfume', 'Bakhoor', 'Oud wood', 'Gift set', 'Other'];

export interface Product {
  id: string;
  name: string;
  sku: string;
  type: ProductType;
  size: string;
  cost: number;
  price: number;
  stock: number;
  lowStock: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export interface Sale {
  id: string;
  date: string;
  productId: string;
  customerId?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  paymentMethod: PaymentMethod;
}

export interface Settings {
  businessName: string;
  currency: string;
}

export interface AppData {
  version: 1;
  settings: Settings;
  categories: ExpenseCategory[];
  expenses: Expense[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
}
