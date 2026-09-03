import { useEffect, useMemo, useState } from "react";
import {
  defaults,
  type Controls,
  type DashboardConfig,
  type Widget,
} from "./domain";
import { DashboardGrid } from "./components/DashboardGrid";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { useLiveOrders } from "./hooks/useLiveOrders";

type Revision = { at: string; author: string; config: DashboardConfig };
const clone = <T,>(value: T) => structuredClone(value);
const dashboardId =
  new URLSearchParams(location.search).get("dashboard") || defaults.id;
const configKey = `relayboard:dashboard:${dashboardId}`;
const revisionKey = `${configKey}:revisions`;
function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

export function App() {
  const [config, setConfig] = useState<DashboardConfig>(() =>
    load(configKey, clone(defaults)),
  );
  const [controls, setControls] = useState<Controls>({
    latency: 700,
    failureRate: 12,
    schemaDrift: false,
  });
  const [revisions, setRevisions] = useState<Revision[]>(() =>
    load(revisionKey, []),
  );
  const [viewer, setViewer] = useState("Nidhi");
  const [shareOpen, setShareOpen] = useState(false);
  const { rows, loading, error, refresh } = useLiveOrders(
    config.filters,
    controls,
  );
  const shareUrl = useMemo(
    () =>
      `${location.origin}${location.pathname}?dashboard=${encodeURIComponent(dashboardId)}`,
    [],
  );
  useEffect(() => {
    localStorage.setItem(configKey, JSON.stringify(config));
    const channel = new BroadcastChannel(`relayboard:${dashboardId}`);
    channel.postMessage({ config, author: viewer });
    channel.close();
  }, [config, viewer]);
  useEffect(() => {
    localStorage.setItem(revisionKey, JSON.stringify(revisions));
  }, [revisions]);
  useEffect(() => {
    const channel = new BroadcastChannel(`relayboard:${dashboardId}`);
    channel.onmessage = (
      event: MessageEvent<{ config: DashboardConfig; author: string }>,
    ) => {
      if (event.data.author !== viewer) setConfig(event.data.config);
    };
    return () => channel.close();
  }, [viewer]);
  const updateWidgets = (change: (widgets: Widget[]) => Widget[]) =>
    setConfig((current) => ({ ...current, widgets: change(current.widgets) }));
  const moveWidget = (id: string, amount: number) =>
    updateWidgets((widgets) => {
      const from = widgets.findIndex((widget) => widget.id === id);
      const to = Math.max(0, Math.min(widgets.length - 1, from + amount));
      if (from === to) return widgets;
      const next = [...widgets];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  const saveRevision = () =>
    setRevisions((current) => [
      { at: new Date().toISOString(), author: viewer, config: clone(config) },
      ...current,
    ]);
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">R</span>
          <span>Relayboard</span>
          <small>Operations</small>
        </div>
        <div className="top-actions">
          <select
            aria-label="Demo viewer"
            value={viewer}
            onChange={(event) => setViewer(event.target.value)}
          >
            <option>Nidhi</option>
            <option>Alex</option>
            <option>Mina</option>
          </select>
          <button
            className="secondary"
            onClick={() => setShareOpen((open) => !open)}
          >
            Share
          </button>
          <button onClick={saveRevision}>Save revision</button>
        </div>
      </header>
      {shareOpen && (
        <div className="share-panel">
          <strong>Shared dashboard link</strong>
          <input readOnly value={shareUrl} />
          <span>
            Anyone using this browser profile can open the same dashboard.
            Cross-tab changes are synced.
          </span>
        </div>
      )}
      <DashboardSidebar
        config={config}
        controls={controls}
        revisions={revisions}
        onFilter={(name, value) =>
          setConfig((current) => ({
            ...current,
            filters: { ...current.filters, [name]: value },
          }))
        }
        onControls={(patch) =>
          setControls((current) => ({ ...current, ...patch }))
        }
        onRefresh={refresh}
        onRestore={(restored) => setConfig(clone(restored))}
      />
      <main>
        <div className="canvas-header">
          <div>
            <p className="eyebrow">LIVE INTERPRETATION</p>
            <p className="muted">
              {loading
                ? "Fetching live data…"
                : error
                  ? "Live truth cannot be verified."
                  : `${config.widgets.length} widgets showing the current interpretation.`}
            </p>
          </div>
          <button
            className="secondary"
            onClick={() =>
              updateWidgets((widgets) => [
                ...widgets,
                {
                  id: crypto.randomUUID(),
                  type: "metric",
                  title: "New metric",
                  binding: { field: "orders" },
                  layout: { span: 4 },
                },
              ])
            }
          >
            + Add widget
          </button>
        </div>
        {error && <div className="notice">{error}</div>}
        {!loading && !error && (
          <DashboardGrid
            widgets={config.widgets}
            rows={rows}
            onMove={moveWidget}
            onResize={(id, span) =>
              updateWidgets((widgets) =>
                widgets.map((widget) =>
                  widget.id === id ? { ...widget, layout: { span } } : widget,
                ),
              )
            }
            onRemove={(id) =>
              updateWidgets((widgets) =>
                widgets.filter((widget) => widget.id !== id),
              )
            }
          />
        )}
      </main>
    </>
  );
}
