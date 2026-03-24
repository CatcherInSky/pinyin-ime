export { joinClassNames } from "./lib/classnames";
export type {
  PinyinPopupClassNames,
  PopupPosition,
  PopupPlacement,
} from "./lib/types";
export type { DictEntry, PinyinDict } from "./types/dist";

export {
  getCandidates,
  computeMatchedLength,
  createPinyinEngine,
  loadPinyinDictFromUrl,
  assertPinyinDictShape,
  DictionaryLoadError,
  type CandidateItem,
  type PinyinMatchResult,
  type PinyinEngine,
} from "./engine/pinyin";
export {
  PinyinIMEController,
  IME_PAGE_SIZE,
  clampIMPageSize,
  type PinyinIMEControllerOptions,
  type PinyinIMEControllerSnapshot,
  type PinyinIMEHostAdapter,
} from "./ime/pinyin-ime-controller";
export {
  PinyinIMEEditor,
  type PinyinIMEChangeDetail,
  type GetDictionaryFn,
} from "./element";
