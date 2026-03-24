export { joinClassNames } from "./lib/classnames";
export type { PinyinPopupClassNames, PopupPosition } from "./lib/types";
export type { DictEntry, GooglePinyinDict } from "../dictionary/google_pinyin_dict";
export {
  getCandidates,
  computeMatchedLength,
  createPinyinEngine,
  loadGooglePinyinDictFromUrl,
  assertGooglePinyinDictShape,
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
