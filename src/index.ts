export { joinClassNames } from "./lib/classnames";
export type { PinyinPopupClassNames, PopupPosition } from "./lib/types";
export type { DictEntry, GooglePinyinDict } from "../dictionary/google_pinyin_dict";
export {
  getCandidates,
  computeMatchedLength,
  defaultPinyinEngine,
  createPinyinEngine,
  loadGooglePinyinDictFromUrl,
  assertGooglePinyinDictShape,
  DictionaryLoadError,
  type CandidateItem,
  type PinyinMatchResult,
  type PinyinEngine,
} from "./engine/pinyin";
export {
  usePinyinIME,
  PAGE_SIZE,
  type UsePinyinIMEReturn,
  type UsePinyinIMEOptions,
  type DictionaryLoadState,
} from "./hooks/usePinyinIME";
export {
  PinyinIMEController,
  IME_PAGE_SIZE,
  clampIMPageSize,
  type PinyinIMEControllerOptions,
  type PinyinIMEControllerSnapshot,
  type PinyinIMEHostAdapter,
} from "./ime/pinyin-ime-controller";
export {
  PinyinCandidatePopup,
  defaultPinyinPopupClassNames,
  type PinyinCandidatePopupProps,
} from "./components/PinyinCandidatePopup";
export {
  PinyinField,
  PINYIN_IME_HOST_RESERVED_KEYS,
  type PinyinFieldProps,
  type PinyinFieldNativeInputProps,
  type PinyinFieldNativeTextareaProps,
  type PinyinFieldDictionaryProps,
} from "./components/pinyin-field";
export { PinyinIMEEditor, type PinyinIMEChangeDetail } from "./element";
