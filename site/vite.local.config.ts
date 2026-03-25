import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

/**
 * Vite local-dev config for maintainers:
 * - `pinyin-ime` and dictionary subpath imports resolve to monorepo local sources.
 * - keeps the same multi-page entries/base as `vite.config.ts`.
 */
export default defineConfig(({ command }) => ({
  resolve: {
    alias: [
      {
        find: /^pinyin-ime$/,
        replacement: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../src/index.ts"
        ),
      },
      {
        find: /^pinyin-ime\/dictionary\/google_pinyin_dict$/,
        replacement: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../dictionary/google_pinyin_dict.ts"
        ),
      },
      {
        find: /^pinyin-ime\/dictionary\/dota2_pinyin_dict$/,
        replacement: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../dictionary/dota2_pinyin_dict.ts"
        ),
      },
      {
        find: "pinyin-ime/pinyin-ime.css",
        replacement: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../src/styles/pinyin-ime.css"
        ),
      },
    ],
  },
  plugins: [
    react(),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === "pinyin-ime-editor",
        },
      },
    }),
  ],
  base: command === "serve" ? "/" : "/pinyinime/",
  build: {
    rollupOptions: {
      input: {
        main: new URL("./index.html", import.meta.url).pathname,
        react: new URL("./react/index.html", import.meta.url).pathname,
        vue: new URL("./vue/index.html", import.meta.url).pathname,
        web_component: new URL("./web_component/index.html", import.meta.url)
          .pathname,
      },
    },
  },
}));
