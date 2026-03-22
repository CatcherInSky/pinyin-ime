import { defineConfig } from "tsup";

/**
 * Builds ESM bundle and `.d.ts` for npm; React is external.
 *
 * @returns tsup configuration
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
});
