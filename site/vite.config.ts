import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

/**
 * Vite config for GitHub Pages at `/pinyinime/` (multi-page: `/react/`, `/vue/`, `/web_component/`).
 * mode=development: pinyin-ime 直连本地 `../src`（支持源码级 HMR）。
 * mode=production: pinyin-ime 走 npm 依赖（site/package.json）。
 *
 * @see https://vitejs.dev/config/
 */
export default defineConfig(({ mode }) => {
  const useLocalSrc = mode === "development";
  const configDir = path.dirname(fileURLToPath(import.meta.url));
  const srcRoot = path.resolve(configDir, "../src");

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
      alias: useLocalSrc
        ? [
            {
              find: /^pinyin-ime$/,
              replacement: path.join(srcRoot, "index.ts"),
            },
            {
              find: "pinyin-ime/dict",
              replacement: path.join(srcRoot, "dict.ts"),
            },
            {
              find: "pinyin-ime/pinyin-ime.css",
              replacement: path.join(srcRoot, "styles", "pinyin-ime.css"),
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
