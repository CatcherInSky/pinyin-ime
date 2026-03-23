import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 构建单一 ESM 入口（`index`）；Web Component 由 `index` 统一导出。
 *
 * @returns tsup 配置
 */
export default defineConfig({
  entry: {
    index: "src/index.ts",
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
