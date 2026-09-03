import { useEffect, useState } from "react";
import {
  defaults,
  fetchOrders,
  type DashboardConfig,
  type Order,
  type Widget,
} from "./domain";
const K = "relayboard-react-v1";
const copy = <T,>(x: T) => structuredClone(x);
function Card({
  w,
  rows,
  onChange,
  onRemove,
}: {
  w: Widget;
  rows: Order[];
  onChange: (x: Partial<Widget>) => void;
  onRemove: () => void;
}) {
  const f = w.binding.field as keyof Order;
  const missing = rows.some((r) => !(f in r));
  let body;
  if (missing)
    body = (
      <p className="error-detail">
        Cannot show truth: field “{f}” is missing from the live schema.
      </p>
    );
  else if (w.type === "metric")
    body = (
      <div className="metric-value">
        {rows.reduce(
          (n, r) => n + (typeof r[f] === "number" ? (r[f] as number) : 0),
          0,
        )}
        <small> orders</small>
      </div>
    );
  else if (w.type === "bar") {
    const g = rows.reduce<Record<string, number>>((a, r) => {
      const k = String(r[f]);
      a[k] = (a[k] || 0) + 1;
      return a;
    }, {});
    const m = Math.max(1, ...Object.values(g));
    body = (
      <div className="bars">
        {Object.entries(g).map(([n, v]) => (
          <div
            className="bar"
            key={n}
            style={{ height: `${Math.max(12, (v / m) * 100)}%` }}
          >
            <label>{n}</label>
          </div>
        ))}
      </div>
    );
  } else
    body = (
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
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.region}</td>
              <td>{r.priority}</td>
              <td>{String(r[f])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  return (
    <article className="widget" style={{ gridColumn: `span ${w.layout.span}` }}>
      <div className="widget-head">
        <div>
          <h3>{w.title}</h3>
          <p className="sub">Binding: {f}</p>
        </div>
        <span className="pill">{w.type}</span>
      </div>
      {body}
      <div className="composer">
        <button
          className="secondary"
          onClick={() => onChange({ id: "__moveUp__" as string })}
        >
          ← Earlier
        </button>
        <button
          className="secondary"
          onClick={() => onChange({ id: "__moveDown__" as string })}
        >
          Later →
        </button>
        <select
          aria-label={`Width for ${w.title}`}
          value={w.layout.span}
          onChange={(e) => onChange({ layout: { span: +e.target.value } })}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1} columns
            </option>
          ))}
        </select>
      </div>
      <button className="remove secondary" onClick={onRemove}>
        Remove
      </button>
    </article>
  );
}
export function CompositionApp() {
  const [c, setC] = useState<DashboardConfig>(() => {
    try {
      return JSON.parse(localStorage.getItem(K) || "");
    } catch {
      return copy(defaults);
    }
  });
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ctl, setCtl] = useState({
    latency: 700,
    failureRate: 12,
    schemaDrift: false,
  });
  const [revs, setRevs] = useState<{ at: string; c: DashboardConfig }[]>([]);
  const refresh = () => {
    setLoading(true);
    setError("");
    fetchOrders(c.filters, ctl)
      .then((x) => setRows(x))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    localStorage.setItem(K, JSON.stringify(c));
    refresh();
  }, [c, ctl.schemaDrift]);
  const edit = (id: string, patch: Partial<Widget>) =>
    setC((x) => {
      const i = x.widgets.findIndex((w) => w.id === id);
      const ws = [...x.widgets];
      if (patch.id === "__moveUp__" && i > 0)
        [ws[i - 1], ws[i]] = [ws[i], ws[i - 1]];
      else if (patch.id === "__moveDown__" && i < ws.length - 1)
        [ws[i + 1], ws[i]] = [ws[i], ws[i + 1]];
      else ws[i] = { ...ws[i], ...patch };
      return { ...x, widgets: ws };
    });
  const add = () =>
    setC((x) => ({
      ...x,
      widgets: [
        ...x.widgets,
        {
          id: crypto.randomUUID(),
          type: "metric",
          title: "New metric",
          binding: { field: "orders" },
          layout: { span: 4 },
        },
      ],
    }));
  const save = () =>
    setRevs((x) => [{ at: new Date().toISOString(), c: copy(c) }, ...x]);
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">R</span>
          <span>Relayboard</span>
          <small>Operations</small>
        </div>
        <div className="top-actions">
          <span className="sync">● Live</span>
          <button onClick={save}>Save revision</button>
        </div>
      </header>
      <aside className="sidebar">
        <p className="eyebrow">DASHBOARD</p>
        <h1>{c.title}</h1>
        <p className="muted">
          Use each widget’s controls to arrange its position and width.
        </p>
        <section>
          <div className="section-heading">
            <h2>Global filters</h2>
          </div>
          <label>
            Region
            <select
              value={c.filters.region}
              onChange={(e) =>
                setC((x) => ({
                  ...x,
                  filters: { ...x.filters, region: e.target.value },
                }))
              }
            >
              <option value="all">All regions</option>
              <option>North</option>
              <option>South</option>
              <option>West</option>
            </select>
          </label>
          <label>
            Priority
            <select
              value={c.filters.priority}
              onChange={(e) =>
                setC((x) => ({
                  ...x,
                  filters: { ...x.filters, priority: e.target.value },
                }))
              }
            >
              <option value="all">All priorities</option>
              <option>Critical</option>
              <option>Standard</option>
            </select>
          </label>
        </section>
        <section>
          <h2>System controls</h2>
          <label>
            Latency
            <input
              type="range"
              min="0"
              max="2500"
              step="100"
              value={ctl.latency}
              onChange={(e) =>
                setCtl((x) => ({ ...x, latency: +e.target.value }))
              }
            />
            <output>{ctl.latency} ms</output>
          </label>
          <label>
            Failure rate
            <input
              type="range"
              min="0"
              max="100"
              value={ctl.failureRate}
              onChange={(e) =>
                setCtl((x) => ({ ...x, failureRate: +e.target.value }))
              }
            />
            <output>{ctl.failureRate}%</output>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={ctl.schemaDrift}
              onChange={(e) =>
                setCtl((x) => ({ ...x, schemaDrift: e.target.checked }))
              }
            />
            Rename status → state
          </label>
          <button className="wide secondary" onClick={refresh}>
            Refresh live data
          </button>
        </section>
        <section>
          <h2>Revisions ({revs.length})</h2>
          {revs.slice(0, 4).map((r, i) => (
            <button
              className="revision"
              key={r.at}
              onClick={() => setC(copy(r.c))}
            >
              r{revs.length - i} · {new Date(r.at).toLocaleTimeString()}
            </button>
          ))}
        </section>
      </aside>
      <main>
        <div className="canvas-header">
          <div>
            <p className="eyebrow">LIVE INTERPRETATION</p>
            <p className="muted">
              {loading
                ? "Fetching live data…"
                : error
                  ? "Live truth cannot be verified."
                  : `${c.widgets.length} widgets showing the current interpretation.`}
            </p>
          </div>
          <button className="secondary" onClick={add}>
            + Add widget
          </button>
        </div>
        {error && <div className="notice">{error}</div>}
        <div className="grid">
          {!loading &&
            !error &&
            c.widgets.map((w) => (
              <Card
                key={w.id}
                w={w}
                rows={rows}
                onChange={(p) => edit(w.id, p)}
                onRemove={() =>
                  setC((x) => ({
                    ...x,
                    widgets: x.widgets.filter((a) => a.id !== w.id),
                  }))
                }
              />
            ))}
        </div>
      </main>
    </>
  );
}
