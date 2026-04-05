import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

/**
 * Vite config for validating local `dist` artifacts before publish.
 * All `pinyin-ime` imports are resolved to monorepo `../dist`.
 */
export default defineConfig(({ mode }) => ({
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      mode === "production" ? "production" : "development"
    ),
  },
  resolve: {
    alias: [
      {
        find: /^pinyin-ime$/,
        replacement: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../dist/index.js"
        ),
      },
      {
        find: /^pinyin-ime\/dictionary\/google_pinyin_dict$/,
        replacement: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../dist/dictionary/google_pinyin_dict.js"
        ),
      },
      {
        find: /^pinyin-ime\/dictionary\/dota2_pinyin_dict$/,
        replacement: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../dist/dictionary/dota2_pinyin_dict.js"
        ),
      },
      {
        find: "pinyin-ime/pinyin-ime.css",
        replacement: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../dist/pinyin-ime.css"
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
  base: "/pinyinime/",
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
