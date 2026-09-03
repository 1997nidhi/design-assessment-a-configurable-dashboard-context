import type { Controls, DashboardConfig } from "../domain";
type Revision = { at: string; config: DashboardConfig };
type Props = {
  config: DashboardConfig;
  controls: Controls;
  revisions: Revision[];
  onFilter: (name: "region" | "priority", value: string) => void;
  onControls: (patch: Partial<Controls>) => void;
  onRefresh: () => void;
  onRestore: (config: DashboardConfig) => void;
};
export function DashboardSidebar({
  config,
  controls,
  revisions,
  onFilter,
  onControls,
  onRefresh,
  onRestore,
}: Props) {
  return (
    <aside className="sidebar">
      <p className="eyebrow">DASHBOARD</p>
      <h1>{config.title}</h1>
      <p className="muted">
        Use each widget’s controls to arrange its position and width.
      </p>
      <section>
        <h2>Global filters</h2>
        <label>
          Region
          <select
            value={config.filters.region}
            onChange={(event) => onFilter("region", event.target.value)}
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
            value={config.filters.priority}
            onChange={(event) => onFilter("priority", event.target.value)}
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
            value={controls.latency}
            onChange={(event) => onControls({ latency: +event.target.value })}
          />
          <output>{controls.latency} ms</output>
        </label>
        <label>
          Failure rate
          <input
            type="range"
            min="0"
            max="100"
            value={controls.failureRate}
            onChange={(event) =>
              onControls({ failureRate: +event.target.value })
            }
          />
          <output>{controls.failureRate}%</output>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={controls.schemaDrift}
            onChange={(event) =>
              onControls({ schemaDrift: event.target.checked })
            }
          />
          Rename status → state
        </label>
        <button className="wide secondary" onClick={onRefresh}>
          Refresh live data
        </button>
      </section>
      <section>
        <h2>Revisions ({revisions.length})</h2>
        {revisions.slice(0, 4).map((revision, index) => (
          <button
            className="revision"
            key={revision.at}
            onClick={() => onRestore(revision.config)}
          >
            r{revisions.length - index} ·{" "}
            {new Date(revision.at).toLocaleTimeString()}
          </button>
        ))}
      </section>
    </aside>
  );
}
