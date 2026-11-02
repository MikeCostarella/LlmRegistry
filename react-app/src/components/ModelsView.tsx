import { useMemo, useState } from "react";
import type { Group, Model, Provider } from "../data/types";
import { allTags } from "../data/registry";
import { resolveGroup } from "../data/groups";
import { downloadText, stamp, toCsv } from "../data/csv";
import ModelEditor from "./ModelEditor";
import { ModelBadges, TagChips, fmtContext, fmtPrice } from "./bits";

type SortKey = "vendor" | "name" | "provider" | "access" | "context" | "priceIn" | "priceOut" | "status";

interface Props {
  models: Model[];
  providers: Provider[];
  groups: Group[];
  fileMode: boolean;
  onSave: (m: Model) => void;
  onRemove: (id: string) => void;
  onRunModels: (ids: string[]) => void;
}

export default function ModelsView({ models, providers, groups, fileMode, onSave, onRemove, onRunModels }: Props) {
  const [q, setQ] = useState("");
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [groupId, setGroupId] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "vendor", dir: 1 });
  const [editing, setEditing] = useState<Model | null | "new">(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<"table" | "cards">("table");

  const providerName = (id: string) => providers.find((p) => p.id === id)?.name ?? id;
  const tagList = useMemo(() => allTags(models), [models]);

  const filtered = useMemo(() => {
    let list = models;
    const g = groups.find((x) => x.id === groupId);
    if (g) list = resolveGroup(list, g.filter);
    if (tags.size) list = list.filter((m) => [...tags].every((t) => m.tags.includes(t)));
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((m) => [m.name, m.vendor, m.modelId, m.provider, m.license ?? "", m.notes ?? "", ...m.tags].join(" ").toLowerCase().includes(s));
    const cmp = (a: Model, b: Model): number => {
      switch (sort.key) {
        case "name": return a.name.localeCompare(b.name);
        case "provider": return providerName(a.provider).localeCompare(providerName(b.provider));
        case "access": return a.access.localeCompare(b.access);
        case "status": return a.status.localeCompare(b.status);
        case "context": return (a.contextWindow ?? -1) - (b.contextWindow ?? -1);
        case "priceIn": return (a.pricing?.input ?? Infinity) - (b.pricing?.input ?? Infinity);
        case "priceOut": return (a.pricing?.output ?? Infinity) - (b.pricing?.output ?? Infinity);
        default: return a.vendor.localeCompare(b.vendor) || a.name.localeCompare(b.name);
      }
    };
    return [...list].sort((a, b) => sort.dir * cmp(a, b));
  }, [models, groups, groupId, tags, q, sort, providers]);

  const toggleTag = (t: string) => setTags((p) => { const n = new Set(p); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  const toggleChecked = (id: string) => setChecked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const header = (label: string, key: SortKey, align?: "num") => (
    <th className={align} onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      {label}{sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );

  const exportCsv = () => {
    const rows = filtered.map((m) => [m.id, m.name, m.vendor, providerName(m.provider), m.modelId, m.modelIdVerified === false ? "no" : "yes", m.access, m.status, m.license ?? "", m.released ?? "", m.contextWindow ?? "", m.pricing?.input ?? "", m.pricing?.output ?? "", (m.capabilities ?? []).join(" "), m.tags.join(" "), m.homepage ?? "", m.notes ?? ""]);
    downloadText(`llm-registry-models-${stamp()}.csv`, toCsv(["id", "name", "vendor", "provider", "modelId", "idVerified", "access", "status", "license", "released", "contextWindow", "usdPer1MInput", "usdPer1MOutput", "capabilities", "tags", "homepage", "notes"], rows));
  };

  const existingIds = models.map((m) => m.id);

  return (
    <>
      <div className="view-head">
        <h2 className="view-title">Models <span className="muted">· {filtered.length} of {models.length}</span></h2>
        <input className="input search" placeholder="Search name, vendor, model id, tag…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search models" />
        <label className="pick">Group{" "}
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">any</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <div className="seg" role="group" aria-label="Layout">
          <button type="button" className={layout === "table" ? "active" : ""} onClick={() => setLayout("table")}>Table</button>
          <button type="button" className={layout === "cards" ? "active" : ""} onClick={() => setLayout("cards")}>Cards</button>
        </div>
        <span className="spacer" />
        <button type="button" className="btn" onClick={() => setEditing("new")}>+ Add model</button>
        <button type="button" className="btn secondary" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
        {checked.size > 0 && <button type="button" className="btn go" onClick={() => onRunModels([...checked])}>Run on {checked.size} selected →</button>}
      </div>

      <div className="row" style={{ marginBottom: 10 }}>
        <TagChips tags={tagList.slice(0, 40).map((t) => t.tag)} active={tags} onToggle={toggleTag} />
        {tags.size > 0 && <button type="button" className="btn small secondary" onClick={() => setTags(new Set())}>clear tags</button>}
      </div>

      {editing !== null && (
        <ModelEditor
          model={editing === "new" ? null : editing}
          providers={providers}
          existingIds={existingIds}
          fileMode={fileMode}
          onSave={(m) => { onSave(m); setEditing(null); }}
          onCancel={() => setEditing(null)}
          onDelete={(id) => { onRemove(id); setEditing(null); }}
        />
      )}

      {layout === "table" ? (
        <div className="table-wrap">
          <table className="models">
            <thead>
              <tr>
                <th style={{ cursor: "default" }} aria-label="Select"><input type="checkbox" aria-label="Select all shown" checked={filtered.length > 0 && filtered.every((m) => checked.has(m.id))} onChange={(e) => setChecked(e.target.checked ? new Set(filtered.map((m) => m.id)) : new Set())} /></th>
                {header("Model", "name")}
                {header("Vendor", "vendor")}
                {header("Provider", "provider")}
                {header("Access", "access")}
                {header("Status", "status")}
                {header("Context", "context", "num")}
                {header("$ in / out per 1M", "priceIn", "num")}
                <th style={{ cursor: "default" }}>Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className={checked.has(m.id) ? "selected" : ""} onClick={() => setEditing(m)}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={checked.has(m.id)} onChange={() => toggleChecked(m.id)} aria-label={`Select ${m.name}`} /></td>
                  <td><div className="name">{m.name}</div><div className="mid">{m.modelId}</div></td>
                  <td>{m.vendor}</td>
                  <td>{providerName(m.provider)}</td>
                  <td><ModelBadges m={{ ...m, status: "current", local: false }} /></td>
                  <td><span className={`badge status ${m.status}`}>{m.status}</span>{m.local && <> <span className="badge local-edit">local</span></>}</td>
                  <td className="num">{fmtContext(m.contextWindow)}</td>
                  <td className="num">{fmtPrice(m.pricing)}</td>
                  <td><TagChips tags={m.tags} /></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={9} className="muted" style={{ padding: 16 }}>No models match. Clear the search, tags or group.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((m) => (
            <div key={m.id} className={`card clickable${checked.has(m.id) ? " selected" : ""}`} onClick={() => setEditing(m)}>
              <h4><input type="checkbox" checked={checked.has(m.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleChecked(m.id)} aria-label={`Select ${m.name}`} />{m.name} <ModelBadges m={m} /></h4>
              <div className="detail">{m.vendor} · via {providerName(m.provider)} · <span className="mono">{m.modelId}</span></div>
              <dl className="kv">
                <dt>Context</dt><dd>{fmtContext(m.contextWindow)}</dd>
                <dt>Price</dt><dd>{fmtPrice(m.pricing)}{m.pricing && m.pricing.input + m.pricing.output > 0 ? " per 1M" : ""}</dd>
                {m.license && <><dt>License</dt><dd>{m.license}</dd></>}
                {m.capabilities?.length ? <><dt>Can</dt><dd>{m.capabilities.join(", ")}</dd></> : null}
              </dl>
              {m.notes && <div className="detail">{m.notes}</div>}
              <div className="foot"><TagChips tags={m.tags} /></div>
            </div>
          ))}
        </div>
      )}
      <p className="note">
        Click a row to edit.{" "}
        {fileMode
          ? <>Edits are written straight to <code>registry/models.json</code> in the repo — commit them when you're happy.</>
          : <>Edits and additions are stored in this browser; use <b>Settings → Export registry JSON</b> to fold them back into <code>registry/models.json</code> in the repo.</>}
      </p>
    </>
  );
}
