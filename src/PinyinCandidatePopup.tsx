import * as React from "react";
import { createPortal } from "react-dom";
import { joinClassNames } from "./classnames";
import type { PopupPosition } from "./types";
import type { CandidateItem } from "./pinyin-engine";
import type { PinyinPopupClassNames } from "./types";

/**
 * 内置默认样式类名（需引入 `pinyin-ime/pinyin-ime.css` 或自行覆盖 `classNames`）。
 */
export const defaultPinyinPopupClassNames: Required<PinyinPopupClassNames> = {
  popup: "pinyin-ime-popup",
  pinyinBar: "pinyin-ime-pinyin-bar",
  cursor: "pinyin-ime-cursor",
  candidateRow: "pinyin-ime-candidate-row",
  candidateIndex: "pinyin-ime-candidate-index",
  candidateText: "pinyin-ime-candidate-text",
  empty: "pinyin-ime-empty",
  footer: "pinyin-ime-footer",
};

/** PinyinCandidatePopup 组件属性 */
export interface PinyinCandidatePopupProps {
  /** 当前正在输入的拼音字母 */
  pinyinInput: string;
  /** 拼音串内光标位置 */
  pinyinCursorPosition: number;
  /** 全部候选词 */
  candidates: CandidateItem[];
  /** 当前页的候选词 */
  displayCandidates: CandidateItem[];
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 弹窗锚点位置 */
  position: PopupPosition;
  /** 选词回调 */
  onSelect: (item: CandidateItem) => void;
  /** 翻页回调 */
  onPageChange: (delta: number) => void;
  /** 覆盖默认弹窗各区域 className */
  classNames?: Partial<PinyinPopupClassNames>;
  /** Portal 挂载节点，默认 `document.body` */
  portalContainer?: HTMLElement | null;
}

/**
 * 拼音候选词弹窗：Portal 到 body，锚在输入框上方。
 *
 * @param props - 弹窗属性
 * @returns Portal 渲染的 React 节点，SSR 时返回 null
 */
export const PinyinCandidatePopup: React.FC<PinyinCandidatePopupProps> = ({
  pinyinInput,
  pinyinCursorPosition,
  candidates,
  displayCandidates,
  page,
  pageSize,
  position,
  onSelect,
  onPageChange,
  classNames,
  portalContainer,
}) => {
  const c = { ...defaultPinyinPopupClassNames, ...classNames };
  const totalPages = Math.ceil(candidates.length / pageSize) || 1;
  const hasPrev = page > 0;
  const hasNext = (page + 1) * pageSize < candidates.length;

  const popup = (
    <div
      className={joinClassNames(c.popup)}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        transform: "translateY(-100%) translateY(-2px)",
      }}
    >
      <div className={joinClassNames(c.pinyinBar)}>
        {pinyinInput.substring(0, pinyinCursorPosition)}
        <span className={joinClassNames(c.cursor)} />
        {pinyinInput.substring(pinyinCursorPosition)}
      </div>

      <div className="pinyin-ime-candidate-list">
        {displayCandidates.length > 0 ? (
          displayCandidates.map((item, idx) => {
            const globalIdx = page * pageSize + idx;
            return (
              <div
                key={globalIdx}
                className={joinClassNames(c.candidateRow)}
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item);
                }}
              >
                <span className={joinClassNames(c.candidateIndex)}>
                  {idx + 1}.
                </span>
                <span className={joinClassNames(c.candidateText)}>
                  {item.word}
                </span>
              </div>
            );
          })
        ) : (
          <div className={joinClassNames(c.empty)}>无候选词</div>
        )}
      </div>

      {candidates.length > pageSize && (
        <div className={joinClassNames(c.footer)}>
          <div className="pinyin-ime-footer-nav">
            <span
              className={joinClassNames(
                "pinyin-ime-page-link",
                !hasPrev && "pinyin-ime-page-link--disabled"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                if (hasPrev) onPageChange(-1);
              }}
            >
              &lt; (-)
            </span>
            <span
              className={joinClassNames(
                "pinyin-ime-page-link",
                !hasNext && "pinyin-ime-page-link--disabled"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                if (hasNext) onPageChange(1);
              }}
            >
              (=) &gt;
            </span>
          </div>
          <span>
            {page + 1} / {totalPages}
          </span>
        </div>
      )}
    </div>
  );

  if (typeof document === "undefined") return null;
  const container = portalContainer ?? document.body;
  return createPortal(popup, container);
};
