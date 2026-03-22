import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

/**
 * Vite config for GitHub Pages at `/pinyin-ime/` (multi-page: `/react/`, `/vue/`, `/web_component/`).
 * `pinyin-ime` resolves from the npm registry (see `site/package.json`), not the monorepo `dist/`.
 *
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
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
  base: "/pinyin-ime/",
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
});
