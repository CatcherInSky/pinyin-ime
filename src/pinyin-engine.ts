/**
 * @file pinyin-engine.ts
 * @description 可注入字典的拼音匹配引擎（`createPinyinEngine`）。
 */

import type { GooglePinyinDict } from "./google_pinyin_dict";

/**
 * 单字母前缀递进（ztai → z）时合并词条数上限，避免与「全字典 z*」等长列表拖慢 UI。
 *
 * @remarks
 * 与单独输入 `z` 时逻辑一致，但长串下只取高频前若干条。
 */
const SINGLE_LETTER_PREFIX_CAP = 200;

/** 单个候选词及其消耗的拼音长度 */
export interface CandidateItem {
  /** 候选词 */
  word: string;
  /** 本候选消耗的拼音长度，选词后剩余 = pinyin.slice(matchedLength) */
  matchedLength: number;
}

/** 候选词列表（每项含匹配长度） */
export interface PinyinMatchResult {
  candidates: CandidateItem[];
}

interface WordFreq {
  w: string;
  f: number;
}

/**
 * 由 {@link createPinyinEngine} 返回的匹配 API。
 */
export interface PinyinEngine {
  /**
   * 根据拼音输入获取候选词列表。
   *
   * @param input - 拼音字符串（小写，可含单引号分隔）
   * @returns 匹配结果，每项含 word 与 matchedLength
   */
  getCandidates(input: string): PinyinMatchResult;

  /**
   * 选词后从输入中应消去的长度（反向拼音匹配）。
   *
   * @param word - 选中的词
   * @param input - 当前拼音输入
   * @param fallback - 无匹配时的回退长度
   * @returns 应消去的长度
   */
  computeMatchedLength(word: string, input: string, fallback: number): number;
}

/**
 * 构建「词 → 全局最高频」映射，供候选同层排序。
 *
 * @param dict - 拼音词典
 * @returns 词频映射
 */
function buildWordMaxFreqByWord(
  dict: Record<string, WordFreq[] | undefined>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const key in dict) {
    const list = dict[key];
    if (!list) continue;
    for (const item of list) {
      const prev = map.get(item.w);
      if (prev === undefined || item.f > prev) map.set(item.w, item.f);
    }
  }
  return map;
}

/**
 * 基于给定词典创建拼音引擎；同一词典可复用同一实例以避免重复构建索引。
 *
 * @param dict - 与 {@link GooglePinyinDict} 同形的记录表
 * @returns `getCandidates` 与 `computeMatchedLength`
 */
