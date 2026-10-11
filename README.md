# Autra Oud — business manager

A web app for running an oud & perfume business: track expenses, sales, stock and customers in one place.

## Features

**Expenses tab**
- Add, edit, copy and delete expenses (amount, date, description, vendor, category, payment method, notes)
- Receipt photos (taken with the phone camera or uploaded; resized automatically)
- Recurring expenses (weekly / monthly / yearly): copies are created automatically on each due date
- Filters: search text, date range (this month, last month, last 90 days, this year, all time, custom), category, payment method
- Summary cards: total, count and average, top category, active recurring schedules
- Spending by category, and monthly budgets per category with warnings when one is near or over its limit
- Export the filtered list to CSV (opens in Excel / Google Sheets)

**Other tabs**
- **Dashboard**: this month's revenue, expenses, net profit and margin; six-month revenue vs. expenses chart; upcoming recurring expenses; low-stock alerts
- **Sales**: record sales (stock is deducted automatically), discounts, payment method, CSV export
- **Inventory**: products (oud oil, perfume, bakhoor, oud wood, gift sets) with cost, price, margin, stock and low-stock threshold
- **Customers**: contact details, scent preferences, order count, total spent, WhatsApp link
- **Settings**: business name, currency (OMR, AED, SAR, KWD, BHD, QAR, USD, EUR, GBP), expense categories and budgets, backup / restore / reset

Data is saved in the browser (localStorage). Use **Settings → Download backup** regularly or to move data to another device.

## Development

```bash
npm install
npm run dev        # start locally
npm test           # unit tests
npm run build      # production build in dist/
```

Built with React, TypeScript and Vite. It deploys as a static site (e.g. on Vercel with the Vite preset).
