/**
 * Dev-server-only plugin: lets the app read and WRITE registry/models.json on
 * disk, so edits made in the UI during `npm run dev` land in the repo file (and
 * show up as a diff to commit) instead of in browser local storage.
 *
 *   GET  /__registry   → { writable: true, file, registry }
 *   PUT  /__registry   → validates the body, writes it atomically, echoes it back
 *
 * Never part of the production build (apply: "serve"); on GitHub Pages the
 * route does not exist and the app falls back to local storage.
 * When the file changes on disk (editor, git), clients get a "registry-changed"
 * HMR event and re-fetch, instead of Vite's default full page reload.
 */
import type { Plugin } from "vite";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { validateRegistry } from "../scripts/registry-lib.mjs";

export const REGISTRY_ROUTE = "/__registry";

export function registryWriter(file: string): Plugin {
  const normFile = file.replace(/\\/g, "/");
  return {
    name: "llm-registry-writer",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(REGISTRY_ROUTE, (req, res) => {
        const ip = req.socket.remoteAddress ?? "";
        if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ip)) {
          res.statusCode = 403;
          return res.end("registry writer is localhost-only");
        }
        res.setHeader("Content-Type", "application/json");
        if (req.method === "GET") {
          try {
            return res.end(JSON.stringify({ writable: true, file, registry: JSON.parse(readFileSync(file, "utf8")) }));
          } catch (e) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: String(e) }));
          }
        }
        if (req.method !== "PUT") {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: "GET or PUT" }));
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          let reg: unknown;
          try {
            reg = JSON.parse(body);
          } catch {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "body is not JSON" }));
          }
          const problems = validateRegistry(reg);
          if (problems.length) {
            res.statusCode = 422;
            return res.end(JSON.stringify({ error: "registry failed validation", problems }));
          }
          try {
            const tmp = file + ".tmp";
            writeFileSync(tmp, JSON.stringify(reg, null, 2) + "\n");
            renameSync(tmp, file);
            server.config.logger.info(`[registry] wrote ${file}`);
            return res.end(JSON.stringify({ ok: true, file, registry: reg }));
          } catch (e) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: String(e) }));
          }
        });
      });
    },
    handleHotUpdate(ctx) {
      if (ctx.file.replace(/\\/g, "/") !== normFile) return;
      ctx.server.ws.send({ type: "custom", event: "registry-changed" });
      return []; // swallow the default full reload; the app re-fetches instead
    },
  };
}
