/**
 * @file pinyin.ts
 * @description 拼音输入法引擎的默认导出（内嵌词典）与类型再导出。
 *
 * @remarks
 * 高级用法请使用 {@link createPinyinEngine} 注入自定义词典，或
 * {@link loadGooglePinyinDictFromUrl} 远程加载。
 */
import { dict } from "../../dictionary/google_pinyin_dict";
import { createPinyinEngine } from "./pinyin-engine";

/**
 * 使用包内嵌 {@link dict} 构建的默认引擎；未传入自定义词典/url 时与 {@link getCandidates} 行为一致。
 */
export const defaultPinyinEngine = createPinyinEngine(dict);

const defaultEngine = defaultPinyinEngine;

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
 * 使用包内默认内嵌词典。自定义词典请使用 {@link createPinyinEngine} 返回实例上的方法。
 *
 * @param word - 选中的词
 * @param input - 当前拼音输入
 * @param fallback - 无匹配时的回退长度
 * @returns 应消去的长度
 */
export function computeMatchedLength(
  word: string,
  input: string,
  fallback: number
): number {
  return defaultEngine.computeMatchedLength(word, input, fallback);
}

/**
 * 根据拼音输入获取候选词列表（默认内嵌词典）。
 *
 * @param input - 拼音字符串（小写，可含单引号分隔）
 * @returns 匹配结果，每项含 word 与 matchedLength
 */
export function getCandidates(input: string) {
  return defaultEngine.getCandidates(input);
}
