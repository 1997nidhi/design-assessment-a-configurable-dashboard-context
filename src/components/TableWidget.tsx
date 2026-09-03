import type { Order } from "../domain";
export function TableWidget({
  rows,
  field,
}: {
  rows: Order[];
  field: keyof Order;
}) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Region</th>
          <th>Priority</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.id}</td>
            <td>{row.region}</td>
            <td>{row.priority}</td>
            <td>{String(row[field])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
