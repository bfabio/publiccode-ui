import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { searchForWorkspaceRoot } from "vite";

// Git worktrees share the root checkout's node_modules, which sits
// outside vite's default fs.allow (the project root only).
const require = createRequire(import.meta.url);
const hoistedNodeModules = path.join(path.dirname(require.resolve("@astrojs/react/package.json")), "..", "..");

export default defineConfig({
  site: "https://bfabio.github.io",
  base: process.env.BASE_PATH ?? "/",
  // The incremental cache silently disables (with a WARN) at any
  // concurrency above 1.
  build: { concurrency: 1 },
  experimental: { incrementalBuild: true },
  integrations: [react()],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "it"],
  },
  vite: {
    server: {
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd()), hoistedNodeModules],
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("SearchBox") || id.includes("SoftwareList")) {
              return "catalog";
            }
          },
        },
      },
    },
  },
});
