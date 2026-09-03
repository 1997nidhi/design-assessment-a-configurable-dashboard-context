# Relayboard assessment

This is a React + TypeScript project powered by Vite. Install dependencies and start the development server:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). For a production build, use `npm run build` and optionally `npm run preview`.

## Exercise the resilience paths

- Set **Latency** to 2500 ms and refresh. Change a filter while it is loading: obsolete responses are ignored.
- Set **Failure rate** to 100% and refresh. Every widget becomes an explicit “Live data unavailable” state; no stale number is presented as current.
- Enable **Rename status → state**. All widgets bound to `status` visibly fail their binding; unaffected widgets continue to show verified data.
- Add/remove widgets, save a revision, then select an older revision from the sidebar. Browser local storage supplies persistence for this prototype.
- The hostile payload corpus is in `hostile-configs.json`. It is intended for a renderer/unit-test harness: pass each entry to `dashboardIssue` and its widgets to `widgetIssue` from `src/domain.ts`. The UI itself only creates valid authoring output; imported configurations would use the same validation boundary.

The “Share” action is a prototype-level share affordance: it produces a revision-labelled local URL. It is not authenticated or remotely persisted.
