import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

/**
 * Vite config for GitHub Pages at `/pinyin-ime/`.
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
  resolve: {
    alias: {
      "pinyin-ime": path.resolve(__dirname, "..", "dist"),
    },
  },
});
