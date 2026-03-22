import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite config for GitHub Pages at `/pinyin-ime/`.
 *
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  plugins: [react()],
  base: "/pinyin-ime/",
  resolve: {
    alias: {
      "pinyin-ime": path.resolve(__dirname, "..", "dist"),
    },
  },
});
