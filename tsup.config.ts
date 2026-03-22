import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 单次构建两个 ESM 入口，并开启 `splitting`，使 `google_pinyin_dict` 等共享模块只产出一份 chunk，
 * 避免原先「两次独立 tsup」把约 5MB 词典各打一份进 `index.js` 与 `element.js`。
 *
 * - 主入口 external：`react` / `react-dom`。
 * - `element` 入口：将 `lit` 打进包（`noExternal`）。
 *
 * @returns tsup 配置
 */
export default defineConfig({
  entry: {
    index: "src/index.ts",
    element: "src/element.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  external: ["react", "react-dom"],
  treeshake: true,
  splitting: true,
  noExternal: [/^lit(\/|$)/],
  async onSuccess() {
    copyFileSync(
      resolve("src/styles/pinyin-ime.css"),
      resolve("dist/pinyin-ime.css")
    );
  },
});
