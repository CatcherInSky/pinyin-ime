import { defineConfig } from "tsup";
import { copyFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const minify = {
  minifyWhitespace: true,
  minifySyntax: true,
  minifyIdentifiers: false,
} as const;

/**
 * 移除已废弃的顶层 `dict` 产物；词典子路径保留 `.d.ts` 供 `exports.types` 解析。
 */
function cleanupDistArtifacts(): void {
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
/** 供 `element.ts` 中 `process.env.NODE_ENV` 在浏览器产物里折叠为字面量。 */
const nodeEnv = JSON.stringify(process.env.NODE_ENV ?? "production");

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
    define: {
      "process.env.NODE_ENV": nodeEnv,
    },
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
    dts: true,
    sourcemap: true,
    clean: false,
    outDir: "dist",
    treeshake: true,
    splitting: false,
    define: {
      "process.env.NODE_ENV": nodeEnv,
    },
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
