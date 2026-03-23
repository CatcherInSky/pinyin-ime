import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

/**
 * Vite config for GitHub Pages at `/pinyin-ime/` (multi-page: `/react/`, `/vue/`, `/web_component/`).
 * Dev (`vite serve`) resolves `pinyin-ime` from the local monorepo source,
 * while build (`vite build`) resolves `pinyin-ime` from npm dependency.
 *
 * @see https://vitejs.dev/config/
 */
export default defineConfig(({ command }) => {
  const isDev = command === "serve";
  const localRoot = path.resolve(__dirname, "..");

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
    resolve: isDev
      ? {
          alias: [
            {
              find: "pinyin-ime/pinyin-ime.css",
              replacement: path.resolve(localRoot, "src/styles/pinyin-ime.css"),
            },
            {
              find: "pinyin-ime/google-pinyin-dict.json",
              replacement: path.resolve(localRoot, "dist/google-pinyin-dict.json"),
            },
            {
              find: /^pinyin-ime$/,
              replacement: path.resolve(localRoot, "src/index.ts"),
            },
          ],
        }
      : undefined,
    base: "/pinyinime/",
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          react: path.resolve(__dirname, "react/index.html"),
          vue: path.resolve(__dirname, "vue/index.html"),
          web_component: path.resolve(__dirname, "web_component/index.html"),
        },
      },
    },
  };
});
