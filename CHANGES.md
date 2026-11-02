# Changes

## 0.1.0 — 2026-11-02 — first version

New repo. A fleet-style React + TypeScript + Vite PWA plus a shared registry file.

### registry/
- `models.json` — 8 providers (Anthropic, OpenAI, Google AI Studio, xAI, OpenRouter, Groq, Ollama, LM Studio), 19 seed models across the closed frontier and open-weight labs, 6 tag-query groups, 4 sample operations. Model ids not confirmed against a provider catalog carry `modelIdVerified: false`.
- `models.schema.json` — JSON Schema for the file.

### react-app/
- Views: Models (table / cards, search, tag chips, group filter, sort, CSV export, add / edit / hide), Groups (filter builder with live match preview), Operations, Run (parallel fan-out with latency, tokens, estimated cost, cancel, CSV export, Ctrl+Enter), Run history (last 30), Settings (keys in local storage, base-URL overrides, connection tests, import from Ollama and from OpenRouter's public catalog, export merged registry JSON, reset local edits), About.
- Fleet chrome: hamburger accordion main menu (View / Run on group / Links), build-timestamp footer with the Costarella Innovations copyright, help pane sliding in from the right (`?`), dark navy tokens shared with OhioElections.
- `src/data/llmClient.ts` is dependency-free so the same code is copied into the llm-registry MCP server.
- `plugins/registry-writer.ts` — dev-server-only Vite plugin (`GET`/`PUT /__registry`, localhost only) so that under `npm run dev` edits and imports are validated and written straight to `registry/models.json`; file changes on disk are pushed to the page over an HMR event instead of a full reload. `src/data/store.ts` picks file mode when the plugin answers, browser (local-storage) mode otherwise — the stats strip says which. Validation lives in `scripts/registry-lib.mjs`, shared with the CI check.
- `scripts/check-registry.mjs` validates the registry; CI runs it before the build.
- Hash routes: `#/models`, `#/groups`, `#/operations`, `#/run`, `#/run/group/<id>`, `#/run/op/<id>`, `#/run/models/<id,id>`, `#/history`, `#/settings`, `#/about`.

### Companion
- `servers/llm-registry` added to FleetMcpServers (same registry file; `list_models`, `get_model`, `list_groups`, `resolve_group`, `list_operations`, `run_operation`).
