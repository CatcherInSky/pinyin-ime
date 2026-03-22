import * as React from "react";
import { usePinyinIME } from "./usePinyinIME";
import { PinyinCandidatePopup } from "./PinyinCandidatePopup";
import { cn } from "./cn";
import type { PinyinPopupClassNames } from "./types";

const defaultTextareaClassName =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * 多行拼音输入框的可选扩展属性（受控 + 弹窗样式）。
 */
export interface PinyinTextareaProps
  extends Omit<React.ComponentPropsWithoutRef<"textarea">, "onChange"> {
  /** 文本变化回调（受控） */
  onChange?: (value: string) => void;
  /** 为 `false` 时关闭 IME 逻辑 */
  enabled?: boolean;
  /** 每页候选数，默认 3，最大 9 */
  pageSize?: number;
  /** 候选弹窗各区域 className */
  classNames?: Partial<PinyinPopupClassNames>;
  /** 候选弹窗 Portal 容器 */
  popupPortalContainer?: HTMLElement | null;
}

/**
 * 带浏览器内拼音 IME 的多行文本框。
 *
 * @param props - 原生 textarea 属性及 IME 选项
 * @returns 受控 textarea 与候选弹窗
 */
export const PinyinTextarea = React.forwardRef<
  HTMLTextAreaElement,
  PinyinTextareaProps
>(
  (
    {
      value,
      onChange,
      onKeyDown,
      className,
      enabled = true,
      pageSize,
      classNames,
      popupPortalContainer,
      ...props
    },
    ref
  ) => {
    const {
      elementRef,
      pinyinInput,
      pinyinCursorPosition,
      candidates,
      displayCandidates,
      page,
      pageSize: resolvedPageSize,
      position,
      showPopup,
      selectCandidate,
      setPage,
      handleKeyDown,
      handleBeforeInput,
    } = usePinyinIME<HTMLTextAreaElement>(
      value as string,
      onChange,
      onKeyDown,
      { enabled, pageSize }
    );

    return (
      <div className={cn("relative w-full")}>
        <textarea
          {...props}
          ref={(node) => {
            (
              elementRef as React.MutableRefObject<HTMLTextAreaElement | null>
            ).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref)
              (
                ref as React.MutableRefObject<HTMLTextAreaElement | null>
              ).current = node;
          }}
          className={cn(defaultTextareaClassName, className)}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBeforeInput={handleBeforeInput}
          onKeyDownCapture={handleKeyDown}
        />
        {showPopup && position && (
          <PinyinCandidatePopup
            pinyinInput={pinyinInput}
            pinyinCursorPosition={pinyinCursorPosition}
            candidates={candidates}
            displayCandidates={displayCandidates}
            page={page}
            pageSize={resolvedPageSize}
            position={position}
            onSelect={selectCandidate}
            onPageChange={(delta) => setPage((p) => Math.max(0, p + delta))}
            classNames={classNames}
            portalContainer={popupPortalContainer}
          />
        )}
      </div>
    );
  }
);

PinyinTextarea.displayName = "PinyinTextarea";
