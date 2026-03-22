/**
 * Optional Tailwind / CSS classes for the candidate popup regions.
 */
export interface PinyinPopupClassNames {
  /** Root fixed popup container */
  popup?: string;
  /** Pinyin buffer bar */
  pinyinBar?: string;
  /** Blinking caret in the pinyin bar */
  cursor?: string;
  /** One candidate row */
  candidateRow?: string;
  /** Index label (1. 2. …) */
  candidateIndex?: string;
  /** Candidate Chinese text */
  candidateText?: string;
  /** Shown when there are no candidates */
  empty?: string;
  /** Footer with paging hints */
  footer?: string;
}
