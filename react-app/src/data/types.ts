/** Types mirror registry/models.schema.json. Keep the two in step. */

export type ProviderKind = "openai-compatible" | "anthropic";
export type Access = "closed" | "open-weight" | "open-source";
export type Status = "current" | "preview" | "deprecated" | "local";
export type Capability = "tools" | "vision" | "json" | "reasoning" | "audio" | "embeddings";

export const ACCESS_VALUES: Access[] = ["closed", "open-weight", "open-source"];
export const STATUS_VALUES: Status[] = ["current", "preview", "deprecated", "local"];
export const CAPABILITY_VALUES: Capability[] = ["tools", "vision", "json", "reasoning", "audio", "embeddings"];

export interface Provider {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  keyEnv?: string | null;
  browser?: boolean;
  docs?: string;
  notes?: string;
}

export interface Pricing {
  input: number;
  output: number;
}

export interface Model {
  id: string;
  name: string;
  vendor: string;
  provider: string;
  modelId: string;
  modelIdVerified?: boolean;
  access: Access;
  license?: string;
  status: Status;
  released?: string;
  contextWindow?: number | null;
  pricing?: Pricing | null;
  capabilities?: Capability[];
  tags: string[];
  homepage?: string;
  notes?: string;
  /** Set on models added or edited in this browser (not in the bundled registry). */
  local?: boolean;
}

export interface GroupFilter {
  allTags?: string[];
  anyTags?: string[];
  noneTags?: string[];
  providers?: string[];
  vendors?: string[];
  access?: string[];
  status?: string[];
  capabilities?: string[];
  maxInputPrice?: number;
  minContext?: number;
  ids?: string[];
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  filter: GroupFilter;
  local?: boolean;
}

export interface Operation {
  id: string;
  name: string;
  description?: string;
  system?: string;
  prompt: string;
  local?: boolean;
}

export interface Registry {
  version: number;
  updated?: string;
  notes?: string[];
  providers: Provider[];
  models: Model[];
  groups: Group[];
  operations?: Operation[];
}

/* ---- Runs ---- */

export interface Usage {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface RunResult {
  modelId: string; // registry id
  status: "pending" | "running" | "ok" | "error";
  text: string;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
  latencyMs?: number;
  usage?: Usage;
  costUsd?: number | null;
}

export interface Run {
  id: string;
  startedAt: number;
  operationName: string;
  system: string;
  prompt: string;
  targetLabel: string;
  results: RunResult[];
}

/** Per-provider connection settings kept in this browser only. */
export interface ProviderSettings {
  apiKey?: string;
  baseUrl?: string; // override (e.g. Ollama on another machine)
}

export type Settings = Record<string, ProviderSettings>;
