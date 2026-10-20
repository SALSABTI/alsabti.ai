---
name: add-app-feature
description: Add a new tab, page or feature to the Autra Oud business app (e.g. "add an expenses tab", "add a suppliers page", "add discounts to sales"). Use whenever the user asks to add, extend or change a feature in the app, so the result matches the existing code, works on phones, and is verified before it is pushed.
---

# Adding a feature to the Autra Oud app

The owner runs an oud & perfume business and uses this app daily, often on a phone.
They are not a developer: explain results in plain business terms, not code terms.

## 1. Find the real app first

- The production app is deployed on Vercel. Make sure the repository you are editing is the one
  that Vercel builds. If the only code available is a different repo, say so before writing
  anything, and ask for the right repo rather than building a parallel app.
- Read `package.json`, the router or tab list, one existing feature end to end (list → form →
  save → display) and how data is stored (localStorage, a database, an API route).
  Copy those patterns; do not introduce a new framework, state library or styling system.

## 2. Plan the feature in business terms

Before coding, list what the owner will be able to do, as short bullets. Include the "common
features" an owner expects for anything that holds records, unless clearly irrelevant:

- add / edit / delete (with a confirmation before deleting)
- search, filters, and a date range (this month, last month, this year, all, custom)
- totals or summary cards at the top
- export to CSV
- empty state that tells the user what to do first
- validation with clear messages (amounts > 0, required names, whole numbers for quantities)

Money: store numbers, format with the business currency from settings (default OMR, 3 decimals).
Dates: store `YYYY-MM-DD` strings and compare them as strings, to avoid time-zone day shifts.

## 3. Build

- Keep calculations (totals, filtering, recurring dates, CSV) in plain functions separate from UI,
  so they can be unit-tested.
- New fields on existing records must be optional, or migrated when loading old data, so data the
  owner already saved keeps working.
- Layout must work at 390px wide: no horizontal page scroll, forms in one column, tables
  scroll inside their own container.

## 4. Verify before pushing

Run whatever the repo has, in this order, and fix failures:

1. typecheck / lint
2. unit tests (add tests for the new calculation functions)
3. production build (`npm run build`)
4. drive the real page in Chromium (Playwright is preinstalled; launch with
   `executablePath: '/opt/pw-browsers/chromium'` if versions differ): add a record, edit it,
   filter it, delete it; take desktop and 390px screenshots and look at them; check the console
   has no errors.

Save screenshots and scratch scripts in the scratchpad, never in the repo.

## 5. Report

Tell the owner, in a few lines: what they can now do, what you checked, and anything to know
(e.g. where data is stored, anything you assumed). Commit with a clear message and push to the
session's branch. Don't open a pull request unless asked.

## Reference

`src/tabs/Expenses.tsx` with `src/lib/expenses.ts` and `src/lib/expenses.test.ts` in the
`alsabti.ai` repo is a complete worked example of a feature built this way.
