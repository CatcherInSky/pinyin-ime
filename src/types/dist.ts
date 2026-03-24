/**
 * One candidate word or phrase with an optional corpus frequency weight.
 */
export type DictEntry = { w: string; f: number };

/**
 * Map from lowercase pinyin key to ranked candidates (larger corpora use long keys).
 */
export type PinyinDict = Record<string, DictEntry[]>;

/**
 * Contextually types a huge literal as {@link PinyinDict} so declaration emit
 * does not try to serialize an inferred literal type (TS7056).
 *
 * @param d - Full embedded dictionary
 * @returns The same reference
 */
export function asPinyinDict(d: PinyinDict): PinyinDict {
  return d;
}