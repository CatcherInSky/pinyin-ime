import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import type { PopupPosition } from "./usePinyinIME";
import type { CandidateItem } from "./pinyin";
import type { PinyinPopupClassNames } from "./types";

/** 内置默认样式（Tailwind + shadcn 语义色，需在项目中配置 CSS 变量） */
export const defaultPinyinPopupClassNames: Required<PinyinPopupClassNames> = {
  popup:
    "fixed z-[9999] flex flex-col rounded-md border border-border bg-popover p-0.5 text-xs text-popover-foreground shadow-md",
  pinyinBar:
    "mb-0.5 shrink-0 border-b border-border bg-muted/80 px-1 py-0.5 font-mono text-[10px]",
  cursor: "inline-block h-3 w-px animate-pulse bg-primary align-middle",
  candidateRow:
    "flex shrink-0 cursor-pointer items-center px-1 py-1 hover:bg-accent hover:text-accent-foreground",
  candidateIndex:
    "mr-1 w-4 shrink-0 text-xs font-semibold text-muted-foreground",
  candidateText: "text-[11px]",
  empty: "px-1 py-0 text-[10px] italic text-muted-foreground",
  footer:
    "mt-0.5 flex shrink-0 items-center justify-between border-t border-border px-1 py-1 text-[10px] text-muted-foreground select-none",
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
      className={cn(c.popup)}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        transform: "translateY(-100%) translateY(-2px)",
      }}
    >
      <div className={cn(c.pinyinBar)}>
        {pinyinInput.substring(0, pinyinCursorPosition)}
        <span className={cn(c.cursor)} />
        {pinyinInput.substring(pinyinCursorPosition)}
      </div>

      <div className="flex shrink-0 flex-col">
        {displayCandidates.length > 0 ? (
          displayCandidates.map((item, idx) => {
            const globalIdx = page * pageSize + idx;
            return (
              <div
                key={globalIdx}
                className={cn(c.candidateRow)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item);
                }}
              >
                <span className={cn(c.candidateIndex)}>{idx + 1}.</span>
                <span className={cn(c.candidateText)}>{item.word}</span>
              </div>
            );
          })
        ) : (
          <div className={cn(c.empty)}>无候选词</div>
        )}
      </div>

      {candidates.length > pageSize && (
        <div className={cn(c.footer)}>
          <div className="flex gap-2">
            <span
              className={cn(
                hasPrev
                  ? "cursor-pointer hover:text-foreground"
                  : "cursor-default opacity-50"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                if (hasPrev) onPageChange(-1);
              }}
            >
              &lt; (-)
            </span>
            <span
              className={cn(
                hasNext
                  ? "cursor-pointer hover:text-foreground"
                  : "cursor-default opacity-50"
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
