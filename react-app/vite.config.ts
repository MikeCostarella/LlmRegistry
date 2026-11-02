import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { registryWriter } from "./plugins/registry-writer";

// GitHub Pages project site: base MUST equal "/<RepoName>/".
const BASE = "/LlmRegistry/";

const here = dirname(fileURLToPath(import.meta.url));
// The registry lives at the repo root (shared with the llm-registry MCP server) and is bundled at build time.
// In `npm run dev` the registry-writer plugin also lets the app write it back (see plugins/registry-writer.ts).
const REGISTRY_DIR = resolve(here, "../registry");
const REGISTRY_FILE = resolve(REGISTRY_DIR, "models.json");

export default defineConfig({
  base: BASE,
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: { "@registry": REGISTRY_DIR },
  },
  server: {
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), REGISTRY_DIR] },
  },
  plugins: [
    registryWriter(REGISTRY_FILE),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "LLM Registry",
        short_name: "LLM Registry",
        description: "A registry of large language models — hosted and local — with tag-based groups and operations you can fan out across any of them.",
        theme_color: "#1a2a3a",
        background_color: "#1a2a3a",
        display: "standalone",
        orientation: "any",
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,json}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
