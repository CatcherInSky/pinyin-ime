/**
 * @file pinyin.ts
 * @description 拼音输入法引擎导出；词典由 element 通过 getDictionary 或动态 import 加载。
 */
import { getDefaultEngine } from "../dictionary/registry";

export type {
  CandidateItem,
  PinyinMatchResult,
  PinyinEngine,
} from "./pinyin-engine";
export { createPinyinEngine } from "./pinyin-engine";
export {
  loadGooglePinyinDictFromUrl,
  assertGooglePinyinDictShape,
  DictionaryLoadError,
} from "../dictionary/load-dictionary";

/**
 * 选词后从输入中应消去的长度（反向拼音匹配）。
 *
 * @remarks
 * 使用已注册的默认引擎；需至少有一个 pinyin-ime-editor 已加载词典。
 */
export function computeMatchedLength(
  word: string,
  input: string,
  fallback: number
): number {
  const engine = getDefaultEngine();
  if (!engine) return fallback;
  return engine.computeMatchedLength(word, input, fallback);
}

/**
 * 根据拼音输入获取候选词列表。
 *
 * @remarks
 * 使用已注册的默认引擎；需至少有一个 pinyin-ime-editor 已加载词典，否则返回空列表。
 */
export function getCandidates(input: string) {
  const engine = getDefaultEngine();
  if (!engine) return { candidates: [] };
  return engine.getCandidates(input);
}
