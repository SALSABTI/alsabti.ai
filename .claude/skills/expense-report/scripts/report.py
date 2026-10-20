#!/usr/bin/env python3
"""Summarise Autra Oud expenses (and sales) for one month. Prints JSON.

Usage: report.py <backup.json | expenses.csv> [--sales sales.csv] [--month YYYY-MM]
"""
import argparse
import csv
import json
import sys
from collections import defaultdict


def prev_month(m):
    y, mo = int(m[:4]), int(m[5:7])
    return f"{y - 1}-12" if mo == 1 else f"{y}-{mo - 1:02d}"


def r(x):
    return round(x, 3)


def load_json(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    cats = {c["id"]: c for c in d.get("categories", [])}
    products = {p["id"]: p for p in d.get("products", [])}
    expenses = [
        {
            "date": e["date"],
            "amount": float(e["amount"]),
            "category": cats.get(e.get("categoryId"), {}).get("name", "Uncategorised"),
            "label": e.get("description") or e.get("vendor") or "",
            "vendor": e.get("vendor", ""),
            "recurring": e.get("recurrence", "none") if e.get("recurrence", "none") != "none" else "",
        }
        for e in d.get("expenses", [])
    ]
    sales = [
        {
            "date": s["date"],
            "total": max(0.0, s["quantity"] * s["unitPrice"] - s.get("discount", 0)),
            "product": products.get(s.get("productId"), {}).get("name", ""),
        }
        for s in d.get("sales", [])
    ]
    budgets = {c["name"]: float(c.get("budget") or 0) for c in cats.values() if c.get("budget")}
    currency = d.get("settings", {}).get("currency", "OMR")
    return expenses, sales, budgets, currency


def load_expenses_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return [
            {
                "date": row["Date"],
                "amount": float(row["Amount"]),
                "category": row.get("Category") or "Uncategorised",
                "label": row.get("Description") or row.get("Vendor") or "",
                "vendor": row.get("Vendor", ""),
                "recurring": row.get("Recurring", "") if row.get("Recurring") not in ("", "auto", None) else "",
            }
            for row in csv.DictReader(f)
        ]


def load_sales_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return [{"date": row["Date"], "total": float(row["Total"]), "product": row.get("Product", "")} for row in csv.DictReader(f)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--sales")
    ap.add_argument("--month")
    a = ap.parse_args()

    if a.file.lower().endswith(".json"):
        expenses, sales, budgets, currency = load_json(a.file)
    else:
        expenses, sales, budgets, currency = load_expenses_csv(a.file), [], {}, None
    if a.sales:
        sales = load_sales_csv(a.sales)
    if not expenses and not sales:
        sys.exit("No expenses or sales found in the input.")

    month = a.month or max(e["date"][:7] for e in (expenses or [{"date": s["date"]} for s in sales]))
    prev = prev_month(month)

    def spent(m):
        return r(sum(e["amount"] for e in expenses if e["date"][:7] == m))

    def revenue(m):
        return r(sum(s["total"] for s in sales if s["date"][:7] == m))

    this_exp = [e for e in expenses if e["date"][:7] == month]
    by_cat, prev_cat = defaultdict(float), defaultdict(float)
    for e in this_exp:
        by_cat[e["category"]] += e["amount"]
    for e in expenses:
        if e["date"][:7] == prev:
            prev_cat[e["category"]] += e["amount"]

    total, total_prev = spent(month), spent(prev)
    history, m = [], month
    for _ in range(6):
        history.append({"month": m, "expenses": spent(m), "revenue": revenue(m) if sales else None})
        m = prev_month(m)

    out = {
        "month": month,
        "currency": currency,
        "expenses": total,
        "expenses_prev_month": total_prev,
        "change_pct": r((total - total_prev) / total_prev * 100) if total_prev else None,
        "count": len(this_exp),
        "by_category": [
            {
                "category": c,
                "amount": r(v),
                "share_pct": r(v / total * 100) if total else 0,
                "prev_month": r(prev_cat.get(c, 0)),
                "change_pct": r((v - prev_cat[c]) / prev_cat[c] * 100) if prev_cat.get(c) else None,
            }
            for c, v in sorted(by_cat.items(), key=lambda kv: -kv[1])
        ],
        "budgets": [
            {"category": c, "budget": b, "spent": r(by_cat.get(c, 0)), "used_pct": r(by_cat.get(c, 0) / b * 100)}
            for c, b in sorted(budgets.items())
        ],
        "largest": sorted(
            ({"date": e["date"], "label": e["label"], "category": e["category"], "amount": r(e["amount"])} for e in this_exp),
            key=lambda x: -x["amount"],
        )[:5],
        "new_vendors": sorted(
            {e["vendor"] for e in this_exp if e["vendor"]} - {e["vendor"] for e in expenses if e["date"][:7] < month}
        ),
        "recurring": sorted({(e["label"], e["recurring"], r(e["amount"])) for e in expenses if e["recurring"]}),
        "history": list(reversed(history)),
    }
    if sales:
        rev = revenue(month)
        out.update(revenue=rev, net_profit=r(rev - total), margin_pct=r((rev - total) / rev * 100) if rev else None)
    out["recurring"] = [{"label": l, "every": f, "amount": amt} for l, f, amt in out["recurring"]]
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    print()


if __name__ == "__main__":
    main()
