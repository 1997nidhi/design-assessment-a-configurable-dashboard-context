# Design: Relayboard’s truth boundary

## Configuration format

The dashboard is a JSON document at version `2`. It has a stable `id`, display `title`, dashboard-wide `filters`, and a bounded list of widgets. Each widget requires an opaque string `id`, a catalogue `type`, a `binding.field`, and a finite grid `layout.span` (1–12). Presentation is intentionally small in this assessment: title and type are the only editable presentation options. The client keeps saved configurations and immutable revision snapshots in local storage.

An example widget is:

```json
{"id":"late","type":"metric","title":"Late orders","binding":{"field":"lateOrders"},"layout":{"span":4}}
```

There are three catalogue types: metric (numeric aggregate), bar (categorical count), and table (a compact operational queue). A production catalogue should publish a JSON schema, its compatible field types, migration functions, and a renderer version with every widget type.

## Rendering and guarantees

The React renderer treats a configuration as untrusted input. It first validates the enclosing document, then validates each widget independently before accessing nested data. Bad dashboard-level configuration stops rendering with a clear banner; a bad widget produces an in-place error card without breaking its neighbours. React escapes titles and data by default; no configuration value is assigned as HTML.

After validation, it fetches data asynchronously. Requests have tunable latency and random failures. A monotonically increasing request number discards responses that arrive after a newer render has begun. When the fetch fails, every widget shows an explicit unavailable state; the prototype never labels an older cached result as live. After a successful fetch, each binding is checked against the returned schema. A renamed/missing field becomes a visible per-widget binding error. Thus a value is only called “live” after a successful fetch, filter application, and binding check.

The promise is deliberately scoped: a successful render proves truth relative to the data response at that instant, not that the source is globally complete or transactionally consistent. The UI says “verified live data,” rather than implying more.

## Edge cases and choices

| Condition | Behavior |
| --- | --- |
| Unknown type / invalid span / missing binding | Error widget with a specific diagnostic and Remove action |
| Unsupported version / malformed widgets list | Dashboard error banner; no unsafe partial interpretation |
| Schema rename | Widgets depending on the old field visibly fail; unaffected widgets remain usable |
| Empty filtered result | A valid zero/no-record state, distinct from fetch failure |
| Slow or reordered responses | Request generation prevents stale overwrites |
| Network/service failure | Explicit unavailable state, no “last known” value presented as live |
| Concurrent edits | Local prototype has last-writer-wins storage only; see limitation below |

Revision recovery is snapshot-based: Save captures the full current configuration, and a revision button restores it. This makes rollback deterministic but does not currently preserve who made a change or a semantic diff.

## Production trade-offs and next steps

This is intentionally a front-end demonstrator, so sharing is a labelled local link rather than a server-side access-controlled resource. Concurrent editors would require an API with revisions/ETags or CRDT/operational transforms. The API should reject invalid documents using the same versioned JSON schema, record author/audit metadata, and accept `If-Match` revision tokens so users can resolve conflicts instead of silently overwriting.

For schema evolution, a data contract registry should expose field IDs (not display names), field type/version, aliases, and deprecation windows. Migrations should be explicit and durable, never silently guessed. For eventual consistency, each source response should include `asOf`, source version, and partial-result metadata; renderers can then distinguish “empty” from “incomplete.” Telemetry should count configuration errors, unavailable sources, and binding failures without leaking data.
