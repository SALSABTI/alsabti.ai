import { useState } from 'react';
import { useAppData } from './lib/store';
import Dashboard from './tabs/Dashboard';
import Expenses from './tabs/Expenses';
import Sales from './tabs/Sales';
import Inventory from './tabs/Inventory';
import Customers from './tabs/Customers';
import SettingsTab from './tabs/Settings';

const TABS = ['Dashboard', 'Sales', 'Expenses', 'Inventory', 'Customers', 'Settings'] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const { data, update, saveError } = useAppData();
  const [tab, setTab] = useState<Tab>('Dashboard');

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo" aria-hidden>
            ◆
          </span>
          {data.settings.businessName}
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
      </header>
      {saveError && <div className="alert">{saveError}</div>}
      <main className="main">
        {tab === 'Dashboard' && <Dashboard data={data} goTo={setTab} />}
        {tab === 'Sales' && <Sales data={data} update={update} />}
        {tab === 'Expenses' && <Expenses data={data} update={update} />}
        {tab === 'Inventory' && <Inventory data={data} update={update} />}
        {tab === 'Customers' && <Customers data={data} update={update} />}
        {tab === 'Settings' && <SettingsTab data={data} update={update} />}
      </main>
    </div>
  );
}
