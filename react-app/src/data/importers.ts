/**
 * Pull real model ids into the registry from live catalogs:
 *  - Ollama      GET {base}/api/tags             (what's pulled on this machine)
 *  - OpenRouter  GET {base}/models  (public, no key; ids, context, pricing, modalities)
 */
import type { Model, Provider } from "./types";
import { slugify } from "./registry";

export interface ImportCandidate {
  model: Model;
  existing: boolean;
}

export async function importFromOllama(provider: Provider, baseUrl: string, existing: Model[]): Promise<ImportCandidate[]> {
  // baseUrl is the OpenAI-compatible root (…/v1); the native API sits beside it.
  const root = baseUrl.replace(/\/v1\/?$/, "");
  const res = await fetch(root + "/api/tags");
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const j = (await res.json()) as { models?: { name: string; details?: { family?: string; parameter_size?: string; quantization_level?: string }; size?: number }[] };
  const have = new Set(existing.filter((m) => m.provider === provider.id).map((m) => m.modelId));
  return (j.models ?? []).map((t) => {
    const family = t.details?.family ?? "";
    const size = t.details?.parameter_size ?? "";
    const model: Model = {
      id: `local/${slugify(t.name)}`,
      name: `${t.name}${size ? ` (${size})` : ""}`,
      vendor: vendorForFamily(family, t.name),
      provider: provider.id,
      modelId: t.name,
      modelIdVerified: true,
      access: "open-weight",
      status: "local",
      contextWindow: null,
      pricing: { input: 0, output: 0 },
      capabilities: [],
      tags: ["local", "open-weight", "self-hostable", ...(family ? [family.toLowerCase()] : [])],
      notes: [t.details?.quantization_level ? `Quantization ${t.details.quantization_level}` : "", t.size ? `${(t.size / 1e9).toFixed(1)} GB on disk` : ""].filter(Boolean).join(" · ") || undefined,
    };
    return { model, existing: have.has(t.name) };
  });
}

function vendorForFamily(family: string, name: string): string {
  const f = (family + " " + name).toLowerCase();
  if (f.includes("llama") || f.includes("muse")) return "Meta";
  if (f.includes("gemma")) return "Google DeepMind";
  if (f.includes("qwen")) return "Alibaba Cloud";
  if (f.includes("deepseek")) return "DeepSeek";
  if (f.includes("mistral") || f.includes("mixtral")) return "Mistral AI";
  if (f.includes("phi")) return "Microsoft";
  if (f.includes("glm")) return "Zhipu AI";
  if (f.includes("kimi")) return "Moonshot AI";
  if (f.includes("gpt-oss")) return "OpenAI";
  if (f.includes("nemotron")) return "NVIDIA";
  return family || "Unknown";
}

interface OpenRouterModel {
  id: string;
  name: string;
  created?: number;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] };
  supported_parameters?: string[];
  top_provider?: { context_length?: number };
}

export async function fetchOpenRouterCatalog(baseUrl: string): Promise<OpenRouterModel[]> {
  const res = await fetch(baseUrl.replace(/\/+$/, "") + "/models");
  if (!res.ok) throw new Error(`OpenRouter returned ${res.status}`);
  const j = (await res.json()) as { data?: OpenRouterModel[] };
  return j.data ?? [];
}

/** Map one OpenRouter catalog row onto a registry model. Prices arrive per token as strings. */
export function openRouterToModel(provider: Provider, r: OpenRouterModel, existing: Model[]): ImportCandidate {
  const [vendorSlug] = r.id.split("/");
  const perTok = (s?: string) => (s === undefined ? null : Number(s));
  const pin = perTok(r.pricing?.prompt);
  const pout = perTok(r.pricing?.completion);
  const pricing = pin === null || pout === null || Number.isNaN(pin) || Number.isNaN(pout) ? null : { input: round(pin * 1e6), output: round(pout * 1e6) };
  const caps: Model["capabilities"] = [];
  if (r.supported_parameters?.includes("tools")) caps.push("tools");
  if (r.architecture?.input_modalities?.includes("image")) caps.push("vision");
  if (r.supported_parameters?.includes("response_format") || r.supported_parameters?.includes("structured_outputs")) caps.push("json");
  if (r.supported_parameters?.includes("reasoning") || r.supported_parameters?.includes("include_reasoning")) caps.push("reasoning");
  const free = r.id.endsWith(":free") || (pricing && pricing.input === 0 && pricing.output === 0);
  const vendor = VENDOR_NAMES[vendorSlug] ?? vendorSlug;
  const have = new Set(existing.filter((m) => m.provider === provider.id).map((m) => m.modelId));
  const model: Model = {
    id: `${vendorSlug}/${slugify(r.id.split("/").slice(1).join("/"))}`,
    name: r.name.replace(/^[^:]+:\s*/, ""),
    vendor,
    provider: provider.id,
    modelId: r.id,
    modelIdVerified: true,
    access: OPEN_VENDORS.has(vendorSlug) ? "open-weight" : "closed",
    status: "current",
    released: r.created ? new Date(r.created * 1000).toISOString().slice(0, 10) : undefined,
    contextWindow: r.context_length ?? r.top_provider?.context_length ?? null,
    pricing,
    capabilities: caps,
    tags: ["openrouter", vendorSlug, ...(free ? ["free"] : []), ...(pricing && pricing.input <= 1 ? ["cheap"] : [])],
    homepage: `https://openrouter.ai/${r.id}`,
  };
  return { model, existing: have.has(r.id) };
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

const VENDOR_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google DeepMind",
  "x-ai": "xAI (SpaceXAI)",
  "meta-llama": "Meta",
  mistralai: "Mistral AI",
  deepseek: "DeepSeek",
  qwen: "Alibaba Cloud",
  moonshotai: "Moonshot AI",
  "z-ai": "Zhipu AI",
  minimax: "MiniMax",
  nvidia: "NVIDIA",
  microsoft: "Microsoft",
  cohere: "Cohere",
  perplexity: "Perplexity",
  amazon: "Amazon",
  xiaomi: "Xiaomi",
};

const OPEN_VENDORS = new Set(["meta-llama", "mistralai", "deepseek", "qwen", "moonshotai", "z-ai", "minimax", "nvidia", "microsoft", "xiaomi", "nousresearch", "thudm", "01-ai", "allenai"]);
