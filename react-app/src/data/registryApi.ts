/**
 * Talks to the dev server's registry-writer plugin (plugins/registry-writer.ts).
 * Only ever tried in `npm run dev`; on GitHub Pages the app never calls this.
 */
import type { Registry } from "./types";

const ROUTE = "/__registry";

export interface WriterInfo {
  file: string;
  registry: Registry;
}

/** Returns the on-disk registry if the dev server can write it, else null. */
export async function probeWriter(): Promise<WriterInfo | null> {
  if (!import.meta.env.DEV) return null;
  try {
    const res = await fetch(ROUTE, { method: "GET" });
    if (!res.ok) return null;
    const j = (await res.json()) as { writable?: boolean; file?: string; registry?: Registry };
    return j.writable && j.registry && j.file ? { file: j.file, registry: j.registry } : null;
  } catch {
    return null;
  }
}

/** Writes the whole registry; resolves to the registry as written. Throws with validation problems. */
export async function writeRegistry(reg: Registry): Promise<Registry> {
  const res = await fetch(ROUTE, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reg) });
  const j = (await res.json().catch(() => ({}))) as { ok?: boolean; registry?: Registry; error?: string; problems?: string[] };
  if (!res.ok || !j.registry) throw new Error([j.error ?? `HTTP ${res.status}`, ...(j.problems ?? [])].join("\n"));
  return j.registry;
}

/** Subscribe to "the file changed on disk" (editor, git checkout); returns an unsubscribe. */
export function onRegistryChanged(cb: () => void): () => void {
  if (!import.meta.hot) return () => {};
  import.meta.hot.on("registry-changed", cb);
  return () => import.meta.hot?.off("registry-changed", cb);
}
