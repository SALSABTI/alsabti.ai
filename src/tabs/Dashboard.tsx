import Stat from '../components/Stat';
import BarList from '../components/BarList';
import type { AppData } from '../types';
import { addMonths, monthKey, monthLabel, startOfMonth, today } from '../lib/dates';
import { nextOccurrence, round2, sumAmounts, totalsByCategory } from '../lib/expenses';
import { formatDate, formatMoney } from '../lib/format';
import { saleTotal } from '../lib/sales';

type Tab = 'Dashboard' | 'Sales' | 'Expenses' | 'Inventory' | 'Customers' | 'Settings';

export default function Dashboard({ data, goTo }: { data: AppData; goTo: (t: Tab) => void }) {
  const money = (n: number) => formatMoney(n, data.settings.currency);
  const catName = (id: string) => data.categories.find((c) => c.id === id)?.name ?? 'Uncategorised';
  const now = today();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(addMonths(startOfMonth(now), -1));

  const revenueIn = (m: string) => round2(data.sales.filter((s) => monthKey(s.date) === m).reduce((t, s) => t + saleTotal(s), 0));
  const expensesIn = (m: string) => sumAmounts(data.expenses.filter((e) => monthKey(e.date) === m));

  const revenue = revenueIn(thisMonth);
  const spent = expensesIn(thisMonth);
  const profit = round2(revenue - spent);
  const lastSpent = expensesIn(lastMonth);
  const change = lastSpent ? Math.round(((spent - lastSpent) / lastSpent) * 100) : null;

  const months = Array.from({ length: 6 }, (_, i) => monthKey(addMonths(startOfMonth(now), i - 5)));
  const series = months.map((m) => ({ m, rev: revenueIn(m), exp: expensesIn(m) }));
  const max = Math.max(1, ...series.flatMap((s) => [s.rev, s.exp]));

  const lowStock = data.products.filter((p) => p.stock <= p.lowStock);
  const upcoming = data.expenses
    .filter((e) => e.recurrence !== 'none')
    .map((e) => ({ e, next: nextOccurrence(e.date, e.recurrence, (e.occurrences ?? 0) + 1) }))
    .sort((a, b) => (a.next < b.next ? -1 : 1))
    .slice(0, 5);
  const byCat = totalsByCategory(data.expenses.filter((e) => monthKey(e.date) === thisMonth));

  return (
    <section>
      <div className="page-head">
        <h1>Overview · {monthLabel(thisMonth)}</h1>
      </div>
      <div className="stats">
        <Stat label="Revenue" value={money(revenue)} />
        <Stat
          label="Expenses"
          value={money(spent)}
          sub={change === null ? undefined : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% vs last month`}
        />
        <Stat label="Net profit" value={money(profit)} tone={profit < 0 ? 'bad' : profit > 0 ? 'good' : undefined} />
        <Stat label="Margin" value={revenue ? `${Math.round((profit / revenue) * 100)}%` : '—'} />
      </div>

      <div className="card">
        <h3>Revenue vs expenses · last 6 months</h3>
        <div className="chart" role="img" aria-label="Revenue and expenses by month">
          {series.map((s) => (
            <div className="chart-col" key={s.m}>
              <div className="chart-bars">
                <div className="chart-bar rev" style={{ height: `${(s.rev / max) * 100}%` }} title={`Revenue ${money(s.rev)}`} />
                <div className="chart-bar exp" style={{ height: `${(s.exp / max) * 100}%` }} title={`Expenses ${money(s.exp)}`} />
              </div>
              <div className="chart-label">{monthLabel(s.m).split(' ')[0]}</div>
            </div>
          ))}
        </div>
        <div className="legend">
          <span>
            <i className="dot rev" /> Revenue
          </span>
          <span>
            <i className="dot exp" /> Expenses
          </span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Where the money went</h3>
            <button className="link" onClick={() => goTo('Expenses')}>
              All expenses →
            </button>
          </div>
          <BarList items={[...byCat.entries()].map(([id, v]) => ({ label: catName(id), value: v, display: money(v) }))} />
        </div>
        <div className="card">
          <h3>Upcoming recurring expenses</h3>
          {upcoming.length === 0 ? (
            <p className="muted">None scheduled. Set “Repeat” on an expense for rent, salaries and the like.</p>
          ) : (
            <ul className="simple-list">
              {upcoming.map(({ e, next }) => (
                <li key={e.id}>
                  <span>
                    {e.description || e.vendor}
                    <span className="muted small"> · {formatDate(next)}</span>
                  </span>
                  <span className="num">{money(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Low stock</h3>
            <button className="link" onClick={() => goTo('Inventory')}>
              Inventory →
            </button>
          </div>
          {lowStock.length === 0 ? (
            <p className="muted">{data.products.length ? 'All products are well stocked.' : 'No products yet.'}</p>
          ) : (
            <ul className="simple-list">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <span className="num bad">{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
