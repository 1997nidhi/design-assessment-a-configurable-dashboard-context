import type { Order } from '../domain';
export function MetricWidget({ rows, field }: { rows: Order[]; field: keyof Order }) { const value = rows.reduce((total, row) => total + (typeof row[field] === 'number' ? row[field] as number : 0), 0); return <div className="metric-value">{value}<small> orders</small></div>; }
