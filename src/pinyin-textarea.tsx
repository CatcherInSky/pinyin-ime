import * as React from "react";
import { PinyinField } from "./pinyin-field";
import type { PinyinFieldDictionaryProps } from "./pinyin-field";
import type { PinyinPopupClassNames } from "./types";

/**
 * 与 {@link PinyinField} 的 `textareaProps` 互斥的顶层字段（由本组件自行绑定）。
 */
type PinyinTextareaOwnProps = {
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
};

/**
 * 多行拼音输入框的可选扩展属性（受控 + 弹窗样式 + 词典）。
 */
export interface PinyinTextareaProps
  extends Omit<
      React.ComponentPropsWithoutRef<"textarea">,
      "onChange" | keyof PinyinTextareaOwnProps
    >,
    PinyinTextareaOwnProps,
    PinyinFieldDictionaryProps {}

/**
 * 带浏览器内拼音 IME 的多行文本框。
 *
 * @param props - 原生 textarea 属性及 IME 选项
 * @returns 受控 textarea 与候选弹窗
 */
export const PinyinTextarea = React.forwardRef<
  HTMLTextAreaElement,
  PinyinTextareaProps
>((props, ref) => {
  const {
    value,
    onChange,
    onKeyDown,
    className,
    enabled,
    pageSize,
    classNames,
    popupPortalContainer,
    getEngine,
    dictionary,
    dictionaryUrl,
    dictionaryFetchInit,
    onDictionaryLoaded,
    onDictionaryLoadError,
    ...textareaRest
  } = props;

  return (
    <PinyinField
      variant="textarea"
      ref={ref}
      value={value as string}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={className}
      enabled={enabled}
      pageSize={pageSize}
      classNames={classNames}
      popupPortalContainer={popupPortalContainer}
      getEngine={getEngine}
      dictionary={dictionary}
      dictionaryUrl={dictionaryUrl}
      dictionaryFetchInit={dictionaryFetchInit}
      onDictionaryLoaded={onDictionaryLoaded}
      onDictionaryLoadError={onDictionaryLoadError}
      textareaProps={textareaRest}
    />
  );
});

PinyinTextarea.displayName = "PinyinTextarea";
