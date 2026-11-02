import { useState } from "react";
import type { Operation } from "../data/types";
import { slugify } from "../data/registry";

interface Props {
  operations: Operation[];
  fileMode: boolean;
  onSave: (o: Operation) => void;
  onRemove: (id: string) => void;
  onRun: (operationId: string) => void;
}

interface Draft { id: string; name: string; description: string; system: string; prompt: string }

export default function OperationsView({ operations, fileMode, onSave, onRemove, onRun }: Props) {
  const [editing, setEditing] = useState<Operation | null | "new">(null);
  const [d, setD] = useState<Draft>({ id: "", name: "", description: "", system: "", prompt: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const open = (o: Operation | null) => {
    setD({ id: o?.id ?? "", name: o?.name ?? "", description: o?.description ?? "", system: o?.system ?? "", prompt: o?.prompt ?? "" });
    setErr(null);
    setEditing(o ?? "new");
  };
  const submit = () => {
    if (!d.name.trim()) return setErr("Name is required.");
    if (!d.prompt.trim()) return setErr("Prompt is required.");
    const id = editing === "new" ? (d.id.trim() || slugify(d.name)) : (editing as Operation).id;
    if (editing === "new" && operations.some((o) => o.id === id)) return setErr(`An operation with id "${id}" already exists.`);
    onSave({ id, name: d.name.trim(), description: d.description.trim() || undefined, system: d.system.trim() || undefined, prompt: d.prompt });
    setEditing(null);
  };

  return (
    <>
      <div className="view-head">
        <h2 className="view-title">Operations <span className="muted">· {operations.length}</span></h2>
        <span className="spacer" />
        <button type="button" className="btn" onClick={() => open(null)}>+ New operation</button>
      </div>
      <div className="banner info">An operation is a saved <b>system prompt + prompt</b>. Run one against a group to see every model's answer side by side. Later versions can add inputs, expected outputs and scorers.</div>

      {editing !== null && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h4>{editing === "new" ? "New operation" : `Edit ${(editing as Operation).name}`}</h4>
          <div className="form-grid">
            <label className="field"><span>Name</span><input className="input" value={d.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label className="field"><span>Id (blank = from name)</span><input className="input mono" value={d.id} onChange={(e) => set("id", e.target.value)} disabled={editing !== "new"} /></label>
            <label className="field wide"><span>Description</span><input className="input" value={d.description} onChange={(e) => set("description", e.target.value)} /></label>
            <label className="field wide"><span>System prompt (optional)</span><textarea value={d.system} onChange={(e) => set("system", e.target.value)} /></label>
            <label className="field wide"><span>Prompt</span><textarea value={d.prompt} onChange={(e) => set("prompt", e.target.value)} style={{ minHeight: 120 }} /></label>
          </div>
          {err && <div className="note error">{err}</div>}
          <div className="actions">
            <button type="button" className="btn" onClick={submit}>{editing === "new" ? "Create operation" : "Save changes"}</button>
            <button type="button" className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
            {editing !== "new" && (fileMode || (editing as Operation).local) && <button type="button" className="btn danger" onClick={() => { onRemove((editing as Operation).id); setEditing(null); }}>Delete</button>}
          </div>
        </div>
      )}

      <div className="grid wide">
        {operations.map((o) => (
          <div key={o.id} className="card">
            <h4>{o.name}{o.local && <span className="badge local-edit">local</span>}</h4>
            {o.description && <div className="detail">{o.description}</div>}
            {o.system && <div className="detail"><b>System:</b> {o.system}</div>}
            <pre className="mono" style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "var(--text-main)", background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: 6 }}>{o.prompt}</pre>
            <div className="foot">
              <button type="button" className="btn small go" onClick={() => onRun(o.id)}>Run →</button>
              <button type="button" className="btn small secondary" onClick={() => open(o)}>{fileMode || o.local ? "Edit" : "Edit (as local copy)"}</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
