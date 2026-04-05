/**
 * @file pinyin-ime-editor-attr-parsers.ts
 * @description HTML attribute → property 解析工具，供 `<pinyin-ime-editor>` 使用；非法值有明确兜底。
 */
import { clampIMPageSize, IME_PAGE_SIZE } from "../ime/pinyin-ime-controller";
import type { PopupPlacement } from "./types";

const POPUP_PLACEMENTS: ReadonlySet<string> = new Set([
  "top",
  "bottom",
  "left",
  "right",
]);

/**
 * 解析宿主 `enabled` 属性字符串为布尔值（trim + 大小写不敏感）。
 *
 * @param value - 属性原始字符串；`null` 表示属性未设置或已移除
 * @returns `false` 表示关闭 IME；其余情况为开启（含无法识别的非空字符串，偏安全默认）
 *
 * @remarks
 * 视为关闭：`false`、`0`、`off`、`no`、`disabled`。
 * 视为开启：空串（兼容布尔属性写法）、`true`、`1`、`on`、`yes`。
 */
export function parseEnabledFromAttribute(value: string | null): boolean {
  if (value === null) return true;
  const s = value.trim().toLowerCase();
  if (
    s === "false" ||
    s === "0" ||
    s === "off" ||
    s === "no" ||
    s === "disabled"
  ) {
    return false;
  }
  if (
    s === "" ||
    s === "true" ||
    s === "1" ||
    s === "on" ||
    s === "yes"
  ) {
    return true;
  }
  return true;
}

/**
 * 解析 `popup-position` 属性；仅接受与 {@link PopupPlacement} 一致的四个小写值。
 *
 * @param value - 属性原始字符串；`null` 时返回 `top`
 * @returns 合法方位或默认 `top`
 */
export function parsePopupPlacementFromAttribute(
  value: string | null
): PopupPlacement {
  if (value === null) return "top";
  const s = value.trim().toLowerCase();
  if (POPUP_PLACEMENTS.has(s)) return s as PopupPlacement;
  return "top";
}

/**
 * 将 {@link PopupPlacement} 序列化为属性字符串（小写）；非法内部值兜底为 `top`。
 *
 * @param placement - 当前 property 值
 * @returns 写入 DOM 的字符串
 */
export function popupPlacementToAttribute(placement: PopupPlacement): string {
  if (POPUP_PLACEMENTS.has(placement)) return placement;
  return "top";
}

/**
 * 解析 `editor-type`：仅 `textarea`（忽略大小写与首尾空白）为多行，否则为 `input`。
 *
 * @param value - 属性原始字符串；`null` 时返回 `input`
 */
export function parseEditorTypeFromAttribute(
  value: string | null
): "input" | "textarea" {
  if (value === null) return "input";
  return value.trim().toLowerCase() === "textarea" ? "textarea" : "input";
}

/**
 * 解析 `page-size`：十进制整数，经 {@link clampIMPageSize} 限制在 1–9；无效则用默认 {@link IME_PAGE_SIZE} 再夹取。
 *
 * @param value - 属性原始字符串；`null` 时使用默认页大小
 */
export function parsePageSizeFromAttribute(value: string | null): number {
  if (value === null) return clampIMPageSize(IME_PAGE_SIZE);
  const n = Number.parseInt(value.trim(), 10);
  if (Number.isNaN(n)) return clampIMPageSize(IME_PAGE_SIZE);
  return clampIMPageSize(n);
}
