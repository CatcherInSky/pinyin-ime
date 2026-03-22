import * as React from "react";
import { usePinyinIME } from "./usePinyinIME";
import type { UsePinyinIMEOptions } from "./usePinyinIME";
import { PinyinCandidatePopup } from "./PinyinCandidatePopup";
import { joinClassNames } from "./classnames";
import type { PinyinPopupClassNames } from "./types";

/**
 * 与 IME 内部绑定的属性名；不可通过 `inputProps` / `textareaProps` 覆盖。
 */
export const PINYIN_IME_HOST_RESERVED_KEYS = [
  "value",
  "onChange",
  "onBeforeInput",
  "onKeyDownCapture",
  "ref",
] as const;

/** 可安全传入原生 `<input>` 的额外属性 */
export type PinyinFieldNativeInputProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  (typeof PINYIN_IME_HOST_RESERVED_KEYS)[number]
>;

/** 可安全传入原生 `<textarea>` 的额外属性 */
export type PinyinFieldNativeTextareaProps = Omit<
  React.ComponentPropsWithoutRef<"textarea">,
  (typeof PINYIN_IME_HOST_RESERVED_KEYS)[number]
>;

/**
 * 词典相关选项（与 {@link UsePinyinIMEOptions} 一致）。
 */
export type PinyinFieldDictionaryProps = Pick<
  UsePinyinIMEOptions,
  | "getEngine"
  | "dictionary"
  | "dictionaryUrl"
  | "dictionaryFetchInit"
  | "onDictionaryLoaded"
  | "onDictionaryLoadError"
>;

/**
 * `PinyinField` 的公共属性（`variant` 决定渲染 `input` 或 `textarea`）。
 */
export interface PinyinFieldProps extends PinyinFieldDictionaryProps {
  /** 受控文本 */
  value: string;
  /** 文本变化 */
  onChange?: (value: string) => void;
  /** 非 IME 路径上的键盘回调 */
  onKeyDown?: React.KeyboardEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  >;
  /** 单行或多行宿主 */
  variant?: "input" | "textarea";
  /** 关闭 IME 逻辑 */
  enabled?: boolean;
  /** 每页候选数 */
  pageSize?: number;
  /** 候选弹窗分区 class */
  classNames?: Partial<PinyinPopupClassNames>;
  /** Portal 容器 */
  popupPortalContainer?: HTMLElement | null;
  /** 外层包裹元素 class */
  className?: string;
  /** 透传到原生 `input`（`variant="input"` 时） */
  inputProps?: PinyinFieldNativeInputProps;
  /** 透传到原生 `textarea`（`variant="textarea"` 时） */
  textareaProps?: PinyinFieldNativeTextareaProps;
}

/**
 * 统一拼音输入宿主：`variant` 切换 `input` / `textarea`，词典与样式可配置。
 *
 * @param props - IME 与原生宿主属性
 * @returns 受控宿主与候选弹窗
 */
export const PinyinField = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  PinyinFieldProps
>(
  (
    {
      value,
      onChange,
      onKeyDown,
      variant = "input",
      enabled = true,
      pageSize,
      classNames,
      popupPortalContainer,
      className,
      inputProps,
      textareaProps,
      getEngine,
      dictionary,
      dictionaryUrl,
      dictionaryFetchInit,
      onDictionaryLoaded,
      onDictionaryLoadError,
    },
    ref
  ) => {
    const imeOptions: UsePinyinIMEOptions = {
      enabled,
      pageSize,
      getEngine,
      dictionary,
      dictionaryUrl,
      dictionaryFetchInit,
      onDictionaryLoaded,
      onDictionaryLoadError,
    };

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
    } = usePinyinIME<HTMLInputElement | HTMLTextAreaElement>(
      value,
      onChange,
      onKeyDown,
      imeOptions
    );

    const setHostRef = React.useCallback(
      (node: HTMLInputElement | HTMLTextAreaElement | null) => {
        (
          elementRef as React.MutableRefObject<
            HTMLInputElement | HTMLTextAreaElement | null
          >
        ).current = node;
        if (typeof ref === "function") ref(node);
        else if (ref)
          (
            ref as React.MutableRefObject<
              HTMLInputElement | HTMLTextAreaElement | null
            >
          ).current = node;
      },
      [elementRef, ref]
    );

    const commonClass =
      variant === "textarea" ? "pinyin-ime-textarea" : "pinyin-ime-input";

    if (variant === "textarea") {
      const tp = textareaProps ?? {};
      const { className: taClass, ...taRest } = tp;
      return (
        <div className={joinClassNames("pinyin-ime-field-wrap", className)}>
          <textarea
            {...taRest}
            ref={setHostRef}
            className={joinClassNames(commonClass, taClass)}
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

    const ip = inputProps ?? {};
    const { className: inClass, ...inRest } = ip;
    return (
      <div className={joinClassNames("pinyin-ime-field-wrap", className)}>
        <input
          {...inRest}
          ref={setHostRef}
          className={joinClassNames(commonClass, inClass)}
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

PinyinField.displayName = "PinyinField";
