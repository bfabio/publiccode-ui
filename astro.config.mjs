import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://bfabio.github.io",
  base: process.env.BASE_PATH ?? "/",
  integrations: [react()],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "it"],
  },
  vite: {
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
