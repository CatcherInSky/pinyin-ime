import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/styles/pinyin-ime.css"), "utf8");
const out = `/**
 * @file pinyin-ime-style-text.ts
 * @description 由 \`scripts/embed-css.mjs\` 自 \`src/styles/pinyin-ime.css\` 生成，请勿手改。
 */
export const PINYIN_IME_STYLE_TEXT = ${JSON.stringify(css)};
`;
writeFileSync(join(root, "src/ime/pinyin-ime-style-text.ts"), out);
