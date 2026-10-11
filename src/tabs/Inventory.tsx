import { useState, type FormEvent } from 'react';
import Modal from '../components/Modal';
import Stat from '../components/Stat';
import type { AppData, Product, ProductType } from '../types';
import { PRODUCT_TYPES } from '../types';
import type { Updater } from '../lib/store';
import { formatMoney, newId } from '../lib/format';

export default function Inventory({ data, update }: { data: AppData; update: Updater }) {
  const money = (n: number) => formatMoney(n, data.settings.currency);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ProductType | ''>('');
  const [lowOnly, setLowOnly] = useState(false);

  const q = search.trim().toLowerCase();
  const list = data.products
    .filter((p) => (!type || p.type === type) && (!lowOnly || p.stock <= p.lowStock))
    .filter((p) => !q || `${p.name} ${p.sku}`.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
  const stockValue = data.products.reduce((t, p) => t + Math.max(0, p.stock) * p.cost, 0);
  const lowCount = data.products.filter((p) => p.stock <= p.lowStock).length;

  function save(p: Product) {
    update((d) => ({
      ...d,
      products: d.products.some((x) => x.id === p.id) ? d.products.map((x) => (x.id === p.id ? p : x)) : [...d.products, p],
    }));
    setEditing(null);
  }

  function remove(p: Product) {
    if (!confirm(`Delete “${p.name}”? Past sales keep their totals.`)) return;
    update((d) => ({ ...d, products: d.products.filter((x) => x.id !== p.id) }));
  }

  return (
    <section>
      <div className="page-head">
        <h1>Inventory</h1>
        <div className="actions">
          <button
            className="btn primary"
            onClick={() => setEditing({ id: newId(), name: '', sku: '', type: 'Oud oil', size: '', cost: 0, price: 0, stock: 0, lowStock: 5 })}
          >
            + Add product
          </button>
        </div>
      </div>
      <div className="stats">
        <Stat label="Products" value={String(data.products.length)} />
        <Stat label="Stock value (cost)" value={money(stockValue)} />
        <Stat label="Low stock" value={String(lowCount)} tone={lowCount ? 'bad' : undefined} />
      </div>
      <div className="filters card">
        <input type="search" placeholder="Search name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value as ProductType | '')} aria-label="Type">
          <option value="">All types</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only
        </label>
      </div>
      <div className="card table-wrap">
        {list.length === 0 ? (
          <p className="muted empty">No products yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th className="num">Cost</th>
                <th className="num">Price</th>
                <th className="num">Margin</th>
                <th className="num">Stock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div>{p.name}</div>
                    <div className="muted small">{[p.size, p.sku].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td>{p.type}</td>
                  <td className="num">{money(p.cost)}</td>
                  <td className="num">{money(p.price)}</td>
                  <td className="num">{p.price > 0 ? `${Math.round(((p.price - p.cost) / p.price) * 100)}%` : '—'}</td>
                  <td className={`num ${p.stock <= p.lowStock ? 'bad' : ''}`}>{p.stock}</td>
                  <td className="row-actions">
                    <button className="link" onClick={() => setEditing(p)}>
                      Edit
                    </button>
                    <button className="link danger" onClick={() => remove(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editing && (
        <ProductForm
          product={editing}
          isNew={!data.products.some((p) => p.id === editing.id)}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function ProductForm({ product, isNew, onSave, onClose }: { product: Product; isNew: boolean; onSave: (p: Product) => void; onClose: () => void }) {
  const [f, setF] = useState({
    ...product,
    cost: String(product.cost),
    price: String(product.price),
    stock: String(product.stock),
    lowStock: String(product.lowStock),
  });
  const [error, setError] = useState('');
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const nums = { cost: Number(f.cost), price: Number(f.price), stock: Number(f.stock), lowStock: Number(f.lowStock) };
    if (!f.name.trim()) return setError('Name is required.');
    if (Object.values(nums).some((n) => !Number.isFinite(n) || n < 0)) return setError('Numbers must be zero or more.');
    if (!Number.isInteger(nums.stock) || !Number.isInteger(nums.lowStock)) return setError('Stock must be whole numbers.');
    onSave({ ...f, name: f.name.trim(), ...nums });
  }

  return (
    <Modal title={isNew ? 'Add product' : 'Edit product'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Name
          <input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Royal Cambodi Oud" />
        </label>
        <div className="form-row">
          <label>
            Type
            <select value={f.type} onChange={(e) => set('type', e.target.value)}>
              {PRODUCT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Size
            <input value={f.size} onChange={(e) => set('size', e.target.value)} placeholder="e.g. 3 ml, 1 tola, 50 g" />
          </label>
        </div>
        <label>
          SKU
          <input value={f.sku} onChange={(e) => set('sku', e.target.value)} />
        </label>
        <div className="form-row">
          <label>
            Cost
            <input inputMode="decimal" value={f.cost} onChange={(e) => set('cost', e.target.value)} />
          </label>
          <label>
            Selling price
            <input inputMode="decimal" value={f.price} onChange={(e) => set('price', e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            In stock
            <input inputMode="numeric" value={f.stock} onChange={(e) => set('stock', e.target.value)} />
          </label>
          <label>
            Low-stock alert at
            <input inputMode="numeric" value={f.lowStock} onChange={(e) => set('lowStock', e.target.value)} />
          </label>
        </div>
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
