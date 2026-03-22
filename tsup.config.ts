import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Builds ESM bundles and `.d.ts` for npm; React entry externalizes React; Lit entry bundles `lit`.
 *
 * @returns tsup configuration (multi-build)
 */
export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist",
    external: ["react", "react-dom"],
    treeshake: true,
    async onSuccess() {
      copyFileSync(
        resolve("src/styles/pinyin-ime.css"),
        resolve("dist/pinyin-ime.css")
      );
    },
  },
  {
    entry: ["src/element.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: false,
    outDir: "dist",
    treeshake: true,
    noExternal: [/^lit(\/|$)/],
  },
]);
