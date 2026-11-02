// Validation shared by scripts/check-registry.mjs (CI) and plugins/registry-writer.ts (dev server).
// Returns a list of problems; empty means the registry is good to write / build.

export const FILTER_CLAUSES = ["allTags", "anyTags", "noneTags", "providers", "vendors", "access", "status", "capabilities", "maxInputPrice", "minContext", "ids"];
const ACCESS = ["closed", "open-weight", "open-source"];
const STATUS = ["current", "preview", "deprecated", "local"];

export function validateRegistry(reg) {
  const problems = [];
  if (!reg || typeof reg !== "object") return ["registry is not an object"];
  for (const k of ["providers", "models", "groups"]) if (!Array.isArray(reg[k])) problems.push(`"${k}" must be an array`);
  if (problems.length) return problems;

  const providerIds = new Set(reg.providers.map((p) => p.id));
  const seen = new Set();
  for (const m of reg.models) {
    if (!m.id) { problems.push("a model has no id"); continue; }
    if (seen.has(m.id)) problems.push(`duplicate model id ${m.id}`);
    seen.add(m.id);
    if (!m.name) problems.push(`${m.id}: name is required`);
    if (!m.modelId) problems.push(`${m.id}: modelId is required`);
    if (!providerIds.has(m.provider)) problems.push(`${m.id}: unknown provider ${m.provider}`);
    if (!Array.isArray(m.tags)) problems.push(`${m.id}: tags must be an array`);
    if (!ACCESS.includes(m.access)) problems.push(`${m.id}: bad access ${m.access}`);
    if (!STATUS.includes(m.status)) problems.push(`${m.id}: bad status ${m.status}`);
    if (m.pricing !== null && m.pricing !== undefined && (typeof m.pricing.input !== "number" || typeof m.pricing.output !== "number")) problems.push(`${m.id}: pricing needs numeric input and output`);
  }

  const gids = new Set();
  for (const g of reg.groups) {
    if (!g.id) { problems.push("a group has no id"); continue; }
    if (gids.has(g.id)) problems.push(`duplicate group id ${g.id}`);
    gids.add(g.id);
    if (!g.filter || typeof g.filter !== "object") { problems.push(`group ${g.id}: filter is required`); continue; }
    for (const k of Object.keys(g.filter)) if (!FILTER_CLAUSES.includes(k)) problems.push(`group ${g.id}: unknown filter clause ${k}`);
  }

  const oids = new Set();
  for (const o of reg.operations ?? []) {
    if (!o.id) { problems.push("an operation has no id"); continue; }
    if (oids.has(o.id)) problems.push(`duplicate operation id ${o.id}`);
    oids.add(o.id);
    if (!o.prompt) problems.push(`operation ${o.id}: empty prompt`);
  }
  return problems;
}
