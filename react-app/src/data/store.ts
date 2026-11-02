/**
 * One hook that owns the editable registry and decides where edits go:
 *
 *   mode "file"    — `npm run dev` with the registry-writer plugin: the on-disk
 *                    registry/models.json is the source of truth; every save
 *                    rewrites it (and git shows the diff). Browser overrides are ignored.
 *   mode "browser" — GitHub Pages (or the plugin unreachable): the bundled
 *                    registry plus this browser's local-storage overrides.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Group, Model, Operation, Registry } from "./types";
import {
  BUNDLED,
  loadHidden, loadLocalGroups, loadLocalModels, loadLocalOperations,
  mergeGroups, mergeModels, mergeOperations,
  saveHidden, saveLocalGroups, saveLocalModels, saveLocalOperations,
} from "./registry";
import { onRegistryChanged, probeWriter, writeRegistry } from "./registryApi";

export type StoreMode = "probing" | "file" | "browser";

export interface RegistryStore {
  mode: StoreMode;
  file: string | null;
  models: Model[];
  groups: Group[];
  operations: Operation[];
  localEdits: number;
  lastError: string | null;
  clearError: () => void;
  saveModel: (m: Model) => void;
  removeModel: (id: string) => void;
  importModels: (list: Model[]) => void;
  saveGroup: (g: Group) => void;
  removeGroup: (id: string) => void;
  saveOperation: (o: Operation) => void;
  removeOperation: (id: string) => void;
  resetLocal: () => void;
}

const byVendorName = (a: Model, b: Model) => a.vendor.localeCompare(b.vendor) || a.name.localeCompare(b.name);
const strip = <T extends { local?: boolean }>(x: T): T => { const { local: _l, ...rest } = x; return rest as T; };

export function useRegistryStore(): RegistryStore {
  const [mode, setMode] = useState<StoreMode>("probing");
  const [file, setFile] = useState<string | null>(null);
  const [fileReg, setFileReg] = useState<Registry | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Browser-mode layers
  const [localModels, setLocalModels] = useState<Model[]>(loadLocalModels);
  const [hidden, setHidden] = useState<string[]>(loadHidden);
  const [localGroups, setLocalGroups] = useState<Group[]>(loadLocalGroups);
  const [localOps, setLocalOps] = useState<Operation[]>(loadLocalOperations);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const info = await probeWriter();
      if (!alive) return;
      if (info) { setFile(info.file); setFileReg(info.registry); setMode("file"); }
      else setMode("browser");
    };
    void load();
    const off = onRegistryChanged(() => { void load(); });
    return () => { alive = false; off(); };
  }, []);

  const models = useMemo<Model[]>(
    () => (fileReg ? [...fileReg.models].map((m) => ({ ...m, local: false })).sort(byVendorName) : mergeModels(BUNDLED.models, localModels, hidden)),
    [fileReg, localModels, hidden],
  );
  const groups = useMemo<Group[]>(() => (fileReg ? fileReg.groups.map((g) => ({ ...g, local: false })) : mergeGroups(BUNDLED.groups, localGroups)), [fileReg, localGroups]);
  const operations = useMemo<Operation[]>(() => (fileReg ? (fileReg.operations ?? []).map((o) => ({ ...o, local: false })) : mergeOperations(BUNDLED.operations ?? [], localOps)), [fileReg, localOps]);

  /** File mode: apply a change to a copy of the registry, write it, adopt what came back. */
  const commit = useCallback((change: (r: Registry) => Registry) => {
    setFileReg((prev) => {
      if (!prev) return prev;
      const next = change(prev);
      writeRegistry(next)
        .then((written) => { setFileReg(written); setLastError(null); })
        .catch((e) => { setLastError(`Could not write ${file ?? "the registry file"}:\n${e instanceof Error ? e.message : String(e)}`); setFileReg(prev); });
      return next; // optimistic
    });
  }, [file]);

  const saveModel = useCallback((m: Model) => {
    const clean = strip(m);
    if (fileReg) return commit((r) => ({ ...r, models: [...r.models.filter((x) => x.id !== clean.id), clean] }));
    setLocalModels((prev) => { const next = [...prev.filter((x) => x.id !== clean.id), clean]; saveLocalModels(next); return next; });
    setHidden((prev) => { if (!prev.includes(clean.id)) return prev; const next = prev.filter((x) => x !== clean.id); saveHidden(next); return next; });
  }, [fileReg, commit]);

  const removeModel = useCallback((id: string) => {
    if (fileReg) return commit((r) => ({ ...r, models: r.models.filter((x) => x.id !== id) }));
    setLocalModels((prev) => { const next = prev.filter((x) => x.id !== id); saveLocalModels(next); return next; });
    if (BUNDLED.models.some((m) => m.id === id)) setHidden((prev) => { const next = [...new Set([...prev, id])]; saveHidden(next); return next; });
  }, [fileReg, commit]);

  const importModels = useCallback((list: Model[]) => {
    const clean = list.map(strip);
    const ids = new Set(clean.map((m) => m.id));
    if (fileReg) return commit((r) => ({ ...r, models: [...r.models.filter((x) => !ids.has(x.id)), ...clean] }));
    setLocalModels((prev) => { const next = [...prev.filter((x) => !ids.has(x.id)), ...clean]; saveLocalModels(next); return next; });
    setHidden((prev) => { const next = prev.filter((x) => !ids.has(x)); saveHidden(next); return next; });
  }, [fileReg, commit]);

  const saveGroup = useCallback((g: Group) => {
    const clean = strip(g);
    if (fileReg) return commit((r) => ({ ...r, groups: [...r.groups.filter((x) => x.id !== clean.id), clean] }));
    setLocalGroups((prev) => { const next = [...prev.filter((x) => x.id !== clean.id), clean]; saveLocalGroups(next); return next; });
  }, [fileReg, commit]);

  const removeGroup = useCallback((id: string) => {
    if (fileReg) return commit((r) => ({ ...r, groups: r.groups.filter((x) => x.id !== id) }));
    setLocalGroups((prev) => { const next = prev.filter((x) => x.id !== id); saveLocalGroups(next); return next; });
  }, [fileReg, commit]);

  const saveOperation = useCallback((o: Operation) => {
    const clean = strip(o);
    if (fileReg) return commit((r) => ({ ...r, operations: [...(r.operations ?? []).filter((x) => x.id !== clean.id), clean] }));
    setLocalOps((prev) => { const next = [...prev.filter((x) => x.id !== clean.id), clean]; saveLocalOperations(next); return next; });
  }, [fileReg, commit]);

  const removeOperation = useCallback((id: string) => {
    if (fileReg) return commit((r) => ({ ...r, operations: (r.operations ?? []).filter((x) => x.id !== id) }));
    setLocalOps((prev) => { const next = prev.filter((x) => x.id !== id); saveLocalOperations(next); return next; });
  }, [fileReg, commit]);

  const resetLocal = useCallback(() => {
    setLocalModels([]); saveLocalModels([]);
    setHidden([]); saveHidden([]);
    setLocalGroups([]); saveLocalGroups([]);
    setLocalOps([]); saveLocalOperations([]);
  }, []);

  return {
    mode,
    file,
    models,
    groups,
    operations,
    localEdits: fileReg ? 0 : localModels.length + localGroups.length + localOps.length + hidden.length,
    lastError,
    clearError: () => setLastError(null),
    saveModel,
    removeModel,
    importModels,
    saveGroup,
    removeGroup,
    saveOperation,
    removeOperation,
    resetLocal,
  };
}
