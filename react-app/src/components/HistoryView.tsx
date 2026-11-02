import { useState } from "react";
import type { Model, Run } from "../data/types";
import { clearRuns, deleteRun } from "../data/runner";
import { downloadText, stamp, toCsv } from "../data/csv";
import { fmtMs, fmtUsd } from "./bits";

interface Props {
  runs: Run[];
  models: Model[];
  onRunsChanged: (runs: Run[]) => void;
}

export default function HistoryView({ runs, models, onRunsChanged }: Props) {
  const [openId, setOpenId] = useState<string | null>(runs[0]?.id ?? null);
  const byId = new Map(models.map((m) => [m.id, m]));
  const open = runs.find((r) => r.id === openId) ?? null;

  const exportAll = () => {
    const rows: unknown[][] = [];
    for (const run of runs) for (const r of run.results) {
      const m = byId.get(r.modelId);
      rows.push([new Date(run.startedAt).toISOString(), run.operationName, run.targetLabel, m?.name ?? r.modelId, m?.vendor ?? "", m?.provider ?? "", m?.modelId ?? "", r.status, r.latencyMs ?? "", r.usage?.inputTokens ?? "", r.usage?.outputTokens ?? "", r.costUsd ?? "", r.status === "ok" ? r.text : r.error ?? ""]);
    }
    downloadText(`llm-registry-runs-${stamp()}.csv`, toCsv(["startedAt", "operation", "target", "model", "vendor", "provider", "modelId", "status", "latencyMs", "inputTokens", "outputTokens", "costUsd", "output"], rows));
  };

  return (
    <>
      <div className="view-head">
        <h2 className="view-title">Run history <span className="muted">· {runs.length}</span></h2>
        <span className="spacer" />
        <button type="button" className="btn secondary" onClick={exportAll} disabled={!runs.length}>Export all CSV</button>
        <button type="button" className="btn danger" onClick={() => { if (confirm("Delete all saved runs?")) { clearRuns(); onRunsChanged([]); setOpenId(null); } }} disabled={!runs.length}>Clear</button>
      </div>
      {!runs.length && <p className="note">No runs yet. The last 30 runs are kept in this browser.</p>}
      <div className="grid wide">
        {runs.map((run) => {
          const ok = run.results.filter((r) => r.status === "ok").length;
          const cost = run.results.reduce((s, r) => s + (r.costUsd ?? 0), 0);
          return (
            <div key={run.id} className={`card clickable${openId === run.id ? " selected" : ""}`} onClick={() => setOpenId(openId === run.id ? null : run.id)}>
              <h4>{run.operationName} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{new Date(run.startedAt).toLocaleString()}</span></h4>
              <div className="detail">{run.targetLabel} · {ok}/{run.results.length} ok · est. {fmtUsd(cost)}</div>
              <div className="detail" style={{ whiteSpace: "pre-wrap" }}>{run.prompt.slice(0, 160)}{run.prompt.length > 160 ? "…" : ""}</div>
              <div className="foot"><span className="spacer" /><button type="button" className="btn small danger" onClick={(e) => { e.stopPropagation(); onRunsChanged(deleteRun(run.id)); if (openId === run.id) setOpenId(null); }}>Delete</button></div>
            </div>
          );
        })}
      </div>
      {open && (
        <>
          <h3 className="view-title" style={{ margin: "16px 0 8px" }}>{open.operationName} — results</h3>
          {open.system && <div className="note" style={{ marginBottom: 8 }}><b>System:</b> {open.system}</div>}
          <div className="note" style={{ marginBottom: 10, whiteSpace: "pre-wrap" }}><b>Prompt:</b> {open.prompt}</div>
          <div className="results">
            {open.results.map((r) => {
              const m = byId.get(r.modelId);
              return (
                <div key={r.modelId} className={`card result ${r.status}`}>
                  <h4><span className={`status-dot ${r.status}`} aria-hidden="true" /> {m?.name ?? r.modelId}</h4>
                  <div className="meta"><span><b>{fmtMs(r.latencyMs)}</b></span>{r.usage && <span>{r.usage.inputTokens ?? "?"} in · {r.usage.outputTokens ?? "?"} out</span>}<span>cost <b>{fmtUsd(r.costUsd)}</b></span></div>
                  <pre>{r.status === "ok" ? r.text : r.error}</pre>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
