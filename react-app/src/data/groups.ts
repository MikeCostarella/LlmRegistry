/**
 * Group filters are tag queries evaluated live against the model list.
 * All present clauses AND together; within a list clause, values OR.
 * This logic is duplicated in the llm-registry MCP server — keep them identical.
 */
import type { GroupFilter, Model } from "./types";

export function matchesFilter(m: Model, f: GroupFilter): boolean {
  if (f.ids && f.ids.length && !f.ids.includes(m.id)) return false;
  if (f.allTags && !f.allTags.every((t) => m.tags.includes(t))) return false;
  if (f.anyTags && f.anyTags.length && !f.anyTags.some((t) => m.tags.includes(t))) return false;
  if (f.noneTags && f.noneTags.some((t) => m.tags.includes(t))) return false;
  if (f.providers && f.providers.length && !f.providers.includes(m.provider)) return false;
  if (f.vendors && f.vendors.length && !f.vendors.includes(m.vendor)) return false;
  if (f.access && f.access.length && !f.access.includes(m.access)) return false;
  if (f.status && f.status.length && !f.status.includes(m.status)) return false;
  if (f.capabilities && f.capabilities.length && !f.capabilities.every((c) => (m.capabilities ?? []).includes(c as never))) return false;
  if (f.maxInputPrice !== undefined) {
    if (!m.pricing) return false;
    if (m.pricing.input > f.maxInputPrice) return false;
  }
  if (f.minContext !== undefined) {
    if (!m.contextWindow || m.contextWindow < f.minContext) return false;
  }
  return true;
}

export function resolveGroup(models: Model[], f: GroupFilter): Model[] {
  return models.filter((m) => matchesFilter(m, f));
}

/** Human-readable one-liner for a filter, e.g. "access: closed · tags: frontier". */
export function describeFilter(f: GroupFilter): string {
  const parts: string[] = [];
  if (f.ids?.length) parts.push(`ids: ${f.ids.length}`);
  if (f.allTags?.length) parts.push(`all of: ${f.allTags.join(", ")}`);
  if (f.anyTags?.length) parts.push(`any of: ${f.anyTags.join(", ")}`);
  if (f.noneTags?.length) parts.push(`none of: ${f.noneTags.join(", ")}`);
  if (f.providers?.length) parts.push(`provider: ${f.providers.join(", ")}`);
  if (f.vendors?.length) parts.push(`vendor: ${f.vendors.join(", ")}`);
  if (f.access?.length) parts.push(`access: ${f.access.join(", ")}`);
  if (f.status?.length) parts.push(`status: ${f.status.join(", ")}`);
  if (f.capabilities?.length) parts.push(`can: ${f.capabilities.join(", ")}`);
  if (f.maxInputPrice !== undefined) parts.push(`≤ $${f.maxInputPrice}/1M in`);
  if (f.minContext !== undefined) parts.push(`context ≥ ${f.minContext.toLocaleString()}`);
  return parts.length ? parts.join(" · ") : "every model";
}

export function emptyFilter(f: GroupFilter): boolean {
  return Object.values(f).every((v) => v === undefined || (Array.isArray(v) && v.length === 0));
}
