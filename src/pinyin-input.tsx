import * as React from "react";
import { PinyinField } from "./pinyin-field";
import type { PinyinFieldDictionaryProps } from "./pinyin-field";
import type { PinyinPopupClassNames } from "./types";

/**
 * 与 {@link PinyinField} 的 `inputProps` 互斥的顶层字段（由本组件自行绑定）。
 */
type PinyinInputOwnProps = {
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
 * 单行拼音输入框的可选扩展属性（受控 + 弹窗样式 + 词典）。
 */
export interface PinyinInputProps
  extends Omit<
      React.ComponentPropsWithoutRef<"input">,
      "onChange" | keyof PinyinInputOwnProps
    >,
    PinyinInputOwnProps,
    PinyinFieldDictionaryProps {}

/**
 * 带浏览器内拼音 IME 的单行输入框，适用于无法使用系统输入法的场景。
 *
 * @param props - 原生 input 属性及 IME 选项
 * @returns 受控 input 与候选弹窗
 */
export const PinyinInput = React.forwardRef<HTMLInputElement, PinyinInputProps>(
  (props, ref) => {
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
      ...inputRest
    } = props;

    return (
      <PinyinField
        variant="input"
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
        inputProps={inputRest}
      />
    );
  }
);

PinyinInput.displayName = "PinyinInput";
