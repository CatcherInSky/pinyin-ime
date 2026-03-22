/**
 * @file pinyin.ts
 * @description 拼音输入法引擎
 *
 * ## 功能需求
 *
 * - 词组候选（西红柿、喜欢等）；最终列表按「消耗拼音长度」降序再按词频（全拼优先于 zh 等缩写）
 * - 全拼 / 缩写 / 首字母 / 前缀匹配
 * - 分词回退：sqing 无全词时回退到 s、sq 等
 * - 递进选词：zhongdan 同时展示中/钟/重（zhong）与重大（zhongda）；短前缀与主匹配同规则（无精确 key 时用 startsWith）
 * - 如 ztai：含「仅 z」时的候选（与单独输入 z 一致），单字母递进有数量上限避免列表爆炸
 * - 选词消耗：computeMatchedLength 反向匹配，取 input 前缀与 dict key 的最长匹配
 *
 * ## 字典要求
 *
 * 为展示单字符候选（如 sqing 时的 s→说/是），dict 需包含单字母 key（如 "s"）。
 */
import { dict as _dict } from "./google_pinyin_dict";

/** 带索引签名的字典类型，允许动态 string 查找 */
const dict = _dict as Record<
  string,
  Array<{ w: string; f: number }> | undefined
>;

/**
 * 单字母前缀递进（ztai → z）时合并词条数上限，避免与「全字典 z*」等长列表拖慢 UI。
 *
 * @remarks
 * 与单独输入 `z` 时逻辑一致，但长串下只取高频前若干条。
 */
const SINGLE_LETTER_PREFIX_CAP = 200;

/** 词 -> 全局最高频（模块加载时构建，供候选同层排序） */
const wordMaxFreqByWord: Map<string, number> = (() => {
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
})();

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
 * 选词后从输入中应消去的长度（反向拼音匹配）。
 *
 * @remarks
 * 选「说清」时输入为 "sqing"，应消去 "sqing" 而非仅 "sq"。
 * 遍历所有含该词的 dict key，取 input 前缀匹配中最长者。
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

/**
 * 按「主匹配」规则收集某前缀下的词条：有精确 key 仅用该 key，否则合并所有 `key.startsWith(prefix)` 的词条。
 *
 * @param prefix - 拼音前缀（已规范化）
 * @returns 去重后按词频降序的词条列表
 */
function collectWordsForPrefixKey(prefix: string): WordFreq[] {
  const fullGroups: WordFreq[][] = [];
  const exactMatch = dict[prefix];
  if (exactMatch) {
    fullGroups.push(exactMatch);
  } else {
    for (const key in dict) {
      if (key.startsWith(prefix)) {
        const val = dict[key];
        if (val) fullGroups.push(val);
      }
    }
  }
  return mergeAndSort(fullGroups);
}

/**
 * 合并多组词条并去重，保留最高频。
 *
 * @param groups - 多组词条
 * @returns 合并后的词条列表
 */
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

/**
 * 获取某个词对应的所有拼音 key。
 *
 * @param word - 候选词
 * @returns 包含该词的 key 列表
 */
function getWordKeys(word: string): string[] {
  const keys: string[] = [];
  for (const key in dict) {
    const val = dict[key];
    if (!val) continue;
    if (val.some((item) => item.w === word)) {
      keys.push(key);
    }
  }
  return keys;
}

/** 可能的完整音节（近似集合） */
const syllableSet = new Set(
  Object.keys(dict).filter((k) => /^[a-z]{1,6}$/.test(k) && /[aeiouv]/.test(k))
);

/**
 * 将拼音 key 尽量切分为音节序列（最长优先）。
 *
 * @param key - 拼音 key（如 shuoqing）
 * @returns 音节数组，失败时返回 null
 */
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

/**
 * 计算 input 与 key 的“全拼/首字母/混拼”最长可消费长度。
 *
 * @remarks
 * 例：key=shuoqing, input=sqing，可匹配 s(首字母) + qing(全拼)，消费 5。
 *
 * @param input - 用户输入（已规范化）
 * @param key - 候选词对应的拼音 key
 * @returns 最长可消费长度
 */
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

/**
 * 在结果集中 upsert 候选词；若已存在则保留更长的 matchedLength。
 *
 * @param list - 结果数组
 * @param indexMap - 词到索引映射
 * @param word - 候选词
 * @param matchedLength - 消耗长度
 */
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

/**
 * 取该词在字典中的最高词频（用于同层排序）。
 *
 * @param word - 候选词
 * @returns 最高 f
 */
function getWordMaxFreq(word: string): number {
  return wordMaxFreqByWord.get(word) ?? 0;
}

/**
 * 对候选列表排序：先按「匹配输入长度」降序（全拼优先于缩写），再按词频降序。
 *
 * @remarks
 * 例 zhongdan：重担(8) > 中/钟/重(5) > 最后/之后(2，来自 zh)。
 *
 * @param items - 候选列表
 * @returns 排序后的列表
 */
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

/**
 * 根据拼音输入获取候选词列表。
 *
 * @remarks
 * 递进选词：同时返回全词匹配与首音节匹配。
 * 例如 "fatiao" 返回：发条(6)、法条(6)、发(2)、法(2)、罚(2)。
 * 选 "发" 后剩余 "tiao"，下一轮展示条、跳、调等。
 *
 * @param input - 拼音字符串（小写，可含单引号分隔）
 * @returns 匹配结果，每项含 word 与 matchedLength
 */
export function getCandidates(input: string): PinyinMatchResult {
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
