import { useState } from "react";
import type { Group, Model, Operation, Provider, Settings } from "../data/types";
import { connectionFor } from "../data/runner";
import { fetchOpenRouterCatalog, importFromOllama, openRouterToModel, type ImportCandidate } from "../data/importers";
import { toRegistryJson } from "../data/registry";
import { downloadText, stamp } from "../data/csv";
import { Term } from "./bits";
import { TIP } from "../data/glossary";

interface Props {
  providers: Provider[];
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  models: Model[];
  groups: Group[];
  operations: Operation[];
  fileMode: boolean;
  registryFile: string | null;
  onImportModels: (models: Model[]) => void;
  onResetLocal: () => void;
}

export default function SettingsView({ providers, settings, onSettingsChange, models, groups, operations, fileMode, registryFile, onImportModels, onResetLocal }: Props) {
  const [show, setShow] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [candidates, setCandidates] = useState<{ provider: Provider; list: ImportCandidate[]; query: string; onlyFree: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const setField = (pid: string, field: "apiKey" | "baseUrl", value: string) =>
    onSettingsChange({ ...settings, [pid]: { ...(settings[pid] ?? {}), [field]: value } });

  const test = async (p: Provider) => {
    setBusy(p.id);
    const conn = connectionFor(p, settings);
    try {
      if (p.id === "ollama") {
        const res = await fetch(conn.baseUrl.replace(/\/v1\/?$/, "") + "/api/tags");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        setStatus((s) => ({ ...s, [p.id]: { ok: true, msg: `Ollama is up — ${(j.models ?? []).length} model(s) pulled.` } }));
      } else if (p.kind === "anthropic") {
        const res = await fetch(conn.baseUrl.replace(/\/+$/, "") + "/models", { headers: { "x-api-key": conn.apiKey ?? "", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        setStatus((s) => ({ ...s, [p.id]: { ok: true, msg: `Key accepted — ${(j.data ?? []).length} model(s) listed.` } }));
      } else {
        const headers: Record<string, string> = {};
        if (conn.apiKey) headers.Authorization = `Bearer ${conn.apiKey}`;
        const res = await fetch(conn.baseUrl.replace(/\/+$/, "") + "/models", { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        setStatus((s) => ({ ...s, [p.id]: { ok: true, msg: `Reachable — ${(j.data ?? []).length} model(s) listed.` } }));
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setStatus((s) => ({ ...s, [p.id]: { ok: false, msg: /Failed to fetch|NetworkError|Load failed/i.test(m) ? "Unreachable (offline, bad URL, or CORS blocked)." : m } }));
    } finally {
      setBusy(null);
    }
  };

  const importOllama = async (p: Provider) => {
    setBusy(p.id);
    try {
      const list = await importFromOllama(p, connectionFor(p, settings).baseUrl, models);
      setCandidates({ provider: p, list, query: "", onlyFree: false });
      if (!list.length) setStatus((s) => ({ ...s, [p.id]: { ok: true, msg: "Ollama is up but has no models pulled. Try: ollama pull llama4:scout" } }));
    } catch (e) {
      setStatus((s) => ({ ...s, [p.id]: { ok: false, msg: e instanceof Error ? e.message : String(e) } }));
    } finally {
      setBusy(null);
    }
  };

  const importOpenRouter = async (p: Provider) => {
    setBusy(p.id);
    try {
      const rows = await fetchOpenRouterCatalog(connectionFor(p, settings).baseUrl);
      const list = rows.map((r) => openRouterToModel(p, r, models)).sort((a, b) => (b.model.released ?? "").localeCompare(a.model.released ?? ""));
      setCandidates({ provider: p, list, query: "", onlyFree: false });
      setStatus((s) => ({ ...s, [p.id]: { ok: true, msg: `${list.length} models in the public catalog.` } }));
    } catch (e) {
      setStatus((s) => ({ ...s, [p.id]: { ok: false, msg: e instanceof Error ? e.message : String(e) } }));
    } finally {
      setBusy(null);
    }
  };

  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const visible = candidates
    ? candidates.list.filter((c) => (!candidates.onlyFree || c.model.tags.includes("free")) && (!candidates.query || (c.model.name + " " + c.model.modelId + " " + c.model.vendor).toLowerCase().includes(candidates.query.toLowerCase())))
    : [];

  const exportRegistry = () => {
    downloadText(`models-${stamp()}.json`, JSON.stringify(toRegistryJson(models, groups, operations), null, 2) + "\n", "application/json");
  };

  return (
    <>
      <div className="view-head">
        <h2 className="view-title">Settings</h2>
        <span className="spacer" />
        <button type="button" className="btn secondary" onClick={exportRegistry} title={TIP.exportRegistry}>Export registry JSON</button>
        {!fileMode && <button type="button" className="btn danger" onClick={() => { if (confirm("Remove every local model, group, operation and hidden-model override? Keys and runs are kept.")) onResetLocal(); }} title={TIP.resetLocal}>Reset local edits</button>}
      </div>
      {fileMode && (
        <div className="banner info">Dev server: model, group and operation edits are written straight to <code className="mono">{registryFile}</code> and show up as a git diff. Imports below land there too. Keys and run history still stay in this browser.</div>
      )}
      <div className="banner">Keys are stored in <b>this browser only</b> (local storage) and sent directly to each provider. Nothing is proxied. Clear a field to forget a key.</div>

      <div className="grid wide">
        {providers.map((p) => {
          const s = settings[p.id] ?? {};
          const st = status[p.id];
          return (
            <div key={p.id} className="card">
              <h4>{p.name} <span className="badge status" title={p.kind === "anthropic" ? "Speaks Anthropic's Messages API." : "Speaks the OpenAI chat-completions API, which most providers and local servers have adopted."}>{p.kind}</span>{p.browser === false && <span className="badge unverified" title={TIP.noBrowserCors}>no browser CORS</span>}</h4>
              {p.notes && <div className="detail">{p.notes}</div>}
              <div className="form-grid">
                {p.keyEnv && (
                  <label className="field wide"><span><Term tip={TIP.apiKey}>API key</Term> <span className="muted" title={TIP.keyEnv}>(env: {p.keyEnv} for the MCP server)</span></span>
                    <div className="row" style={{ gap: 6 }}>
                      <input className="input mono" style={{ flex: 1 }} type={show.has(p.id) ? "text" : "password"} value={s.apiKey ?? ""} onChange={(e) => setField(p.id, "apiKey", e.target.value)} autoComplete="off" spellCheck={false} />
                      <button type="button" className="btn small secondary" onClick={() => setShow((x) => { const n = new Set(x); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}>{show.has(p.id) ? "hide" : "show"}</button>
                    </div>
                  </label>
                )}
                <label className="field wide"><span><Term tip={TIP.baseUrl}>Base URL</Term> <span className="muted">(blank = {p.baseUrl})</span></span>
                  <input className="input mono" value={s.baseUrl ?? ""} onChange={(e) => setField(p.id, "baseUrl", e.target.value)} placeholder={p.baseUrl} spellCheck={false} />
                </label>
              </div>
              <div className="actions" style={{ marginTop: 6 }}>
                <button type="button" className="btn small" onClick={() => void test(p)} disabled={busy === p.id} title={TIP.testConnection}>Test connection</button>
                {p.id === "ollama" && <button type="button" className="btn small go" onClick={() => void importOllama(p)} disabled={busy === p.id} title={TIP.importOllama}>Import pulled models</button>}
                {p.id === "openrouter" && <button type="button" className="btn small go" onClick={() => void importOpenRouter(p)} disabled={busy === p.id} title={TIP.importOpenRouter}>Import from public catalog</button>}
                {p.docs && <a className="btn small secondary" href={p.docs} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>Docs ↗</a>}
              </div>
              {st && <div className={`note ${st.ok ? "ok" : "error"}`}>{st.msg}</div>}
            </div>
          );
        })}
      </div>

      {candidates && (
        <div className="card" style={{ marginTop: 14 }}>
          <h4>Import from {candidates.provider.name} <span className="badge status">{visible.length} shown · {chosen.size} chosen</span></h4>
          <div className="row">
            <input className="input search" placeholder="Filter…" value={candidates.query} onChange={(e) => setCandidates({ ...candidates, query: e.target.value })} />
            {candidates.provider.id === "openrouter" && <label className="pick"><input type="checkbox" checked={candidates.onlyFree} onChange={(e) => setCandidates({ ...candidates, onlyFree: e.target.checked })} /> free models only</label>}
            <button type="button" className="btn small secondary" onClick={() => setChosen(new Set(visible.map((c) => c.model.id)))}>choose all shown</button>
            <button type="button" className="btn small secondary" onClick={() => setChosen(new Set())}>clear</button>
            <span className="spacer" />
            <button type="button" className="btn go" disabled={!chosen.size} onClick={() => { onImportModels(candidates.list.filter((c) => chosen.has(c.model.id)).map((c) => c.model)); setCandidates(null); setChosen(new Set()); }}>Add {chosen.size} to registry</button>
            <button type="button" className="btn secondary" onClick={() => { setCandidates(null); setChosen(new Set()); }}>Close</button>
          </div>
          <div className="target-list" style={{ maxHeight: 420 }}>
            {visible.slice(0, 400).map((c) => (
              <label key={c.model.id}>
                <input type="checkbox" checked={chosen.has(c.model.id)} onChange={() => setChosen((x) => { const n = new Set(x); if (n.has(c.model.id)) n.delete(c.model.id); else n.add(c.model.id); return n; })} />
                <span>{c.model.name}</span>
                {c.existing && <span className="badge status">already in registry</span>}
                {c.model.tags.includes("free") && <span className="badge status local">free</span>}
                <span className="mid">{c.model.modelId}{c.model.pricing && c.model.pricing.input + c.model.pricing.output > 0 ? ` · $${c.model.pricing.input}/$${c.model.pricing.output}` : ""}</span>
              </label>
            ))}
            {visible.length > 400 && <div className="note">Showing the first 400 — narrow the filter.</div>}
          </div>
          <div className="note">Imported entries get <b>verified</b> model ids, context sizes and prices from the catalog. Entries already in the registry are replaced when chosen{fileMode ? ", and the registry file is rewritten" : ""}.</div>
        </div>
      )}

      <h3 className="view-title" style={{ margin: "18px 0 6px" }}>Getting Ollama to accept browser calls</h3>
      <p className="note">Ollama blocks web-page origins by default. On lvp-01 / lvp-02, in <b>PowerShell</b>:</p>
      <pre className="mono" style={{ fontSize: 12, background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: 6, whiteSpace: "pre-wrap" }}>{`[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "https://mikecostarella.github.io,http://localhost:5173", "User")`}</pre>
      <p className="note">Then quit Ollama from the tray and start it again. To reach Ollama on the other machine, set its base URL above to that machine's address (e.g. <code>http://lvp-02:11434/v1</code>) and also set <code>OLLAMA_HOST=0.0.0.0</code> there.</p>
    </>
  );
}
