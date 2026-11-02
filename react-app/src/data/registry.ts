/**
 * The effective registry = bundled registry/models.json + this browser's additions.
 * Local models with the same id as a bundled one override it; hidden ids are dropped.
 */
import bundled from "@registry/models.json";
import type { Group, Model, Operation, Registry } from "./types";
import { KEYS, readJson, writeJson } from "./storage";

export const BUNDLED: Registry = bundled as unknown as Registry;

export function loadLocalModels(): Model[] {
  return readJson<Model[]>(KEYS.localModels, []);
}
export function saveLocalModels(models: Model[]): void {
  writeJson(KEYS.localModels, models);
}
export function loadHidden(): string[] {
  return readJson<string[]>(KEYS.hiddenModels, []);
}
export function saveHidden(ids: string[]): void {
  writeJson(KEYS.hiddenModels, ids);
}
export function loadLocalGroups(): Group[] {
  return readJson<Group[]>(KEYS.localGroups, []);
}
export function saveLocalGroups(groups: Group[]): void {
  writeJson(KEYS.localGroups, groups);
}
export function loadLocalOperations(): Operation[] {
  return readJson<Operation[]>(KEYS.localOperations, []);
}
export function saveLocalOperations(ops: Operation[]): void {
  writeJson(KEYS.localOperations, ops);
}

export function mergeModels(bundledModels: Model[], local: Model[], hidden: string[]): Model[] {
  const map = new Map<string, Model>();
  for (const m of bundledModels) map.set(m.id, { ...m, local: false });
  for (const m of local) map.set(m.id, { ...m, local: true });
  for (const id of hidden) map.delete(id);
  return [...map.values()].sort((a, b) => a.vendor.localeCompare(b.vendor) || a.name.localeCompare(b.name));
}

export function mergeGroups(bundledGroups: Group[], local: Group[]): Group[] {
  const map = new Map<string, Group>();
  for (const g of bundledGroups) map.set(g.id, { ...g, local: false });
  for (const g of local) map.set(g.id, { ...g, local: true });
  return [...map.values()];
}

export function mergeOperations(bundledOps: Operation[], local: Operation[]): Operation[] {
  const map = new Map<string, Operation>();
  for (const o of bundledOps) map.set(o.id, { ...o, local: false });
  for (const o of local) map.set(o.id, { ...o, local: true });
  return [...map.values()];
}

/** Every tag in use, most common first. */
export function allTags(models: Model[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of models) for (const t of m.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strip app-only fields so an export matches the registry schema. */
export function toRegistryJson(models: Model[], groups: Group[], operations: Operation[]): Registry {
  const clean = <T extends { local?: boolean }>(x: T): Omit<T, "local"> => {
    const { local: _l, ...rest } = x;
    return rest;
  };
  return {
    version: BUNDLED.version,
    updated: new Date().toISOString().slice(0, 10),
    notes: BUNDLED.notes,
    providers: BUNDLED.providers,
    models: models.map(clean) as Model[],
    groups: groups.map(clean) as Group[],
    operations: operations.map(clean) as Operation[],
  };
}
