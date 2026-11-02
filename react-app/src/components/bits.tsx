import type { Model } from "../data/types";

export function fmtPrice(p: Model["pricing"]): string {
  if (!p) return "—";
  if (p.input === 0 && p.output === 0) return "free";
  return `$${trim(p.input)} / $${trim(p.output)}`;
}

export function fmtContext(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export function fmtUsd(n: number | null | undefined, digits = 4): string {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "$0";
  if (n < 0.0001) return "<$0.0001";
  return `$${n.toFixed(digits)}`;
}

export function fmtMs(ms: number | undefined): string {
  if (ms === undefined) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

export function AccessBadge({ m }: { m: Model }) {
  return <span className={`badge ${m.access}`}>{m.access}</span>;
}

export function StatusBadge({ m }: { m: Model }) {
  return <span className={`badge status ${m.status}`}>{m.status}</span>;
}

export function ModelBadges({ m }: { m: Model }) {
  return (
    <>
      <AccessBadge m={m} />
      {m.status !== "current" && <StatusBadge m={m} />}
      {m.modelIdVerified === false && <span className="badge unverified" title="Model id taken from an announcement, not a provider catalog">unverified id</span>}
      {m.local && <span className="badge local-edit" title="Added or edited in this browser">local edit</span>}
    </>
  );
}

export function TagChips({ tags, active, onToggle }: { tags: string[]; active?: Set<string>; onToggle?: (t: string) => void }) {
  return (
    <div className="chips">
      {tags.map((t) => (
        <button key={t} type="button" className={`chip${active?.has(t) ? " on" : ""}${onToggle ? "" : " static"}`} onClick={onToggle ? () => onToggle(t) : undefined} tabIndex={onToggle ? 0 : -1}>
          {t}
        </button>
      ))}
    </div>
  );
}

/** Parse a comma / space separated tag string into a clean array. */
export function parseTags(s: string): string[] {
  return [...new Set(s.split(/[,\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export function parseList(s: string): string[] | undefined {
  const arr = s.split(",").map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}
