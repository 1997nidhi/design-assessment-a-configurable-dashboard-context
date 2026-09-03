import type { Order, Widget } from '../domain';
import { WidgetCard } from './WidgetCard';
type Props = { widgets: Widget[]; rows: Order[]; onMove: (id: string, amount: number) => void; onResize: (id: string, span: number) => void; onRemove: (id: string) => void };
export function DashboardGrid({ widgets, rows, onMove, onResize, onRemove }: Props) { return <div className="grid">{widgets.map(widget => <WidgetCard key={widget.id} widget={widget} rows={rows} onMove={amount => onMove(widget.id, amount)} onResize={span => onResize(widget.id, span)} onRemove={() => onRemove(widget.id)} />)}</div>; }
