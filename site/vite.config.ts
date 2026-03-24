import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

/**
 * Vite config for GitHub Pages at `/pinyinime/` (multi-page: `/react/`, `/vue/`, `/web_component/`).
 * mode=development: pinyin-ime 走本地 `../dist`（便于联调）。
 * mode=production: pinyin-ime 走 npm 依赖（site/package.json）。
 *
 * @see https://vitejs.dev/config/
 */
export default defineConfig(({ mode }) => {
  const useLocalDist = mode === "development";
  const distRoot = new URL("../dist/", import.meta.url).pathname;

  return {
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
    resolve: {
      alias: useLocalDist
        ? [
            {
              find: /^pinyin-ime$/,
              replacement: path.join(distRoot, "index.js"),
            },
            {
              find: "pinyin-ime/dict",
              replacement: path.join(distRoot, "dict.js"),
            },
            {
              find: "pinyin-ime/pinyin-ime.css",
              replacement: path.join(distRoot, "pinyin-ime.css"),
            },
          ]
        : [],
    },
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
  };
});
