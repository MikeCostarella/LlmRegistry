import type { ReactNode } from "react";
import type { Model } from "../data/types";
import { TIP } from "../data/glossary";

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

const ACCESS_TIP: Record<Model["access"], string> = { closed: TIP.badgeClosed, "open-weight": TIP.badgeOpenWeight, "open-source": TIP.badgeOpenSource };
const STATUS_TIP: Record<Model["status"], string> = { current: "Current: in production use.", preview: TIP.badgePreview, deprecated: TIP.badgeDeprecated, local: TIP.badgeLocal };

export function AccessBadge({ m }: { m: Model }) {
  return <span className={`badge ${m.access}`} title={ACCESS_TIP[m.access]}>{m.access}</span>;
}

export function StatusBadge({ m }: { m: Model }) {
  return <span className={`badge status ${m.status}`} title={STATUS_TIP[m.status]}>{m.status}</span>;
}

export function ModelBadges({ m }: { m: Model }) {
  return (
    <>
      <AccessBadge m={m} />
      {m.status !== "current" && <StatusBadge m={m} />}
      {m.modelIdVerified === false && <span className="badge unverified" title={TIP.badgeUnverified}>unverified id</span>}
      {m.local && <span className="badge local-edit" title={TIP.badgeLocalEdit}>local edit</span>}
    </>
  );
}

export function TagChips({ tags, active, onToggle, tip }: { tags: string[]; active?: Set<string>; onToggle?: (t: string) => void; tip?: (t: string) => string }) {
  return (
    <div className="chips">
      {tags.map((t) => (
        <button key={t} type="button" className={`chip${active?.has(t) ? " on" : ""}${onToggle ? "" : " static"}`} onClick={onToggle ? () => onToggle(t) : undefined} tabIndex={onToggle ? 0 : -1}
          title={tip ? tip(t) : onToggle ? `Tag "${t}" — click to ${active?.has(t) ? "stop filtering by it" : "show only models carrying it"}` : `Tag "${t}"`}>
          {t}
        </button>
      ))}
    </div>
  );
}

/** A label with hover help: renders a dotted-underlined span that explains itself. */
/** Normalise a homepage value into something a browser will open (adds https:// if the scheme was left off). */
export function homepageUrl(s: string | undefined): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
}

/**
 * Small "open homepage" button. Renders a new-tab link when the model has a homepage,
 * and a disabled placeholder otherwise. Clicks never bubble to the row/card behind it.
 */
export function HomeLink({ href, name, label, className }: { href: string | undefined; name?: string; label?: string; className?: string }) {
  const url = homepageUrl(href);
  const text = label ?? "↗";
  const cls = `home-link${label ? " labelled" : ""}${className ? ` ${className}` : ""}`;
  if (!url) return <span className={`${cls} off`} title="No homepage on file — edit the model to add one." aria-disabled="true">{text}</span>;
  return (
    <a className={cls} href={url} target="_blank" rel="noopener noreferrer" title={`Open homepage${name ? ` for ${name}` : ""} in a new tab\n${url}`} aria-label={`Open homepage${name ? ` for ${name}` : ""}`} onClick={(e) => e.stopPropagation()}>
      {text}
    </a>
  );
}

export function Term({ tip, children }: { tip: string; children: ReactNode }) {
  return <span className="term" title={tip}>{children}</span>;
}

/** Parse a comma / space separated tag string into a clean array. */
export function parseTags(s: string): string[] {
  return [...new Set(s.split(/[,\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export function parseList(s: string): string[] | undefined {
  const arr = s.split(",").map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}