export function createPinyinEngine(dict: GooglePinyinDict): PinyinEngine {
  const d = dict as Record<string, WordFreq[] | undefined>;
  const wordMaxFreqByWord = buildWordMaxFreqByWord(d);

  const syllableSet = new Set(
    Object.keys(d).filter(
      (k) => /^[a-z]{1,6}$/.test(k) && /[aeiouv]/.test(k)
    )
  );

  function mergeAndSort(groups: Array<WordFreq[]>): WordFreq[] {
    const map = new Map<string, number>();
    for (const group of groups) {
      for (const item of group) {
        const existing = map.get(item.w);
        if (existing === undefined || item.f > existing) {
          map.set(item.w, item.f);
        }
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([w, f]) => ({ w, f }));
  }

  function collectWordsForPrefixKey(prefix: string): WordFreq[] {
    const fullGroups: WordFreq[][] = [];
    const exactMatch = d[prefix];
    if (exactMatch) {
      fullGroups.push(exactMatch);
    } else {
      for (const key in d) {
        if (key.startsWith(prefix)) {
          const val = d[key];
          if (val) fullGroups.push(val);
        }
      }
    }
    return mergeAndSort(fullGroups);
  }

  function getWordKeys(word: string): string[] {
    const keys: string[] = [];
    for (const key in d) {
      const val = d[key];
      if (!val) continue;
      if (val.some((item) => item.w === word)) {
        keys.push(key);
      }
    }
    return keys;
  }

  function splitToSyllables(key: string): string[] | null {
    const memo = new Map<number, string[] | null>();

    const dfs = (start: number): string[] | null => {
      if (start === key.length) return [];
      const cached = memo.get(start);
      if (cached !== undefined) return cached;

      for (let end = Math.min(key.length, start + 6); end > start; end--) {
        const seg = key.substring(start, end);
        if (!syllableSet.has(seg)) continue;
        const rest = dfs(end);
        if (rest) {
          const result = [seg, ...rest];
          memo.set(start, result);
          return result;
        }
      }
      memo.set(start, null);
      return null;
    };

    return dfs(0);
  }

  function matchMixedConsumedLength(input: string, key: string): number {
    if (input.startsWith(key)) return key.length;

    const syllables = splitToSyllables(key);
    if (!syllables) return 0;

    let best = 0;
    const dfs = (idx: number, pos: number): void => {
      if (pos > best) best = pos;
      if (idx >= syllables.length || pos >= input.length) return;

      const syl = syllables[idx];
      if (input.startsWith(syl, pos)) {
        dfs(idx + 1, pos + syl.length);
      }
      if (input[pos] === syl[0]) {
        dfs(idx + 1, pos + 1);
      }
    };

    dfs(0, 0);
    return best;
  }

  function upsertCandidate(
    list: CandidateItem[],
    indexMap: Map<string, number>,
    word: string,
    matchedLength: number
  ): void {
    const idx = indexMap.get(word);
    if (idx === undefined) {
      indexMap.set(word, list.length);
      list.push({ word, matchedLength });
      return;
    }
    if (matchedLength > list[idx].matchedLength) {
      list[idx] = { ...list[idx], matchedLength };
    }
  }

  function getWordMaxFreq(word: string): number {
    return wordMaxFreqByWord.get(word) ?? 0;
  }

  function sortCandidatesByMatchThenFreq(
    items: CandidateItem[]
  ): CandidateItem[] {
    return [...items].sort((a, b) => {
      if (b.matchedLength !== a.matchedLength) {
        return b.matchedLength - a.matchedLength;
      }
      return getWordMaxFreq(b.word) - getWordMaxFreq(a.word);
    });
  }

  function computeMatchedLength(
    word: string,
    input: string,
    fallback: number
  ): number {
    const normalized = input.toLowerCase().replace(/'/g, "");
    if (!normalized) return 0;

    let maxLen = fallback;
    const keys = getWordKeys(word);
    for (const key of keys) {
      const consumed = matchMixedConsumedLength(normalized, key);
      if (consumed > maxLen) maxLen = consumed;
    }
    return maxLen;
  }

  function getCandidates(input: string): PinyinMatchResult {
    if (!input) return { candidates: [] };

    const normalized = input.toLowerCase().replace(/'/g, "");

    const result: CandidateItem[] = [];
    const indexMap = new Map<string, number>();

    const fullWords = collectWordsForPrefixKey(normalized);
    for (const { w } of fullWords) {
      upsertCandidate(result, indexMap, w, normalized.length);
    }

    if (normalized.length >= 4) {
      for (let sylLen = 1; sylLen < normalized.length; sylLen++) {
        const syl = normalized.substring(0, sylLen);
        let sylWords = collectWordsForPrefixKey(syl);
        if (
          sylLen === 1 &&
          normalized.length > sylLen &&
          sylWords.length > SINGLE_LETTER_PREFIX_CAP
        ) {
          sylWords = sylWords.slice(0, SINGLE_LETTER_PREFIX_CAP);
        }
        for (const { w } of sylWords) {
          upsertCandidate(result, indexMap, w, sylLen);
        }
      }
    }

    if (result.length === 0) {
      for (let len = normalized.length - 1; len >= 1; len--) {
        const prefix = normalized.substring(0, len);
        const fallbackWords = collectWordsForPrefixKey(prefix);

        if (fallbackWords.length > 0) {
          for (const { w } of fallbackWords) {
            upsertCandidate(result, indexMap, w, len);
          }
          break;
        }
      }
    }

    return { candidates: sortCandidatesByMatchThenFreq(result) };
  }

  return { getCandidates, computeMatchedLength };
}
