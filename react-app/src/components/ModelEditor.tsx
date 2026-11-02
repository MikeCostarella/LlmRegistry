import { useState } from "react";
import type { Access, Capability, Model, Provider, Status } from "../data/types";
import { ACCESS_VALUES, CAPABILITY_VALUES, STATUS_VALUES } from "../data/types";
import { slugify } from "../data/registry";
import { parseTags } from "./bits";

interface Props {
  model: Model | null; // null = new
  providers: Provider[];
  existingIds: string[];
  /** true when saves go to registry/models.json (dev server), so bundled entries can really be deleted */
  fileMode?: boolean;
  onSave: (m: Model) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

interface Draft {
  id: string;
  name: string;
  vendor: string;
  provider: string;
  modelId: string;
  modelIdVerified: boolean;
  access: Access;
  license: string;
  status: Status;
  released: string;
  contextWindow: string;
  priceIn: string;
  priceOut: string;
  capabilities: Set<Capability>;
  tags: string;
  homepage: string;
  notes: string;
}

function toDraft(m: Model | null, providers: Provider[]): Draft {
  return {
    id: m?.id ?? "",
    name: m?.name ?? "",
    vendor: m?.vendor ?? "",
    provider: m?.provider ?? providers[0]?.id ?? "",
    modelId: m?.modelId ?? "",
    modelIdVerified: m?.modelIdVerified ?? true,
    access: m?.access ?? "closed",
    license: m?.license ?? "",
    status: m?.status ?? "current",
    released: m?.released ?? "",
    contextWindow: m?.contextWindow ? String(m.contextWindow) : "",
    priceIn: m?.pricing ? String(m.pricing.input) : "",
    priceOut: m?.pricing ? String(m.pricing.output) : "",
    capabilities: new Set(m?.capabilities ?? []),
    tags: (m?.tags ?? []).join(", "),
    homepage: m?.homepage ?? "",
    notes: m?.notes ?? "",
  };
}

export default function ModelEditor({ model, providers, existingIds, fileMode, onSave, onCancel, onDelete }: Props) {
  const [d, setD] = useState<Draft>(() => toDraft(model, providers));
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const isNew = !model;

  const submit = () => {
    const id = d.id.trim() || `${slugify(d.vendor || "custom")}/${slugify(d.modelId || d.name)}`;
    if (!d.name.trim()) return setErr("Name is required.");
    if (!d.modelId.trim()) return setErr("Model id (the string sent to the API) is required.");
    if (!d.provider) return setErr("Pick a provider.");
    if (isNew && existingIds.includes(id)) return setErr(`A model with id "${id}" already exists.`);
    const pin = d.priceIn.trim() === "" ? null : Number(d.priceIn);
    const pout = d.priceOut.trim() === "" ? null : Number(d.priceOut);
    if ((pin !== null && Number.isNaN(pin)) || (pout !== null && Number.isNaN(pout))) return setErr("Prices must be numbers (USD per 1M tokens).");
    const ctx = d.contextWindow.trim() === "" ? null : Number(d.contextWindow.replace(/[,_\s]/g, ""));
    if (ctx !== null && Number.isNaN(ctx)) return setErr("Context window must be a number of tokens.");
    const out: Model = {
      id,
      name: d.name.trim(),
      vendor: d.vendor.trim() || "Unknown",
      provider: d.provider,
      modelId: d.modelId.trim(),
      modelIdVerified: d.modelIdVerified,
      access: d.access,
      license: d.license.trim() || undefined,
      status: d.status,
      released: d.released.trim() || undefined,
      contextWindow: ctx,
      pricing: pin === null && pout === null ? null : { input: pin ?? 0, output: pout ?? 0 },
      capabilities: [...d.capabilities],
      tags: parseTags(d.tags),
      homepage: d.homepage.trim() || undefined,
      notes: d.notes.trim() || undefined,
    };
    onSave(out);
  };

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <h4>{isNew ? "Add a model" : `Edit ${model.name}`}</h4>
      <div className="form-grid">
        <label className="field"><span>Name</span><input className="input" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Claude Sonnet 5.5" /></label>
        <label className="field"><span>Vendor (lab)</span><input className="input" value={d.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="Anthropic" /></label>
        <label className="field"><span>Provider (who serves it)</span>
          <select value={d.provider} onChange={(e) => set("provider", e.target.value)}>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Model id sent to the API</span><input className="input mono" value={d.modelId} onChange={(e) => set("modelId", e.target.value)} placeholder="claude-sonnet-5-5" /></label>
        <label className="field"><span>Registry id (blank = auto)</span><input className="input mono" value={d.id} onChange={(e) => set("id", e.target.value)} disabled={!isNew} placeholder="anthropic/claude-sonnet-5-5" /></label>
        <label className="field"><span>Access</span>
          <select value={d.access} onChange={(e) => set("access", e.target.value as Access)}>{ACCESS_VALUES.map((a) => <option key={a}>{a}</option>)}</select>
        </label>
        <label className="field"><span>Status</span>
          <select value={d.status} onChange={(e) => set("status", e.target.value as Status)}>{STATUS_VALUES.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label className="field"><span>License</span><input className="input" value={d.license} onChange={(e) => set("license", e.target.value)} placeholder="Proprietary / MIT / Apache-2.0" /></label>
        <label className="field"><span>Released</span><input className="input" value={d.released} onChange={(e) => set("released", e.target.value)} placeholder="2026-09" /></label>
        <label className="field"><span>Context window (tokens)</span><input className="input" value={d.contextWindow} onChange={(e) => set("contextWindow", e.target.value)} placeholder="200000" /></label>
        <label className="field"><span>$ per 1M input tokens</span><input className="input" value={d.priceIn} onChange={(e) => set("priceIn", e.target.value)} placeholder="3" /></label>
        <label className="field"><span>$ per 1M output tokens</span><input className="input" value={d.priceOut} onChange={(e) => set("priceOut", e.target.value)} placeholder="15" /></label>
        <label className="field wide"><span>Tags (comma or space separated)</span><input className="input" value={d.tags} onChange={(e) => set("tags", e.target.value)} placeholder="frontier, coding, cheap" /></label>
        <div className="field wide">
          <span>Capabilities</span>
          <div className="chips">
            {CAPABILITY_VALUES.map((c) => (
              <button key={c} type="button" className={`chip${d.capabilities.has(c) ? " on" : ""}`} onClick={() => { const n = new Set(d.capabilities); if (n.has(c)) n.delete(c); else n.add(c); set("capabilities", n); }}>{c}</button>
            ))}
          </div>
        </div>
        <label className="field wide"><span>Homepage</span><input className="input" value={d.homepage} onChange={(e) => set("homepage", e.target.value)} placeholder="https://" /></label>
        <label className="field wide"><span>Notes</span><textarea value={d.notes} onChange={(e) => set("notes", e.target.value)} /></label>
        <label className="row wide" style={{ fontSize: 12.5 }}>
          <input type="checkbox" checked={d.modelIdVerified} onChange={(e) => set("modelIdVerified", e.target.checked)} /> Model id confirmed against the provider's catalog
        </label>
      </div>
      {err && <div className="note error">{err}</div>}
      <div className="actions">
        <button type="button" className="btn" onClick={submit}>{isNew ? "Add model" : "Save changes"}</button>
        <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>
        {!isNew && onDelete && (
          <button type="button" className="btn danger" onClick={() => onDelete(model.id)} title={fileMode ? "Remove from registry/models.json" : model.local ? "Remove this local model" : "Hide this bundled model in this browser"}>
            {fileMode || model.local ? "Delete" : "Hide"}
          </button>
        )}
      </div>
    </div>
  );
}
