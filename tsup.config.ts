import { defineConfig } from "tsup";
import { copyFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

const minify = {
  minifyWhitespace: true,
  minifySyntax: true,
  minifyIdentifiers: false,
} as const;

/**
 * 删除词典子目录中的 `.d.ts`（仅保留压缩后的 `js` / `js.map`），并移除已废弃的 `dict` 产物。
 */
function cleanupDistArtifacts(): void {
  const dictDir = resolve("dist/dictionary");
  try {
    for (const name of readdirSync(dictDir)) {
      if (name.endsWith(".d.ts")) {
        unlinkSync(join(dictDir, name));
      }
    }
  } catch {
    // 目录可能尚不存在
  }
  for (const name of ["dict.js", "dict.js.map", "dict.d.ts"]) {
    try {
      unlinkSync(resolve("dist", name));
    } catch {
      // 忽略
    }
  }
}

/**
 * 两阶段构建：`index` 通过运行时 `import(url)` 引用词典，不内嵌词典；`dictionary/*` 仅产出 ESM + sourcemap。
 *
 * @returns tsup 配置数组
 */
export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist",
    treeshake: true,
    splitting: false,
    ...minify,
    noExternal: [/^lit(\/|$)/],
    external: [
      "pinyin-ime/dictionary/google_pinyin_dict",
      "pinyin-ime/dictionary/dota2_pinyin_dict",
    ],
  },
  {
    entry: {
      "dictionary/google_pinyin_dict": "dictionary/google_pinyin_dict.ts",
      "dictionary/dota2_pinyin_dict": "dictionary/dota2_pinyin_dict.ts",
    },
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    outDir: "dist",
    treeshake: true,
    splitting: false,
    ...minify,
    noExternal: [/^lit(\/|$)/],
    external: ["./google_pinyin_dict"],
    async onSuccess() {
      cleanupDistArtifacts();
      copyFileSync(
        resolve("src/styles/pinyin-ime.css"),
        resolve("dist/pinyin-ime.css")
      );
    },
  },
]);
