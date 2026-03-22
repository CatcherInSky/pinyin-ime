/**
 * @file classnames.ts
 * @description 合并可选 `className` 片段（无 Tailwind 依赖）。
 */

/**
 * 将若干 class 字符串去空后拼接为一个 `className`。
 *
 * @param parts - 任意片段（可含 `undefined` / 空串）
 * @returns 单空格分隔的类名
 */
export function joinClassNames(
  ...parts: Array<string | undefined | null | false>
): string {
  return parts.filter(Boolean).join(" ");
}
