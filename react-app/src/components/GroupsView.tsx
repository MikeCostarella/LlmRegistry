import { useMemo, useState } from "react";
import type { Group, GroupFilter, Model, Provider } from "../data/types";
import { ACCESS_VALUES, CAPABILITY_VALUES, STATUS_VALUES } from "../data/types";
import { describeFilter, emptyFilter, resolveGroup } from "../data/groups";
import { allTags, slugify } from "../data/registry";
import { parseTags } from "./bits";

interface Props {
  models: Model[];
  providers: Provider[];
  groups: Group[];
  fileMode: boolean;
  onSave: (g: Group) => void;
  onRemove: (id: string) => void;
  onRun: (groupId: string) => void;
}

interface Draft {
  id: string;
  name: string;
  description: string;
  allTags: string;
  anyTags: string;
  noneTags: string;
  providers: Set<string>;
  vendors: Set<string>;
  access: Set<string>;
  status: Set<string>;
  capabilities: Set<string>;
  maxInputPrice: string;
  minContext: string;
}

function toDraft(g: Group | null): Draft {
  const f = g?.filter ?? {};
  return {
    id: g?.id ?? "",
    name: g?.name ?? "",
    description: g?.description ?? "",
    allTags: (f.allTags ?? []).join(", "),
    anyTags: (f.anyTags ?? []).join(", "),
    noneTags: (f.noneTags ?? []).join(", "),
    providers: new Set(f.providers ?? []),
    vendors: new Set(f.vendors ?? []),
    access: new Set(f.access ?? []),
    status: new Set(f.status ?? []),
    capabilities: new Set(f.capabilities ?? []),
    maxInputPrice: f.maxInputPrice === undefined ? "" : String(f.maxInputPrice),
    minContext: f.minContext === undefined ? "" : String(f.minContext),
  };
}

function toFilter(d: Draft): GroupFilter {
  const f: GroupFilter = {};
  const all = parseTags(d.allTags); if (all.length) f.allTags = all;
  const any = parseTags(d.anyTags); if (any.length) f.anyTags = any;
  const none = parseTags(d.noneTags); if (none.length) f.noneTags = none;
  if (d.providers.size) f.providers = [...d.providers];
  if (d.vendors.size) f.vendors = [...d.vendors];
  if (d.access.size) f.access = [...d.access];
  if (d.status.size) f.status = [...d.status];
  if (d.capabilities.size) f.capabilities = [...d.capabilities];
  if (d.maxInputPrice.trim() !== "" && !Number.isNaN(Number(d.maxInputPrice))) f.maxInputPrice = Number(d.maxInputPrice);
  if (d.minContext.trim() !== "" && !Number.isNaN(Number(d.minContext))) f.minContext = Number(d.minContext.replace(/[,_\s]/g, ""));
  return f;
}

