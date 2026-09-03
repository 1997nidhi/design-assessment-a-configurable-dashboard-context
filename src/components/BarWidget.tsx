import type { Order } from "../domain";
export function BarWidget({
  rows,
  field,
}: {
  rows: Order[];
  field: keyof Order;
}) {
  const groups = rows.reduce<Record<string, number>>((all, row) => {
    const name = String(row[field]);
    all[name] = (all[name] || 0) + 1;
    return all;
  }, {});
  const max = Math.max(1, ...Object.values(groups));
  return (
    <div className="bars">
      {Object.entries(groups).map(([name, count]) => (
        <div
          className="bar"
          key={name}
          style={{ height: `${Math.max(12, (count / max) * 100)}%` }}
        >
          <label>{name}</label>
        </div>
      ))}
    </div>
  );
}
