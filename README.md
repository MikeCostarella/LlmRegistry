# LLM Registry

A registry of large language models — the hosted frontier models and the
open-weight ones you can run yourself — kept as one JSON file, with **groups**
defined as tag queries and **operations** you can fan out across any group and
compare side by side.

Live: <https://mikecostarella.github.io/LlmRegistry/>

Created by Mike Costarella, Costarella Innovations, LLC.

## What it does

| View | Purpose |
|---|---|
| **Models** | The registry: vendor, provider, exact API model id, access (closed / open-weight), status, context, price per 1M tokens, tags. Search, filter by tag or group, sort, table or cards, CSV export. Click a row to edit; add your own. |
| **Groups** | Saved tag queries ("open-weight", "≤ $1 per 1M input", "runs locally", "supports tools"). Clauses AND together; values within a clause OR. New models join matching groups automatically. |
| **Operations** | Saved system prompt + prompt pairs. |
| **Run** | Pick an operation and a group (or tick models), run in parallel, read every answer side by side with latency, tokens and estimated cost. Export the run as CSV. Ctrl+Enter runs. |
| **Run history** | Last 30 runs, kept in this browser. |
| **Settings** | API keys (browser local storage only), base-URL overrides, connection tests, **Import from Ollama** (what you have pulled) and **Import from OpenRouter** (public catalog: real ids, context sizes, prices). Export the merged registry as JSON. |

## How it is put together

```
LlmRegistry/
├── registry/
│   ├── models.json          ← source of truth: providers, models, groups, operations
│   └── models.schema.json   ← JSON Schema for it
├── react-app/               ← React 18 + TypeScript + Vite PWA (fleet conventions)
│   ├── src/data/            store (file vs browser mode), group filters, LLM client, fan-out runner, importers, CSV
│   ├── src/components/      views + fleet MainMenu / BuildStamp / HelpPane
│   ├── plugins/registry-writer.ts   dev-server plugin that writes registry/models.json
│   └── scripts/             check-registry.mjs (CI gate) + registry-lib.mjs (validation shared with the plugin)
└── .github/workflows/deploy.yml     builds react-app/ and deploys to GitHub Pages
```

- `registry/models.json` is **bundled into the app at build time** (Vite alias
  `@registry`) and **read at run time** by the `llm-registry` server in
  [FleetMcpServers](https://github.com/MikeCostarella/FleetMcpServers), so the
  app and the MCP tools always agree.
- **Where edits go** depends on how the app is running (the stats strip says which):
  - `npm run dev` — the `registry-writer` Vite plugin (`react-app/plugins/`) serves
    `GET/PUT /__registry`, so every model / group / operation edit and every import
    is validated and written straight to `registry/models.json`. Git shows the diff;
    commit when happy. Editing the file in VS Code pushes the change back into the
    open page without a reload. Dev server only (`apply: "serve"`), localhost only.
  - GitHub Pages — edits are layered over the bundled file in that browser's local
    storage. **Settings → Export registry JSON** produces the merged file; drop it
    over `registry/models.json` and commit.
  - API keys and run history stay in the browser in both modes.
- Calls go straight from the browser to each provider: OpenAI-compatible
  `chat/completions` for OpenAI, Google, xAI, OpenRouter, Groq, Ollama and LM
  Studio; Anthropic's Messages API for Claude. Keys never leave the browser.
- `modelIdVerified: false` marks ids taken from announcements rather than a
  provider catalog. The OpenRouter / Ollama importers replace them with verified ones.

## Running it locally

Needs Node 18 or newer. All commands below are **PowerShell**.

```powershell
cd C:\projects\LlmRegistry\react-app; npm install
cd C:\projects\LlmRegistry\react-app; npm run dev
```

Build gate before committing (the same thing CI runs):

```powershell
cd C:\projects\LlmRegistry\react-app; npm run check:registry; npm run build
```

## Free ways to use it

- **Ollama** on lvp-01 / lvp-02: no key. For browser calls, allow this site's
  origin, then quit and restart Ollama (PowerShell):

  ```powershell
  [Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "https://mikecostarella.github.io,http://localhost:5173", "User")
  ```

- **OpenRouter**'s free models (ids ending in `:free`) and its public catalog.
- Free tiers at **Google AI Studio** and **Groq**.

## Roadmap

- Operations with inputs, expected outputs and scorers (runs become benchmarks).
- Streaming results; per-model overrides.
- Scheduled regression runs when a provider ships a point release.
- "Which model should this fleet app call?" recommendations from run history.

## License

Code: MIT. © 2026 Costarella Innovations, LLC.
