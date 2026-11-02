/**
 * Fan an operation out across a set of models, in parallel, and report each
 * result as it lands. Runs are kept in localStorage (last RUN_HISTORY entries).
 */
import { chat, estimateCost, explainError } from "./llmClient";
import type { Model, Provider, Run, RunResult, Settings } from "./types";
import { KEYS, readJson, writeJson } from "./storage";

export const RUN_HISTORY = 30;
const DEFAULT_TIMEOUT_MS = 120_000;

export function connectionFor(provider: Provider, settings: Settings): { baseUrl: string; apiKey?: string } {
  const s = settings[provider.id] ?? {};
  return { baseUrl: s.baseUrl?.trim() || provider.baseUrl, apiKey: s.apiKey?.trim() || undefined };
}

export function missingKey(provider: Provider, settings: Settings): boolean {
  return !!provider.keyEnv && !connectionFor(provider, settings).apiKey;
}

export interface RunInput {
  operationName: string;
  system: string;
  prompt: string;
  targetLabel: string;
  models: Model[];
  providers: Provider[];
  settings: Settings;
  maxTokens?: number;
  temperature?: number;
  concurrency?: number;
  signal?: AbortSignal;
}

export function newRun(input: RunInput): Run {
  return {
    id: `run-${Date.now().toString(36)}`,
    startedAt: Date.now(),
    operationName: input.operationName,
    system: input.system,
    prompt: input.prompt,
    targetLabel: input.targetLabel,
    results: input.models.map((m) => ({ modelId: m.id, status: "pending", text: "" })),
  };
}

/**
 * Executes the run, calling onUpdate with a fresh copy of the run each time a
 * result changes. Resolves to the final run. Never throws for a single model's
 * failure — that becomes an "error" result.
 */
export async function executeRun(run: Run, input: RunInput, onUpdate: (r: Run) => void): Promise<Run> {
  const providerById = new Map(input.providers.map((p) => [p.id, p]));
  const limit = Math.max(1, input.concurrency ?? 8);
  let current: Run = run;

  const patch = (idx: number, p: Partial<RunResult>) => {
    const results = current.results.map((r, i) => (i === idx ? { ...r, ...p } : r));
    current = { ...current, results };
    onUpdate(current);
  };

  const queue = input.models.map((m, i) => ({ m, i }));
  const worker = async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      const { m, i } = next;
      const provider = providerById.get(m.provider);
      const started = Date.now();
      patch(i, { status: "running", startedAt: started });
      if (!provider) {
        patch(i, { status: "error", error: `Unknown provider "${m.provider}"`, finishedAt: Date.now(), latencyMs: 0 });
        continue;
      }
      if (missingKey(provider, input.settings)) {
        patch(i, { status: "error", error: `No API key for ${provider.name} — add one in Settings.`, finishedAt: Date.now(), latencyMs: 0 });
        continue;
      }
      try {
        const res = await chat(connectionFor(provider, input.settings), m, provider, {
          system: input.system || undefined,
          prompt: input.prompt,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
          timeoutMs: DEFAULT_TIMEOUT_MS,
          signal: input.signal,
        });
        const finished = Date.now();
        patch(i, {
          status: "ok",
          text: res.text,
          usage: res.usage,
          costUsd: estimateCost(m, res.usage),
          finishedAt: finished,
          latencyMs: finished - started,
        });
      } catch (e) {
        const finished = Date.now();
        patch(i, { status: "error", error: explainError(e, provider), finishedAt: finished, latencyMs: finished - started });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker));
  return current;
}

export function loadRuns(): Run[] {
  return readJson<Run[]>(KEYS.runs, []);
}

export function saveRun(run: Run): Run[] {
  const runs = [run, ...loadRuns().filter((r) => r.id !== run.id)].slice(0, RUN_HISTORY);
  // Trim stored output so history can't blow past the storage quota.
  const trimmed = runs.map((r) => ({ ...r, results: r.results.map((x) => ({ ...x, text: x.text.slice(0, 20_000) })) }));
  writeJson(KEYS.runs, trimmed);
  return trimmed;
}

export function deleteRun(id: string): Run[] {
  const runs = loadRuns().filter((r) => r.id !== id);
  writeJson(KEYS.runs, runs);
  return runs;
}

export function clearRuns(): void {
  writeJson(KEYS.runs, []);
}
