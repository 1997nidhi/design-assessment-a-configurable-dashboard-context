// Relayboard is intentionally dependency-free: open index.html or serve this folder.
const STORAGE = "relayboard-assessment-v1";
const catalogue = {
  metric: { fields: ["orders", "lateOrders"], render: renderMetric },
  bar: { fields: ["status", "region"], render: renderBar },
  table: {
    fields: ["orders", "lateOrders", "status", "region"],
    render: renderTable,
  },
};
const defaultConfig = {
  version: 2,
  id: "fulfillment-pulse",
  title: "Fulfillment pulse",
  filters: { region: "all", priority: "all" },
  widgets: [
    {
      id: "orders",
      type: "metric",
      title: "Orders today",
      binding: { field: "orders" },
      layout: { span: 4 },
    },
    {
      id: "late",
      type: "metric",
      title: "Late orders",
      binding: { field: "lateOrders" },
      layout: { span: 4 },
    },
    {
      id: "by-status",
      type: "bar",
      title: "Orders by status",
      binding: { field: "status" },
      layout: { span: 4 },
    },
    {
      id: "recent",
      type: "table",
      title: "Live order queue",
      binding: { field: "status" },
      layout: { span: 8 },
    },
  ],
};
let state = {
  config: loadConfig(),
  revisions: JSON.parse(localStorage.getItem(STORAGE + ":revisions") || "[]"),
  controls: { latency: 700, failureRate: 12, schemaDrift: false },
};
let requestNo = 0;
function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE));
    return saved || structuredClone(defaultConfig);
  } catch {
    return structuredClone(defaultConfig);
  }
}
function persist() {
  localStorage.setItem(STORAGE, JSON.stringify(state.config));
  localStorage.setItem(STORAGE + ":revisions", JSON.stringify(state.revisions));
}
function validateConfig(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { errors: ["Configuration must be an object"], config: null };
  const c = structuredClone(input);
  if (c.version !== 2)
    errors.push(`Unsupported configuration version: ${String(c.version)}`);
  if (!Array.isArray(c.widgets)) errors.push("widgets must be an array");
  else if (c.widgets.length > 30) errors.push("Maximum 30 widgets");
  if (!c.filters || typeof c.filters !== "object")
    c.filters = { region: "all", priority: "all" };
  return { errors, config: c };
}
function safeWidget(widget, index) {
  if (!widget || typeof widget !== "object")
    return {
      message: "Widget definition is not an object",
      detail: "This configuration entry was ignored.",
    };
  if (typeof widget.id !== "string" || !widget.id)
    return {
      message: "Widget has no stable ID",
      detail: "A widget needs a non-empty string id.",
    };
  if (!catalogue[widget.type])
    return {
      message: "Widget type is not available",
      detail: `“${String(widget.type)}” is not in this dashboard’s catalogue.`,
    };
  if (!widget.binding || typeof widget.binding.field !== "string")
    return {
      message: "Data binding is invalid",
      detail: "Expected binding.field to be a string.",
    };
  if (
    !Number.isFinite(widget.layout?.span) ||
    widget.layout.span < 1 ||
    widget.layout.span > 12
  )
    return {
      message: "Layout is invalid",
      detail: "layout.span must be a finite number from 1 to 12.",
    };
  return null;
}
function mockOrders() {
  const rows = [
    ["SO-4812", "North", "Critical", "shipped", 18, 1],
    ["SO-4813", "South", "Standard", "picking", 7, 0],
    ["SO-4814", "West", "Critical", "late", 4, 4],
    ["SO-4815", "North", "Standard", "picking", 11, 1],
    ["SO-4816", "South", "Critical", "shipped", 9, 0],
  ];
  return rows.map(([id, region, priority, status, orders, lateOrders]) => ({
    id,
    region,
    priority,
    status,
    orders,
    lateOrders,
  }));
}
async function fetchData(filters, controls) {
  await new Promise((r) => setTimeout(r, controls.latency));
  if (Math.random() * 100 < controls.failureRate)
    throw new Error(
      "The operations data service did not respond. No cached value is shown as live truth.",
    );
  let rows = mockOrders().filter(
    (r) =>
      (filters.region === "all" || r.region === filters.region) &&
      (filters.priority === "all" || r.priority === filters.priority),
  );
  if (controls.schemaDrift)
    rows = rows.map(({ status, ...r }) => ({ ...r, state: status }));
  return rows;
}
function aggregate(rows, field) {
  if (field === "orders" || field === "lateOrders")
    return rows.reduce((n, r) => n + r[field], 0);
  return rows;
}
function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  for (const c of children) e.append(c);
  return e;
}
function renderMetric(widget, rows) {
  const value = aggregate(rows, widget.binding.field);
  return el("div", { className: "metric-value", textContent: String(value) }, [
    el("small", { textContent: " orders" }),
  ]);
}
function renderBar(widget, rows) {
  const field = widget.binding.field;
  const groups = {};
  rows.forEach((r) => (groups[r[field]] ||= []).push(r));
  if (Object.keys(groups).length === 0)
    return el("p", { className: "muted", textContent: "No matching records." });
  const max = Math.max(...Object.values(groups).map((x) => x.length));
  const box = el("div", { className: "bars" });
  Object.entries(groups).forEach(([name, list]) => {
    const b = el("div", { className: "bar" });
    b.style.height = `${Math.max(12, (list.length / max) * 100)}%`;
    b.title = `${name}: ${list.length}`;
    b.append(el("label", { textContent: name }));
    box.append(b);
  });
  return box;
}
function renderTable(widget, rows) {
  const table = el("table", { className: "data-table" });
  table.innerHTML =
    "<thead><tr><th>Order</th><th>Region</th><th>Priority</th><th>Status</th></tr></thead>";
  const body = el("tbody");
  rows.forEach((r) =>
    body.append(
      el("tr", {}, [
        el("td", { textContent: r.id }),
        el("td", { textContent: r.region }),
        el("td", { textContent: r.priority }),
        el("td", { textContent: r.status || r.state || "—" }),
      ]),
    ),
  );
  table.append(body);
  return table;
}
function errorWidget(widget, issue) {
  const node = document
    .getElementById("errorTemplate")
    .content.firstElementChild.cloneNode(true);
  node.querySelector("h3").textContent = widget?.title || "Unrenderable widget";
  node.querySelector(".error-reason").textContent = issue.message;
  node.querySelector(".error-detail").textContent = issue.detail;
  node.querySelector(".remove").onclick = () => removeWidget(widget?.id);
  return node;
}
async function render() {
  const current = ++requestNo,
    grid = document.getElementById("grid"),
    banner = document.getElementById("banner");
  grid.replaceChildren();
  banner.replaceChildren();
  const { errors, config } = validateConfig(state.config);
  if (errors.length) {
    banner.append(
      el("div", {
        className: "notice",
        textContent: `Dashboard configuration cannot be interpreted: ${errors.join("; ")}`,
      }),
    );
    document.getElementById("renderSummary").textContent =
      "Rendering stopped safely.";
    return;
  }
  document.getElementById("dashboardTitle").textContent =
    config.title || "Untitled dashboard";
  document.getElementById("renderSummary").textContent = "Fetching live data…";
  let rows;
  try {
    rows = await fetchData(config.filters, state.controls);
  } catch (error) {
    if (current !== requestNo) return;
    config.widgets.forEach((w) =>
      grid.append(
        errorWidget(w, {
          message: "Live data unavailable",
          detail: error.message,
        }),
      ),
    );
    document.getElementById("renderSummary").textContent =
      "No live data could be verified.";
    return;
  }
  if (current !== requestNo) return;
  let ok = 0;
  config.widgets.forEach((w, i) => {
    const issue = safeWidget(w, i);
    if (issue) {
      grid.append(errorWidget(w, issue));
      return;
    }
    const card = el("article", { className: "widget" });
    card.style.gridColumn = `span ${w.layout.span}`;
    card.append(
      el("div", { className: "widget-head" }, [
        el("div", {}, [
          el("h3", { textContent: w.title || "Untitled widget" }),
          el("p", {
            className: "sub",
            textContent: `Binding: ${w.binding.field}`,
          }),
        ]),
        el("span", { className: "pill", textContent: w.type }),
      ]),
    );
    try {
      const compatibleTableField =
        w.type === "table" &&
        w.binding.field === "status" &&
        rows.every(
          (r) => Object.hasOwn(r, "status") || Object.hasOwn(r, "state"),
        );
      if (
        !compatibleTableField &&
        !rows.every((r) => Object.hasOwn(r, w.binding.field))
      )
        throw new Error(
          `Field “${w.binding.field}” does not exist in the live schema.`,
        );
      card.append(catalogue[w.type].render(w, rows));
      ok++;
    } catch (e) {
      grid.append(
        errorWidget(w, {
          message: "Binding cannot be verified",
          detail: e.message,
        }),
      );
      return;
    }
    const remove = el("button", {
      className: "remove secondary",
      textContent: "Remove",
    });
    remove.onclick = () => removeWidget(w.id);
    card.append(remove);
    grid.append(card);
  });
  document.getElementById("renderSummary").textContent =
    `${ok} of ${config.widgets.length} widgets showing verified live data.`;
}
function removeWidget(id) {
  state.config.widgets = state.config.widgets.filter((w) => w.id !== id);
  persist();
  render();
}
function updateFilters() {
  state.config.filters.region = document.getElementById("regionFilter").value;
  state.config.filters.priority =
    document.getElementById("priorityFilter").value;
  render();
}
function paintRevisions() {
  const host = document.getElementById("revisions");
  host.replaceChildren();
  state.revisions.slice(0, 6).forEach((r) => {
    const b = el("button", {
      className: "revision",
      textContent: `r${r.number} · ${r.note}`,
    });
    b.append(
      el("time", { textContent: new Date(r.createdAt).toLocaleString() }),
    );
    b.onclick = () => {
      state.config = structuredClone(r.config);
      syncInputs();
      persist();
      render();
    };
    host.append(b);
  });
  document.getElementById("revisionCount").textContent = state.revisions.length;
}
function syncInputs() {
  document.getElementById("regionFilter").value =
    state.config.filters.region || "all";
  document.getElementById("priorityFilter").value =
    state.config.filters.priority || "all";
}
document.getElementById("latency").oninput = (e) => {
  state.controls.latency = +e.target.value;
  document.getElementById("latencyOutput").textContent = `${e.target.value} ms`;
};
document.getElementById("failureRate").oninput = (e) => {
  state.controls.failureRate = +e.target.value;
  document.getElementById("failureOutput").textContent = `${e.target.value}%`;
};
document.getElementById("schemaDrift").onchange = (e) => {
  state.controls.schemaDrift = e.target.checked;
  render();
};
document.getElementById("regionFilter").onchange = updateFilters;
document.getElementById("priorityFilter").onchange = updateFilters;
document.getElementById("clearFilters").onclick = () => {
  state.config.filters = { region: "all", priority: "all" };
  syncInputs();
  render();
};
document.getElementById("refreshBtn").onclick = render;
document.getElementById("resetData").onclick = () => {
  localStorage.removeItem(STORAGE);
  localStorage.removeItem(STORAGE + ":revisions");
  state.config = structuredClone(defaultConfig);
  state.revisions = [];
  syncInputs();
  paintRevisions();
  render();
};
document.getElementById("saveBtn").onclick = () => {
  const n = (state.revisions[0]?.number || 0) + 1;
  state.revisions.unshift({
    number: n,
    createdAt: new Date().toISOString(),
    note: "Manual save",
    config: structuredClone(state.config),
  });
  persist();
  paintRevisions();
};
document.getElementById("addWidget").onclick = () =>
  document.getElementById("widgetDialog").showModal();
document.getElementById("widgetForm").onsubmit = (e) => {
  e.preventDefault();
  const fd = new FormData(e.target),
    type = fd.get("type"),
    field = fd.get("field");
  state.config.widgets.push({
    id: crypto.randomUUID(),
    type,
    title: fd.get("title"),
    binding: { field },
    layout: { span: type === "table" ? 8 : 4 },
  });
  persist();
  e.target.closest("dialog").close();
  render();
};
document.getElementById("shareBtn").onclick = () => {
  document.getElementById("shareLink").value =
    `${location.href.split("#")[0]}#revision=${state.revisions[0]?.number || "unsaved"}`;
  document.getElementById("shareDialog").showModal();
};
syncInputs();
paintRevisions();
render();
