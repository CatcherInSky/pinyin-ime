import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

/**
 * Vite config for GitHub Pages at `/pinyinime/` (multi-page: `/react/`, `/vue/`, `/web_component/`).
 * @see https://vitejs.dev/config/
 */
export default defineConfig(({ mode }) => ({
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      mode === "production" ? "production" : "development"
    ),
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
