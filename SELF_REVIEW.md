# Self-review: three possible PR blockers

1. **No real multi-user persistence or authorization.** Revisions are browser-local and Share is a prototype URL, not a permissioned resource. This misses the production interpretation of concurrent sharing and needs a versioned backend before merge into a real platform.
2. **The data schema validation is shallow.** It verifies field presence but not declared field types or response freshness. A source could change `orders` from number to string and some renderers may show misleading output. A schema contract and runtime type checks are required.
3. **No automated test suite.** The hostile examples are supplied and manually exercisable, but rendering/data-layer behavior should have unit and browser tests before a production merge—especially stale-request suppression and malicious configuration handling.
