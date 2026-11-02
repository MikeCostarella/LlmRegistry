import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, Model, Operation, Provider, Run, Settings } from "../data/types";
import { resolveGroup } from "../data/groups";
import { executeRun, missingKey, newRun, saveRun } from "../data/runner";
import { downloadText, stamp, toCsv } from "../data/csv";
import { Term, fmtMs, fmtUsd } from "./bits";
import { TIP } from "../data/glossary";

export interface RunTarget {
  kind: "group" | "models";
  groupId?: string;
  modelIds?: string[];
}

interface Props {
  models: Model[];
  providers: Provider[];
  groups: Group[];
  operations: Operation[];
  settings: Settings;
  initialTarget: RunTarget | null;
  initialOperationId: string | null;
  onRunSaved: (runs: Run[]) => void;
  onGoSettings: () => void;
}

export default function RunView({ models, providers, groups, operations, settings, initialTarget, initialOperationId, onRunSaved, onGoSettings }: Props) {
  const [opId, setOpId] = useState<string>(initialOperationId ?? operations[0]?.id ?? "");
  const [system, setSystem] = useState("");
  const [prompt, setPrompt] = useState("");
  const [groupId, setGroupId] = useState<string>(initialTarget?.kind === "group" ? initialTarget.groupId ?? "" : "");
  const [picked, setPicked] = useState<Set<string>>(() => new Set(initialTarget?.kind === "models" ? initialTarget.modelIds ?? [] : []));
  const [maxTokens, setMaxTokens] = useState("1024");
  const [temperature, setTemperature] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const providerById = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers]);

  // Load the chosen operation's text into the editable fields.
  useEffect(() => {
    const o = operations.find((x) => x.id === opId);
    if (o) { setSystem(o.system ?? ""); setPrompt(o.prompt); }
  }, [opId, operations]);

  useEffect(() => {
    if (!initialTarget) return;
    if (initialTarget.kind === "group") { setGroupId(initialTarget.groupId ?? ""); setPicked(new Set()); }
    else { setGroupId(""); setPicked(new Set(initialTarget.modelIds ?? [])); }
  }, [initialTarget]);

  useEffect(() => { if (initialOperationId) setOpId(initialOperationId); }, [initialOperationId]);

  const group = groups.find((g) => g.id === groupId) ?? null;
  const targets: Model[] = useMemo(() => {
    if (group) return resolveGroup(models, group.filter);
    return models.filter((m) => picked.has(m.id));
  }, [models, group, picked]);
  const targetLabel = group ? `group: ${group.name}` : `${targets.length} picked model${targets.length === 1 ? "" : "s"}`;

  const unkeyed = targets.filter((m) => { const p = providerById.get(m.provider); return p && missingKey(p, settings); });
  const noBrowser = targets.filter((m) => providerById.get(m.provider)?.browser === false);

  const togglePick = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const start = async () => {
    if (!prompt.trim() || !targets.length || running) return;
    const op = operations.find((x) => x.id === opId);
    const input = {
      operationName: op && op.prompt === prompt && (op.system ?? "") === system ? op.name : (op ? `${op.name} (edited)` : "ad hoc"),
      system,
      prompt,
      targetLabel,
      models: targets,
      providers,
      settings,
      maxTokens: maxTokens.trim() ? Number(maxTokens) : undefined,
      temperature: temperature.trim() ? Number(temperature) : undefined,
    };
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const r = newRun(input);
    setRun(r);
    setRunning(true);
    const final = await executeRun(r, { ...input, signal: ctrl.signal }, setRun);
    setRunning(false);
    abortRef.current = null;
    onRunSaved(saveRun(final));
  };

  const cancel = () => abortRef.current?.abort(new Error("cancelled"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); void start(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, system, targets, running, settings, maxTokens, temperature]);

  const modelById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const done = run?.results.filter((r) => r.status === "ok" || r.status === "error").length ?? 0;
  const okCount = run?.results.filter((r) => r.status === "ok").length ?? 0;
  const totalCost = run?.results.reduce((s, r) => s + (r.costUsd ?? 0), 0) ?? 0;
  const anyCost = run?.results.some((r) => r.costUsd !== null && r.costUsd !== undefined) ?? false;

  const exportCsv = () => {
    if (!run) return;
    const rows = run.results.map((r) => {
      const m = modelById.get(r.modelId);
      return [new Date(run.startedAt).toISOString(), run.operationName, run.targetLabel, m?.name ?? r.modelId, m?.vendor ?? "", m?.provider ?? "", m?.modelId ?? "", r.status, r.latencyMs ?? "", r.usage?.inputTokens ?? "", r.usage?.outputTokens ?? "", r.costUsd ?? "", r.status === "ok" ? r.text : r.error ?? ""];
    });
    downloadText(`llm-registry-run-${stamp(new Date(run.startedAt))}.csv`, toCsv(["startedAt", "operation", "target", "model", "vendor", "provider", "modelId", "status", "latencyMs", "inputTokens", "outputTokens", "costUsd", "output"], rows));
  };

  return (
    <>
      <div className="view-head">
        <h2 className="view-title">Run</h2>
        <span className="spacer" />
        {run && <button type="button" className="btn secondary" onClick={exportCsv}>Export run CSV</button>}
        {running ? (
          <button type="button" className="btn danger" onClick={cancel}>Cancel</button>
        ) : (
          <button type="button" className="btn go" onClick={() => void start()} disabled={!prompt.trim() || !targets.length} title="Send the prompt to every target in parallel (Ctrl+Enter).">Run on {targets.length} model{targets.length === 1 ? "" : "s"} →</button>
        )}
      </div>

      <div className="grid wide" style={{ marginBottom: 12 }}>
        <div className="card">
          <h4>Operation</h4>
          <label className="field"><span><Term tip={TIP.operation}>Saved operation</Term></span>
            <select value={opId} onChange={(e) => setOpId(e.target.value)}>
              {operations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <label className="field"><span><Term tip={TIP.systemPrompt}>System prompt</Term></span><textarea value={system} onChange={(e) => setSystem(e.target.value)} style={{ minHeight: 56 }} /></label>
          <label className="field"><span><Term tip={TIP.prompt}>Prompt</Term></span><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ minHeight: 110 }} /></label>
          <div className="row">
            <label className="field" style={{ width: 120 }}><span><Term tip={TIP.maxTokens}>Max tokens</Term></span><input className="input" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} /></label>
            <label className="field" style={{ width: 120 }}><span><Term tip={TIP.temperature}>Temperature</Term></span><input className="input" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="default" /></label>
            <span className="note" style={{ margin: 0 }}>Ctrl+Enter runs.</span>
          </div>
        </div>

        <div className="card">
          <h4><Term tip={TIP.target}>Target</Term> <span className="badge status" title="How many models will be called.">{targets.length}</span></h4>
          <label className="field"><span><Term tip="Pick a group to run on everything it matches right now, or choose the blank entry to tick models by hand.">Group</Term></span>
            <select value={groupId} onChange={(e) => { setGroupId(e.target.value); if (e.target.value) setPicked(new Set()); }}>
              <option value="">— pick models individually —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({resolveGroup(models, g.filter).length})</option>)}
            </select>
          </label>
          {!group && (
            <div className="target-list" role="group" aria-label="Pick models">
              {models.map((m) => (
                <label key={m.id}>
                  <input type="checkbox" checked={picked.has(m.id)} onChange={() => togglePick(m.id)} />
                  <span>{m.name}</span>
                  <span className="mid">{providerById.get(m.provider)?.name ?? m.provider}</span>
                </label>
              ))}
            </div>
          )}
          {group && <div className="detail">{targets.map((m) => m.name).join(" · ") || "No models match this group."}</div>}
          {unkeyed.length > 0 && (
            <div className="note" style={{ color: "var(--warn)" }}>
              No API key for: {[...new Set(unkeyed.map((m) => providerById.get(m.provider)?.name))].join(", ")}. Those will error — <a href="#/settings" onClick={(e) => { e.preventDefault(); onGoSettings(); }}>add keys in Settings</a>.
            </div>
          )}
          {noBrowser.length > 0 && <div className="note" style={{ color: "var(--warn)" }}>{[...new Set(noBrowser.map((m) => providerById.get(m.provider)?.name))].join(", ")} may block browser calls (CORS); use OpenRouter or the MCP server for those.</div>}
        </div>
      </div>

      {run && (
        <>
          <div className="summary-row">
            <span><b>{run.operationName}</b> on <b>{run.targetLabel}</b></span>
            <span>{done} / {run.results.length} finished · <b>{okCount}</b> ok</span>
            {anyCost && <span title={TIP.estCost}>Total est. cost <b>{fmtUsd(totalCost)}</b></span>}
            <span className="muted">{new Date(run.startedAt).toLocaleString()}</span>
          </div>
          <div className="results">
            {run.results.map((r) => {
              const m = modelById.get(r.modelId);
              return (
                <div key={r.modelId} className={`card result ${r.status}`}>
                  <h4><span className={`status-dot ${r.status}`} aria-hidden="true" title={TIP.runStatus} /> {m?.name ?? r.modelId} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{m?.vendor}</span></h4>
                  <div className="meta">
                    <span title={TIP.provider}>via <b>{m ? providerById.get(m.provider)?.name ?? m.provider : "?"}</b></span>
                    <span title={TIP.latency}><b>{fmtMs(r.latencyMs)}</b></span>
                    {r.usage && <span title={TIP.tokensInOut}>{r.usage.inputTokens ?? "?"} in · {r.usage.outputTokens ?? "?"} out</span>}
                    {r.status === "ok" && <span title={TIP.estCost}>cost <b>{fmtUsd(r.costUsd)}</b></span>}
                  </div>
                  {r.status === "pending" && <div className="detail">Waiting…</div>}
                  {r.status === "running" && <div className="detail">Calling {m?.modelId}…</div>}
                  {r.status === "ok" && <pre>{r.text || <span className="muted">(empty response)</span>}</pre>}
                  {r.status === "error" && <pre>{r.error}</pre>}
                </div>
              );
            })}
          </div>
        </>
      )}
      {!run && <p className="note">Pick an operation and a target, then Run. Results appear here as each model answers, with latency, token counts and the estimated cost from the registry's pricing.</p>}
    </>
  );
}
