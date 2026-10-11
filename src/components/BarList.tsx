export interface BarItem {
  label: string;
  value: number;
  display: string;
}

/** Horizontal bars sorted largest first; widths are relative to the largest value. */
export default function BarList({ items }: { items: BarItem[] }) {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value ?? 0;
  if (!sorted.length) return <p className="muted">No data for this period.</p>;
  return (
    <ul className="barlist">
      {sorted.map((i) => (
        <li key={i.label}>
          <div className="barlist-row">
            <span>{i.label}</span>
            <span className="num">{i.display}</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