export default function GroupsView({ models, providers, groups, fileMode, onSave, onRemove, onRun }: Props) {
  const [editing, setEditing] = useState<Group | null | "new">(null);
  const [d, setD] = useState<Draft>(() => toDraft(null));
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const toggleIn = (k: "providers" | "vendors" | "access" | "status" | "capabilities", v: string) =>
    setD((p) => { const n = new Set(p[k]); if (n.has(v)) n.delete(v); else n.add(v); return { ...p, [k]: n }; });

  const vendors = useMemo(() => [...new Set(models.map((m) => m.vendor))].sort(), [models]);
  const tagList = useMemo(() => allTags(models).map((t) => t.tag), [models]);
  const preview = useMemo(() => (editing !== null ? resolveGroup(models, toFilter(d)) : []), [models, d, editing]);

  const open = (g: Group | null) => { setD(toDraft(g)); setErr(null); setEditing(g ?? "new"); };
  const submit = () => {
    if (!d.name.trim()) return setErr("Name is required.");
    const filter = toFilter(d);
    if (emptyFilter(filter)) return setErr("Add at least one clause, or this group would match every model.");
    const id = editing === "new" ? (d.id.trim() || slugify(d.name)) : (editing as Group).id;
    if (editing === "new" && groups.some((g) => g.id === id)) return setErr(`A group with id "${id}" already exists.`);
    onSave({ id, name: d.name.trim(), description: d.description.trim() || undefined, filter });
    setEditing(null);
  };

  return (
    <>
      <div className="view-head">
        <h2 className="view-title">Groups <span className="muted">· {groups.length}</span></h2>
        <span className="spacer" />
        <button type="button" className="btn" onClick={() => open(null)}>+ New group</button>
      </div>
      <div className="banner info">A group is a <b>tag query</b>. Clauses AND together; values inside a clause OR. New models join matching groups automatically.</div>

      {editing !== null && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h4>{editing === "new" ? "New group" : `Edit ${(editing as Group).name}`}</h4>
          <div className="form-grid">
            <label className="field"><span>Name</span><input className="input" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Cheap coding models" /></label>
            <label className="field"><span>Id (blank = from name)</span><input className="input mono" value={d.id} onChange={(e) => set("id", e.target.value)} disabled={editing !== "new"} /></label>
            <label className="field wide"><span>Description</span><input className="input" value={d.description} onChange={(e) => set("description", e.target.value)} /></label>
            <label className="field"><span>Must have ALL of these tags</span><input className="input" value={d.allTags} onChange={(e) => set("allTags", e.target.value)} placeholder="coding, cheap" list="tag-options" /></label>
            <label className="field"><span>Must have ANY of these tags</span><input className="input" value={d.anyTags} onChange={(e) => set("anyTags", e.target.value)} placeholder="frontier, workhorse" list="tag-options" /></label>
            <label className="field"><span>Must have NONE of these tags</span><input className="input" value={d.noneTags} onChange={(e) => set("noneTags", e.target.value)} placeholder="deprecated" list="tag-options" /></label>
            <datalist id="tag-options">{tagList.map((t) => <option key={t} value={t} />)}</datalist>
            <label className="field"><span>Max $ per 1M input tokens</span><input className="input" value={d.maxInputPrice} onChange={(e) => set("maxInputPrice", e.target.value)} placeholder="1" /></label>
            <label className="field"><span>Min context window (tokens)</span><input className="input" value={d.minContext} onChange={(e) => set("minContext", e.target.value)} placeholder="200000" /></label>
            <div className="field wide"><span>Providers</span><div className="chips">{providers.map((p) => <button key={p.id} type="button" className={`chip${d.providers.has(p.id) ? " on" : ""}`} onClick={() => toggleIn("providers", p.id)}>{p.name}</button>)}</div></div>
            <div className="field wide"><span>Vendors</span><div className="chips">{vendors.map((v) => <button key={v} type="button" className={`chip${d.vendors.has(v) ? " on" : ""}`} onClick={() => toggleIn("vendors", v)}>{v}</button>)}</div></div>
            <div className="field"><span>Access</span><div className="chips">{ACCESS_VALUES.map((v) => <button key={v} type="button" className={`chip${d.access.has(v) ? " on" : ""}`} onClick={() => toggleIn("access", v)}>{v}</button>)}</div></div>
            <div className="field"><span>Status</span><div className="chips">{STATUS_VALUES.map((v) => <button key={v} type="button" className={`chip${d.status.has(v) ? " on" : ""}`} onClick={() => toggleIn("status", v)}>{v}</button>)}</div></div>
            <div className="field wide"><span>Capabilities (must have all ticked)</span><div className="chips">{CAPABILITY_VALUES.map((v) => <button key={v} type="button" className={`chip${d.capabilities.has(v) ? " on" : ""}`} onClick={() => toggleIn("capabilities", v)}>{v}</button>)}</div></div>
          </div>
          <div className="note">Matches now: <b>{preview.length}</b>{preview.length ? " — " + preview.slice(0, 12).map((m) => m.name).join(", ") + (preview.length > 12 ? "…" : "") : ""}</div>
          {err && <div className="note error">{err}</div>}
          <div className="actions">
            <button type="button" className="btn" onClick={submit}>{editing === "new" ? "Create group" : "Save changes"}</button>
            <button type="button" className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
            {editing !== "new" && (fileMode || (editing as Group).local) && <button type="button" className="btn danger" onClick={() => { onRemove((editing as Group).id); setEditing(null); }}>Delete</button>}
          </div>
        </div>
      )}

      <div className="grid">
        {groups.map((g) => {
          const members = resolveGroup(models, g.filter);
          return (
            <div key={g.id} className="card">
              <h4>{g.name} <span className="badge status">{members.length} model{members.length === 1 ? "" : "s"}</span>{g.local && <span className="badge local-edit">local</span>}</h4>
              {g.description && <div className="detail">{g.description}</div>}
              <div className="detail mono">{describeFilter(g.filter)}</div>
              <div className="detail">{members.length ? members.map((m) => m.name).join(" · ") : <span className="muted">No models match yet.</span>}</div>
              <div className="foot">
                <button type="button" className="btn small go" onClick={() => onRun(g.id)} disabled={!members.length}>Run on this group →</button>
                <button type="button" className="btn small secondary" onClick={() => open(g)}>{fileMode || g.local ? "Edit" : "Edit (as local copy)"}</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
