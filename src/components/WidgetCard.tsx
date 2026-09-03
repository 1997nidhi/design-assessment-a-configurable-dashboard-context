import type { Order, Widget } from "../domain";
import { BarWidget } from "./BarWidget";
import { MetricWidget } from "./MetricWidget";
import { TableWidget } from "./TableWidget";
import { WidgetComposer } from "./WidgetComposer";
type Props = {
  widget: Widget;
  rows: Order[];
  onMove: (amount: number) => void;
  onResize: (span: number) => void;
  onRemove: () => void;
};
export function WidgetCard({
  widget,
  rows,
  onMove,
  onResize,
  onRemove,
}: Props) {
  const field = widget.binding.field as keyof Order;
  const missing = rows.some((row) => !(field in row));
  const content = missing ? (
    <p className="error-detail">
      Cannot show truth: field “{field}” is missing from the live schema.
    </p>
  ) : widget.type === "metric" ? (
    <MetricWidget rows={rows} field={field} />
  ) : widget.type === "bar" ? (
    <BarWidget rows={rows} field={field} />
  ) : (
    <TableWidget rows={rows} field={field} />
  );
  return (
    <article
      className="widget"
      style={{ gridColumn: `span ${widget.layout.span}` }}
    >
      <div className="widget-head">
        <div>
          <h3>{widget.title}</h3>
          <p className="sub">Binding: {field}</p>
        </div>
        <span className="pill">{widget.type}</span>
      </div>
      {content}
      <WidgetComposer
        title={widget.title}
        span={widget.layout.span}
        onMove={onMove}
        onResize={onResize}
      />
      <button className="remove secondary" onClick={onRemove}>
        Remove
      </button>
    </article>
  );
}
