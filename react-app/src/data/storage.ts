/**
 * localStorage helpers. Everything the user adds in the app — custom models,
 * groups, operations, API keys, run history — lives here, in this browser only.
 * Every access is wrapped: private windows and blocked storage must not crash the app.
 */

const PREFIX = "llm-registry:";

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const KEYS = {
  localModels: "models",
  hiddenModels: "models.hidden",
  localGroups: "groups",
  localOperations: "operations",
  settings: "settings",
  runs: "runs",
  helpSeen: "help.seen",
} as const;
