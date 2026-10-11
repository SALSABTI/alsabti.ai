import { useState, type FormEvent } from 'react';
import Modal from '../components/Modal';
import Stat from '../components/Stat';
import type { AppData, PaymentMethod, Sale } from '../types';
import { PAYMENT_METHODS } from '../types';
import type { Updater } from '../lib/store';
import { monthKey, today } from '../lib/dates';
import { downloadFile, formatDate, formatMoney, newId, toCsv } from '../lib/format';
import { saleTotal, salesInMonth } from '../lib/sales';

export default function Sales({ data, update }: { data: AppData; update: Updater }) {
  const { sales, products, customers, settings } = data;
  const money = (n: number) => formatMoney(n, settings.currency);
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? 'Deleted product';
  const customerName = (id?: string) => (id && customers.find((c) => c.id === id)?.name) || 'Walk-in';
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const month = salesInMonth(sales, monthKey(today()));
  const q = search.trim().toLowerCase();
  const list = [...sales]
    .filter((s) => !q || `${productName(s.productId)} ${customerName(s.customerId)}`.toLowerCase().includes(q))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  function add(s: Sale) {
    update((d) => ({
      ...d,
      sales: [...d.sales, s],
      products: d.products.map((p) => (p.id === s.productId ? { ...p, stock: p.stock - s.quantity } : p)),
    }));
    setAdding(false);
  }

  function remove(s: Sale) {
    if (!confirm('Delete this sale? Its quantity goes back into stock.')) return;
    update((d) => ({
      ...d,
      sales: d.sales.filter((x) => x.id !== s.id),
      products: d.products.map((p) => (p.id === s.productId ? { ...p, stock: p.stock + s.quantity } : p)),
    }));
  }

  function exportCsv() {
    downloadFile(
      `sales-${today()}.csv`,
      toCsv([
        ['Date', 'Product', 'Customer', 'Qty', 'Unit price', 'Discount', 'Total', 'Payment'],
        ...list.map((s) => [s.date, productName(s.productId), customerName(s.customerId), s.quantity, s.unitPrice, s.discount, saleTotal(s), s.paymentMethod]),
      ]),
      'text/csv',
    );
  }

  return (
    <section>
      <div className="page-head">
        <h1>Sales</h1>
        <div className="actions">
          <button className="btn" disabled={!list.length} onClick={exportCsv}>
            Export CSV
          </button>
          <button className="btn primary" disabled={!products.length} onClick={() => setAdding(true)} title={products.length ? '' : 'Add a product first'}>
            + Record sale
          </button>
        </div>
      </div>
      <div className="stats">
        <Stat label="Revenue this month" value={money(month.reduce((t, s) => t + saleTotal(s), 0))} />
        <Stat label="Sales this month" value={String(month.length)} />
        <Stat label="Items sold this month" value={String(month.reduce((t, s) => t + s.quantity, 0))} />
      </div>
      {!products.length && <p className="card muted">Add products in the Inventory tab before recording sales.</p>}
      <div className="filters card">
        <input type="search" placeholder="Search product or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card table-wrap">
        {list.length === 0 ? (
          <p className="muted empty">No sales yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Customer</th>
                <th className="num">Qty</th>
                <th className="num">Total</th>
                <th>Payment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="nowrap">{formatDate(s.date)}</td>
                  <td>{productName(s.productId)}</td>
                  <td>{customerName(s.customerId)}</td>
                  <td className="num">{s.quantity}</td>
                  <td className="num">{money(saleTotal(s))}</td>
                  <td>{s.paymentMethod}</td>
                  <td className="row-actions">
                    <button className="link danger" onClick={() => remove(s)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {adding && <SaleForm data={data} onSave={add} onClose={() => setAdding(false)} />}
    </section>
  );
}

function SaleForm({ data, onSave, onClose }: { data: AppData; onSave: (s: Sale) => void; onClose: () => void }) {
  const first = data.products[0];
  const [productId, setProductId] = useState(first.id);
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(today());
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState(String(first.price));
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [error, setError] = useState('');
  const product = data.products.find((p) => p.id === productId)!;

  function submit(e: FormEvent) {
    e.preventDefault();
    const quantity = Number(qty);
    const unitPrice = Number(price);
    const disc = Number(discount || 0);
    if (!Number.isInteger(quantity) || quantity <= 0) return setError('Quantity must be a whole number above zero.');
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return setError('Enter a valid price.');
    if (!Number.isFinite(disc) || disc < 0) return setError('Enter a valid discount.');
    if (quantity > product.stock && !confirm(`Only ${product.stock} in stock. Record the sale anyway?`)) return;
    onSave({ id: newId(), date, productId, customerId: customerId || undefined, quantity, unitPrice, discount: disc, paymentMethod });
  }

  return (
    <Modal title="Record sale" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Product
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setPrice(String(data.products.find((p) => p.id === e.target.value)?.price ?? 0));
            }}
          >
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.size && `(${p.size})`} — {p.stock} in stock
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            Customer
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in</option>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Quantity
            <input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <label>
            Unit price
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Discount (total)
            <input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </label>
          <label>
            Payment method
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted">
          Total:{' '}
          <strong>
            {formatMoney(Math.max(0, (Number(qty) || 0) * (Number(price) || 0) - (Number(discount) || 0)), data.settings.currency)}
          </strong>
        </p>
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
