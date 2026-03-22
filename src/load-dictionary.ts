/**
 * @file load-dictionary.ts
 * @description 从 URL 异步加载与 {@link GooglePinyinDict} 同形的 JSON 词典。
 */

import type { DictEntry, GooglePinyinDict } from "./google_pinyin_dict";

/**
 * 在 {@link loadGooglePinyinDictFromUrl} 失败时抛出，便于调用方区分网络/解析错误。
 */
export class DictionaryLoadError extends Error {
  /**
   * @param message - 人类可读说明
   * @param options - 标准 `Error` 选项（如 `cause`）
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DictionaryLoadError";
  }
}

/**
 * 校验从网络解析出的对象是否为可用的 {@link GooglePinyinDict}。
 *
 * @param data - 未知 JSON 值
 * @returns 类型收窄后的词典
 * @throws DictionaryLoadError 若结构非法
 */
export function assertGooglePinyinDictShape(data: unknown): GooglePinyinDict {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new DictionaryLoadError("Dictionary JSON must be a plain object");
  }
  const o = data as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    const arr = o[key];
    if (!Array.isArray(arr)) {
      throw new DictionaryLoadError(
        `Dictionary key "${key}" must map to an array`
      );
    }
    for (let i = 0; i < arr.length; i++) {
      const row = arr[i];
      if (
        row === null ||
        typeof row !== "object" ||
        typeof (row as DictEntry).w !== "string" ||
        typeof (row as DictEntry).f !== "number"
      ) {
        throw new DictionaryLoadError(
          `Invalid entry at "${key}"[${i}]: expected { w: string, f: number }`
        );
      }
    }
  }
  return o as GooglePinyinDict;
}

/**
 * 通过 `fetch` 加载远程词典 JSON（需服务端允许 CORS）。
 *
 * @param url - 词典地址
 * @param init - 可选 `fetch` 选项（头、缓存等）
 * @returns 解析并校验后的 {@link GooglePinyinDict}
 * @throws DictionaryLoadError 当 HTTP 非成功、非 JSON 或结构非法时
 */
export async function loadGooglePinyinDictFromUrl(
  url: string,
  init?: RequestInit
): Promise<GooglePinyinDict> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new DictionaryLoadError("Failed to fetch dictionary", { cause: e });
  }
  if (!res.ok) {
    throw new DictionaryLoadError(
      `Dictionary request failed: HTTP ${res.status} ${res.statusText}`
    );
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch (e) {
    throw new DictionaryLoadError("Dictionary response is not valid JSON", {
      cause: e,
    });
  }
  return assertGooglePinyinDictShape(json);
}
