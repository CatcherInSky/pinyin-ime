/** 候选框相对视口的锚点矩形（与 `getBoundingClientRect()` 一致） */
export interface PopupPosition {
  top: number;
  left: number;
  width: number;
}

/**
 * 候选弹窗各区域的 `className`；用于覆盖 {@link defaultPinyinPopupClassNames}。
 *
 * @remarks
 * 包默认类名为 `pinyin-ime-*`（见 `pinyin-ime/pinyin-ime.css`）；也可传入任意自定义类名。
 */
export interface PinyinPopupClassNames {
  /** 根层 fixed 弹层容器 */
  popup?: string;
  /** 拼音缓冲条 */
  pinyinBar?: string;
  /** 缓冲条内闪烁竖线光标 */
  cursor?: string;
  /** 单行候选 */
  candidateRow?: string;
  /** 数字序号（1. 2. …） */
  candidateIndex?: string;
  /** 候选汉字文本 */
  candidateText?: string;
  /** 无候选时的提示区 */
  empty?: string;
  /** 底部分页提示 */
  footer?: string;
}
