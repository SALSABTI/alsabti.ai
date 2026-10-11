import { useRef, useState } from 'react';
import type { AppData } from '../types';
import { emptyData, normalizeData, type Updater } from '../lib/store';
import { today } from '../lib/dates';
import { downloadFile, newId } from '../lib/format';

const CURRENCIES = ['OMR', 'AED', 'SAR', 'KWD', 'BHD', 'QAR', 'USD', 'EUR', 'GBP'];

export default function SettingsTab({ data, update }: { data: AppData; update: Updater }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [newCat, setNewCat] = useState('');

  const setSetting = (k: keyof AppData['settings'], v: string) => update((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));

  function setCategory(id: string, patch: { name?: string; budget?: number }) {
    update((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }

  function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    update((d) => ({ ...d, categories: [...d.categories, { id: newId(), name, budget: 0 }] }));
    setNewCat('');
  }

  function removeCategory(id: string) {
    if (data.categories.length <= 1) return;
    const fallback = data.categories.find((c) => c.id !== id)!;
    const used = data.expenses.filter((e) => e.categoryId === id).length;
    if (used && !confirm(`${used} expense(s) use this category. Move them to “${fallback.name}” and delete it?`)) return;
    update((d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id),
      expenses: d.expenses.map((e) => (e.categoryId === id ? { ...e, categoryId: fallback.id } : e)),
    }));
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const imported = normalizeData(JSON.parse(await file.text()));
      if (!confirm('Replace all current data with this backup?')) return;
      update(() => imported);
      setMessage('Backup restored.');
    } catch {
      setMessage('That file is not a valid Autra Oud backup.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <div className="card form">
        <h3>Business</h3>
        <div className="form-row">
          <label>
            Business name
            <input value={data.settings.businessName} onChange={(e) => setSetting('businessName', e.target.value)} />
          </label>
          <label>
            Currency
            <select value={data.settings.currency} onChange={(e) => setSetting('currency', e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Expense categories & monthly budgets</h3>
        <p className="muted small">Leave the budget at 0 for no limit. Budgets show on the Expenses tab.</p>
        <ul className="cat-list">
          {data.categories.map((c) => (
            <li key={c.id}>
              <input aria-label="Category name" value={c.name} onChange={(e) => setCategory(c.id, { name: e.target.value })} />
              <input
                aria-label="Monthly budget"
                inputMode="decimal"
                value={c.budget || ''}
                placeholder="Budget"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 0) setCategory(c.id, { budget: n });
                }}
              />
              <button className="link danger" disabled={data.categories.length <= 1} onClick={() => removeCategory(c.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div className="inline-add">
          <input placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
          <button className="btn" onClick={addCategory}>
            Add
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Backup & data</h3>
        <p className="muted small">Data is stored in this browser only. Download a backup regularly, or to move to another device.</p>
        <div className="actions">
          <button className="btn" onClick={() => downloadFile(`autra-oud-backup-${today()}.json`, JSON.stringify(data, null, 2), 'application/json')}>
            Download backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Restore backup…
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importBackup(e.target.files?.[0])} />
          <button
            className="btn danger"
            onClick={() => confirm('Delete ALL data? Download a backup first if unsure.') && update(() => emptyData())}
          >
            Reset all data
          </button>
        </div>
        {message && <p className="muted">{message}</p>}
      </div>
    </section>
  );
}
