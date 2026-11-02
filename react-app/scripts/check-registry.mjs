#!/usr/bin/env node
// Sanity-check registry/models.json before a build. Fails the CI build on any problem.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateRegistry } from "./registry-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const path = resolve(here, "../../registry/models.json");
const reg = JSON.parse(readFileSync(path, "utf8"));
const problems = validateRegistry(reg);

if (problems.length) {
  console.error(`registry/models.json: ${problems.length} problem(s)`);
  for (const p of problems) console.error(" - " + p);
  process.exit(1);
}
console.log(`registry OK: ${reg.providers.length} providers, ${reg.models.length} models, ${reg.groups.length} groups, ${(reg.operations ?? []).length} operations`);
