import { useMemo, useState, type FormEvent } from 'react';
import Modal from '../components/Modal';
import Stat from '../components/Stat';
import BarList from '../components/BarList';
import type { AppData, Expense, PaymentMethod, Recurrence } from '../types';
import { PAYMENT_METHODS, RECURRENCES } from '../types';
import type { Updater } from '../lib/store';
import {
  budgetStatus,
  expensesToCsv,
  filterExpenses,
  rangeForPreset,
  sumAmounts,
  totalsByCategory,
  type RangePreset,
} from '../lib/expenses';
import { today } from '../lib/dates';
import { downloadFile, formatDate, formatMoney, newId } from '../lib/format';

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-90', label: 'Last 90 days' },
  { value: 'this-year', label: 'This year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom…' },
];

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: 'One-off',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
};

export default function Expenses({ data, update }: { data: AppData; update: Updater }) {
  const { categories, expenses, settings } = data;
  const money = (n: number) => formatMoney(n, settings.currency);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Uncategorised';

  const [preset, setPreset] = useState<RangePreset>('this-month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);

  const range = preset === 'custom' ? custom : rangeForPreset(preset, today());
  const filtered = useMemo(
    () => filterExpenses(expenses, { search, categoryId, paymentMethod, ...range }, categories),
    [expenses, search, categoryId, paymentMethod, range.from, range.to, categories],
  );
  const total = sumAmounts(filtered);
  const byCat = totalsByCategory(filtered);
  const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  const budgets = budgetStatus(expenses, categories, today());
  const recurringCount = expenses.filter((e) => e.recurrence !== 'none').length;

  function save(e: Expense) {
    update((d) => {
      const exists = d.expenses.some((x) => x.id === e.id);
      return { ...d, expenses: exists ? d.expenses.map((x) => (x.id === e.id ? e : x)) : [...d.expenses, e] };
    });
    setEditing(null);
  }

  function remove(e: Expense) {
    const msg =
      e.recurrence !== 'none'
        ? 'Delete this recurring expense? Copies already created are kept; no new ones will be added.'
        : 'Delete this expense?';
    if (!confirm(msg)) return;
    update((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== e.id) }));
  }

  function duplicate(e: Expense) {
    setEditing({ ...e, id: newId(), date: today(), recurrence: 'none', occurrences: undefined, recurringSourceId: undefined });
  }

  function newExpense(): Expense {
    return {
      id: newId(),
      date: today(),
      amount: 0,
      categoryId: categoryId || categories[0]?.id || '',
      vendor: '',
      description: '',
      paymentMethod: 'Cash',
      notes: '',
      recurrence: 'none',
    };
  }

  return (
    <section>
      <div className="page-head">
        <h1>Expenses</h1>
        <div className="actions">
          <button
            className="btn"
            disabled={!filtered.length}
            onClick={() => downloadFile(`expenses-${today()}.csv`, expensesToCsv(filtered, categories), 'text/csv')}
          >
            Export CSV
          </button>
          <button className="btn primary" onClick={() => setEditing(newExpense())}>
            + Add expense
          </button>
        </div>
      </div>

      <div className="stats">
        <Stat label="Total spent" value={money(total)} sub={PRESETS.find((p) => p.value === preset)?.label} />
        <Stat label="Expenses" value={String(filtered.length)} sub={filtered.length ? `avg ${money(total / filtered.length)}` : undefined} />
        <Stat label="Top category" value={topCat ? catName(topCat[0]) : '—'} sub={topCat ? money(topCat[1]) : undefined} />
        <Stat label="Recurring" value={String(recurringCount)} sub="active schedules" />
      </div>

      <div className="filters card">
        <input type="search" placeholder="Search vendor, description, notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)} aria-label="Date range">
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {preset === 'custom' && (
          <>
            <input type="date" aria-label="From" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            <input type="date" aria-label="To" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </>
        )}
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')} aria-label="Payment method">
          <option value="">All payment methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>By category</h3>
          <BarList items={[...byCat.entries()].map(([id, v]) => ({ label: catName(id), value: v, display: money(v) }))} />
        </div>
        <div className="card">
          <h3>Budgets this month</h3>
          {budgets.length === 0 ? (
            <p className="muted">Set monthly budgets per category in Settings to track them here.</p>
          ) : (
            <ul className="barlist">
              {budgets.map((b) => (
                <li key={b.category.id}>
                  <div className="barlist-row">
                    <span>{b.category.name}</span>
                    <span className={`num ${b.ratio > 1 ? 'bad' : ''}`}>
                      {money(b.spent)} / {money(b.category.budget)}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${b.ratio > 1 ? 'over' : b.ratio > 0.8 ? 'warn' : ''}`}
                      style={{ width: `${Math.min(b.ratio, 1) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card table-wrap">
        {filtered.length === 0 ? (
          <p className="muted empty">No expenses match. Add one with “+ Add expense”.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Payment</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="nowrap">{formatDate(e.date)}</td>
                  <td>
                    <div>{e.description || e.vendor || '—'}</div>
                    <div className="muted small">
                      {e.description && e.vendor}
                      {e.recurrence !== 'none' && <span className="tag">↻ {RECURRENCE_LABEL[e.recurrence]}</span>}
                      {e.recurringSourceId && <span className="tag">auto</span>}
                      {e.receipt && (
                        <button className="link" onClick={() => setViewReceipt(e.receipt!)}>
                          receipt
                        </button>
                      )}
                    </div>
                  </td>
                  <td>{catName(e.categoryId)}</td>
                  <td>{e.paymentMethod}</td>
                  <td className="num">{money(e.amount)}</td>
                  <td className="row-actions">
                    <button className="link" onClick={() => setEditing(e)}>
                      Edit
                    </button>
                    <button className="link" onClick={() => duplicate(e)}>
                      Copy
                    </button>
                    <button className="link danger" onClick={() => remove(e)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total</td>
                <td className="num">{money(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {editing && (
        <ExpenseForm
          expense={editing}
          data={data}
          isNew={!expenses.some((x) => x.id === editing.id)}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {viewReceipt && (
        <Modal title="Receipt" onClose={() => setViewReceipt(null)}>
          <img src={viewReceipt} alt="Receipt" className="receipt-full" />
        </Modal>
      )}
    </section>
  );
}

function ExpenseForm({
  expense,
  data,
  isNew,
  onSave,
  onClose,
}: {
  expense: Expense;
  data: AppData;
  isNew: boolean;
  onSave: (e: Expense) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Expense>(expense);
  const [amountText, setAmountText] = useState(expense.amount ? String(expense.amount) : '');
  const [error, setError] = useState('');
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onReceipt(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Receipt must be an image.');
      return;
    }
    try {
      set('receipt', await shrinkImage(file));
      setError('');
    } catch {
      setError('Could not read that image.');
    }
  }

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.');
    if (!form.date) return setError('Pick a date.');
    if (!form.description.trim() && !form.vendor.trim()) return setError('Add a description or vendor.');
    onSave({ ...form, amount: Math.round(amount * 1000) / 1000, vendor: form.vendor.trim(), description: form.description.trim() });
  }

  return (
    <Modal title={isNew ? 'Add expense' : 'Edit expense'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <label>
            Amount ({data.settings.currency})
            <input inputMode="decimal" autoFocus value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="0.00" />
          </label>
          <label>
            Date
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </label>
        </div>
        <label>
          Description
          <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. 50 tola Cambodian oud oil" />
        </label>
        <div className="form-row">
          <label>
            Vendor / supplier
            <input value={form.vendor} onChange={(e) => set('vendor', e.target.value)} list="vendors" />
            <datalist id="vendors">
              {[...new Set(data.expenses.map((e) => e.vendor).filter(Boolean))].map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </label>
          <label>
            Category
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Payment method
            <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Repeat
            <select
              value={form.recurrence}
              disabled={!!form.recurringSourceId}
              onChange={(e) => set('recurrence', e.target.value as Recurrence)}
            >
              {RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {form.recurrence !== 'none' && (
          <p className="muted small">
            A copy is added automatically on each due date, starting from the date above. Set Repeat to “One-off” to stop.
          </p>
        )}
        <label>
          Notes
          <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
        <label>
          Receipt photo
          <input type="file" accept="image/*" capture="environment" onChange={(e) => onReceipt(e.target.files?.[0])} />
        </label>
        {form.receipt && (
          <div className="receipt-preview">
            <img src={form.receipt} alt="Receipt preview" />
            <button type="button" className="link danger" onClick={() => set('receipt', undefined)}>
              Remove receipt
            </button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Downscales a photo to keep browser storage small. */
function shrinkImage(file: File, maxSide = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad image'));
    };
    img.src = url;
  });
}
