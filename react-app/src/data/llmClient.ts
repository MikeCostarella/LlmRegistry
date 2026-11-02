/**
 * Calls one model and returns text + usage. Two wire formats cover every provider
 * in the registry: OpenAI-compatible chat completions (OpenAI, Google, xAI,
 * OpenRouter, Groq, Ollama, LM Studio) and Anthropic Messages.
 *
 * Dependency-free (fetch only) so the same file can be copied into the MCP server.
 */
import type { Model, Provider, Usage } from "./types";

export interface ChatRequest {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ChatResponse {
  text: string;
  usage: Usage;
  raw?: unknown;
}

export interface Connection {
  baseUrl: string;
  apiKey?: string;
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

function withTimeout(ms: number | undefined, outer?: AbortSignal): { signal: AbortSignal; done: () => void } {
  const ctrl = new AbortController();
  const t = ms ? setTimeout(() => ctrl.abort(new Error(`timed out after ${Math.round(ms / 1000)}s`)), ms) : undefined;
  const onOuter = () => ctrl.abort(outer?.reason ?? new Error("cancelled"));
  outer?.addEventListener("abort", onOuter, { once: true });
  return {
    signal: ctrl.signal,
    done: () => {
      if (t) clearTimeout(t);
      outer?.removeEventListener("abort", onOuter);
    },
  };
}

async function readError(res: Response): Promise<string> {
  let body = "";
  try {
    body = await res.text();
  } catch {
    /* ignore */
  }
  try {
    const j = JSON.parse(body);
    const msg = j?.error?.message ?? j?.error ?? j?.message;
    if (msg) return `${res.status} ${typeof msg === "string" ? msg : JSON.stringify(msg)}`;
  } catch {
    /* not JSON */
  }
  return `${res.status} ${res.statusText}${body ? ": " + body.slice(0, 300) : ""}`;
}

async function openaiChat(conn: Connection, model: Model, provider: Provider, req: ChatRequest): Promise<ChatResponse> {
  const messages: { role: string; content: string }[] = [];
  if (req.system) messages.push({ role: "system", content: req.system });
  messages.push({ role: "user", content: req.prompt });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (conn.apiKey) headers.Authorization = `Bearer ${conn.apiKey}`;
  if (provider.id === "openrouter") {
    headers["HTTP-Referer"] = "https://mikecostarella.github.io/LlmRegistry/";
    headers["X-Title"] = "LLM Registry";
  }

  const body: Record<string, unknown> = { model: model.modelId, messages, stream: false };
  if (req.maxTokens) body.max_tokens = req.maxTokens;
  if (req.temperature !== undefined) body.temperature = req.temperature;

  const { signal, done } = withTimeout(req.timeoutMs, req.signal);
  try {
    const res = await fetch(joinUrl(conn.baseUrl, "chat/completions"), { method: "POST", headers, body: JSON.stringify(body), signal });
    if (!res.ok) throw new Error(await readError(res));
    const j = await res.json();
    const choice = j?.choices?.[0];
    const content = choice?.message?.content;
    const text =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content.map((c: { text?: string }) => c?.text ?? "").join("")
          : (choice?.message?.reasoning ?? "");
    return {
      text: text ?? "",
      usage: { inputTokens: j?.usage?.prompt_tokens ?? null, outputTokens: j?.usage?.completion_tokens ?? null },
      raw: j,
    };
  } finally {
    done();
  }
}

async function anthropicChat(conn: Connection, model: Model, req: ChatRequest): Promise<ChatResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    // Required for calls straight from a web page; the key is the user's own, kept in their browser.
    "anthropic-dangerous-direct-browser-access": "true",
  };
  if (conn.apiKey) headers["x-api-key"] = conn.apiKey;

  const body: Record<string, unknown> = {
    model: model.modelId,
    max_tokens: req.maxTokens ?? 1024,
    messages: [{ role: "user", content: req.prompt }],
  };
  if (req.system) body.system = req.system;
  if (req.temperature !== undefined) body.temperature = req.temperature;

  const { signal, done } = withTimeout(req.timeoutMs, req.signal);
  try {
    const res = await fetch(joinUrl(conn.baseUrl, "messages"), { method: "POST", headers, body: JSON.stringify(body), signal });
    if (!res.ok) throw new Error(await readError(res));
    const j = await res.json();
    const text = (j?.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
    return {
      text,
      usage: { inputTokens: j?.usage?.input_tokens ?? null, outputTokens: j?.usage?.output_tokens ?? null },
      raw: j,
    };
  } finally {
    done();
  }
}

export async function chat(conn: Connection, model: Model, provider: Provider, req: ChatRequest): Promise<ChatResponse> {
  if (provider.kind === "anthropic") return anthropicChat(conn, model, req);
  return openaiChat(conn, model, provider, req);
}

/** USD for one call, or null when the model has no pricing or the provider returned no usage. */
export function estimateCost(model: Model, usage: Usage): number | null {
  if (!model.pricing) return null;
  if (usage.inputTokens === null && usage.outputTokens === null) return null;
  const inTok = usage.inputTokens ?? 0;
  const outTok = usage.outputTokens ?? 0;
  return (inTok * model.pricing.input + outTok * model.pricing.output) / 1_000_000;
}

/** Turn a fetch failure into something a person can act on. */
export function explainError(e: unknown, provider: Provider): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    if (provider.id === "ollama") return "Could not reach Ollama. Is it running, and does OLLAMA_ORIGINS include this site's origin?";
    if (provider.id === "lmstudio") return "Could not reach LM Studio. Is the local server on, with CORS enabled?";
    if (provider.browser === false) return `${provider.name} does not accept browser calls (CORS). Route it through OpenRouter or run the operation from the MCP server.`;
    return `Network error calling ${provider.name} (blocked by CORS, offline, or a bad base URL).`;
  }
  if (/^401|^403/.test(msg)) return `${provider.name} rejected the API key (${msg}). Check Settings.`;
  if (/^404/.test(msg)) return `${provider.name} does not know this model id (${msg}). Edit the model and fix modelId.`;
  if (/^429/.test(msg)) return `${provider.name} rate limit hit (${msg}). Try again in a moment.`;
  return msg;
}
