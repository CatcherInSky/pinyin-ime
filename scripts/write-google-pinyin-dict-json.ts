import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { dict } from "../dictionary/google_pinyin_dict";

/**
 * 将内嵌词典写入 `dist/google-pinyin-dict.json`（在 `pnpm run build` 中于 tsup 之后执行）。
 */
function main(): void {
  const out = resolve("dist/google-pinyin-dict.json");
  writeFileSync(out, JSON.stringify(dict));
  console.log("wrote", out);
}

main();
