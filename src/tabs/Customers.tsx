import { useState, type FormEvent } from 'react';
import Modal from '../components/Modal';
import type { AppData, Customer } from '../types';
import type { Updater } from '../lib/store';
import { formatDate, formatMoney, newId } from '../lib/format';
import { saleTotal } from '../lib/sales';

export default function Customers({ data, update }: { data: AppData; update: Updater }) {
  const money = (n: number) => formatMoney(n, data.settings.currency);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');

  const stats = new Map<string, { spent: number; orders: number; last: string }>();
  for (const s of data.sales) {
    if (!s.customerId) continue;
    const cur = stats.get(s.customerId) ?? { spent: 0, orders: 0, last: '' };
    stats.set(s.customerId, { spent: cur.spent + saleTotal(s), orders: cur.orders + 1, last: s.date > cur.last ? s.date : cur.last });
  }
  const q = search.trim().toLowerCase();
  const list = data.customers
    .filter((c) => !q || `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q))
    .sort((a, b) => (stats.get(b.id)?.spent ?? 0) - (stats.get(a.id)?.spent ?? 0));

  function save(c: Customer) {
    update((d) => ({
      ...d,
      customers: d.customers.some((x) => x.id === c.id) ? d.customers.map((x) => (x.id === c.id ? c : x)) : [...d.customers, c],
    }));
    setEditing(null);
  }

  function remove(c: Customer) {
    if (!confirm(`Delete ${c.name}? Their past sales become walk-in sales.`)) return;
    update((d) => ({
      ...d,
      customers: d.customers.filter((x) => x.id !== c.id),
      sales: d.sales.map((s) => (s.customerId === c.id ? { ...s, customerId: undefined } : s)),
    }));
  }

  return (
    <section>
      <div className="page-head">
        <h1>Customers</h1>
        <div className="actions">
          <button className="btn primary" onClick={() => setEditing({ id: newId(), name: '', phone: '', email: '', notes: '' })}>
            + Add customer
          </button>
        </div>
      </div>
      <div className="filters card">
        <input type="search" placeholder="Search name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card table-wrap">
        {list.length === 0 ? (
          <p className="muted empty">No customers yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th className="num">Orders</th>
                <th className="num">Total spent</th>
                <th>Last order</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const s = stats.get(c.id);
                const wa = c.phone.replace(/[^\d]/g, '');
                return (
                  <tr key={c.id}>
                    <td>
                      <div>{c.name}</div>
                      {c.notes && <div className="muted small">{c.notes}</div>}
                    </td>
                    <td>
                      <div>
                        {c.phone}
                        {wa && (
                          <a className="tag" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                            WhatsApp
                          </a>
                        )}
                      </div>
                      <div className="muted small">{c.email}</div>
                    </td>
                    <td className="num">{s?.orders ?? 0}</td>
                    <td className="num">{money(s?.spent ?? 0)}</td>
                    <td className="nowrap">{s?.last ? formatDate(s.last) : '—'}</td>
                    <td className="row-actions">
                      <button className="link" onClick={() => setEditing(c)}>
                        Edit
                      </button>
                      <button className="link danger" onClick={() => remove(c)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {editing && (
        <CustomerForm customer={editing} isNew={!data.customers.some((c) => c.id === editing.id)} onSave={save} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}

function CustomerForm({ customer, isNew, onSave, onClose }: { customer: Customer; isNew: boolean; onSave: (c: Customer) => void; onClose: () => void }) {
  const [f, setF] = useState(customer);
  const [error, setError] = useState('');
  const set = (k: keyof Customer, v: string) => setF((x) => ({ ...x, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setError('Name is required.');
    onSave({ ...f, name: f.name.trim() });
  }

  return (
    <Modal title={isNew ? 'Add customer' : 'Edit customer'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Name
          <input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <div className="form-row">
          <label>
            Phone (with country code)
            <input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+968 …" />
          </label>
          <label>
            Email
            <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
          </label>
        </div>
        <label>
          Notes / scent preferences
          <textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
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
