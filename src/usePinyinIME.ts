/**
 * @file usePinyinIME.ts
 * @description 拼音输入法状态管理 Hook（无 i18n / 业务耦合）
 */
import * as React from "react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { getCandidates, computeMatchedLength } from "./pinyin";
import type { CandidateItem } from "./pinyin";

/** 默认每页候选数量（与数字键 1–3 的原始设计一致） */
export const PAGE_SIZE = 3;

/** 候选框位置信息 */
export interface PopupPosition {
  top: number;
  left: number;
  width: number;
}

/** `usePinyinIME` 的可选配置 */
export interface UsePinyinIMEOptions {
  /**
   * 为 `false` 时不拦截键盘，等价于普通受控输入。
   * @defaultValue true
   */
  enabled?: boolean;
  /**
   * 每页候选词数量；同时决定数字键 `1`…`n` 的数量（最大 9）。
   * @defaultValue {@link PAGE_SIZE}
   */
  pageSize?: number;
}

/** usePinyinIME hook 的返回值 */
export interface UsePinyinIMEReturn<
  T extends HTMLInputElement | HTMLTextAreaElement,
> {
  /** 绑定到宿主元素的 ref */
  elementRef: React.RefObject<T>;
  /** 当前正在输入的拼音字母串 */
  pinyinInput: string;
  /** 拼音串内光标位置（0 ~ pinyinInput.length） */
  pinyinCursorPosition: number;
  /** 全部候选词 */
  candidates: CandidateItem[];
  /** 当前页的候选词 */
  displayCandidates: CandidateItem[];
  /** 当前页码（从 0 开始） */
  page: number;
  /** 每页条数（与选项一致，已夹在 1–9） */
  pageSize: number;
  /** 候选弹窗位置，null 表示不显示 */
  position: PopupPosition | null;
  /** 是否应显示候选弹窗 */
  showPopup: boolean;
  /** 选中某个候选词 */
  selectCandidate: (item: CandidateItem) => void;
  /** 设置页码 */
  setPage: React.Dispatch<React.SetStateAction<number>>;
  /** 处理键盘事件的回调（建议绑定在 capture 阶段） */
  handleKeyDown: React.KeyboardEventHandler<T>;
  /** 拦截默认插入文本（与拼音/翻页键冲突时），与 handleKeyDown 配合 */
  handleBeforeInput: React.FormEventHandler<T>;
}

/**
 * 将每页条数限制在 1–9，以便用单个数字键选词。
 *
 * @param n - 期望的每页条数
 * @returns 夹在 1–9 的值
 */
function clampPageSize(n: number): number {
  if (!Number.isFinite(n)) return PAGE_SIZE;
  return Math.min(9, Math.max(1, Math.floor(n)));
}

/**
 * 翻页或与拼音控制相关、需屏蔽默认输入的键（含 `e.code`、Shift+= 的 `+`、小键盘）。
 *
 * @param e - 键盘事件
 * @returns 是否为翻页/控制符号键
 */
function isPagingOrControlSymbolKey(e: React.KeyboardEvent): boolean {
  if (["=", ".", "-", ","].includes(e.key)) return true;
  if (e.key === "+" || e.key === "_") return true;
  const c = e.code;
  return (
    c === "Equal" ||
    c === "Minus" ||
    c === "Period" ||
    c === "Comma" ||
    c === "NumpadSubtract" ||
    c === "NumpadAdd" ||
    c === "NumpadDecimal"
  );
}

/**
 * 是否视为「下一页」候选。
 *
 * @param e - 键盘事件
 * @returns 是否为下一页
 */
function isNextPageKey(e: React.KeyboardEvent): boolean {
  if (e.key === "=" || e.key === "." || e.key === "+") return true;
  const c = e.code;
  return (
    c === "Equal" ||
    c === "Period" ||
    c === "NumpadAdd" ||
    c === "NumpadDecimal"
  );
}

/**
 * 是否视为「上一页」候选。
 *
 * @param e - 键盘事件
 * @returns 是否为上一页
 */
function isPrevPageKey(e: React.KeyboardEvent): boolean {
  if (e.key === "-" || e.key === "," || e.key === "_") return true;
  const c = e.code;
  return c === "Minus" || c === "Comma" || c === "NumpadSubtract";
}

/**
 * 判断按键是否为当前页大小范围内的数字选词键。
 *
 * @param key - `KeyboardEvent.key`
 * @param pageSize - 每页候选数
 * @returns 是否为 `1`…`pageSize`
 */
function isDigitSelectKey(key: string, pageSize: number): boolean {
  const d = parseInt(key, 10);
  return /^[1-9]$/.test(key) && d >= 1 && d <= pageSize;
}

/**
 * 拼音输入法状态管理 Hook。
 *
 * @remarks
 * 支持递进选词、拼音串内光标、数字选词、翻页与防输入泄漏。
 *
 * @param value - 受控值
 * @param onChange - 值变化回调
 * @param onKeyDown - 可选，非 IME 拦截路径上的键盘回调
 * @param options - 可选：`enabled`、`pageSize`
 * @returns IME 状态与事件处理器
 */
export function usePinyinIME<T extends HTMLInputElement | HTMLTextAreaElement>(
  value: string | undefined,
  onChange: ((value: string) => void) | undefined,
  onKeyDown: React.KeyboardEventHandler<T> | undefined,
  options?: UsePinyinIMEOptions
): UsePinyinIMEReturn<T> {
  const enabled = options?.enabled !== false;
  const pageSize = useMemo(
    () => clampPageSize(options?.pageSize ?? PAGE_SIZE),
    [options?.pageSize]
  );

  const [pinyinInput, setPinyinInput] = useState("");
  const [pinyinCursorPosition, setPinyinCursorPosition] = useState(0);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [page, setPage] = useState(0);
  const [position, setPosition] = useState<PopupPosition | null>(null);

  const elementRef = useRef<T>(null);

  const updatePosition = useCallback(() => {
    const el = elementRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPosition({ top: rect.top, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (pinyinInput) {
      const { candidates: cands } = getCandidates(pinyinInput);
      setCandidates(cands);
      setPage(0);
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    } else {
      setCandidates([]);
      setPosition(null);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [pinyinInput, updatePosition]);

  const insertText = useCallback(
    (text: string) => {
      const el = elementRef.current;
      if (!el) return;

      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? start;
      const currentVal = String(value || "");
      const newValue =
        currentVal.substring(0, start) + text + currentVal.substring(end);

      onChange?.(newValue);

      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + text.length;
        el.focus();
      });
    },
    [value, onChange]
  );

  const selectCandidate = useCallback(
    (item: CandidateItem) => {
      insertText(item.word);
      const len = computeMatchedLength(
        item.word,
        pinyinInput,
        item.matchedLength
      );
      const remaining = pinyinInput.substring(len);
      const nextInput = remaining.startsWith("'")
        ? remaining.substring(1)
        : remaining;
      setPinyinInput(nextInput);
      setPinyinCursorPosition(nextInput.length);
    },
    [insertText, pinyinInput]
  );

  const handleBeforeInput = useCallback<React.FormEventHandler<T>>(
    (e) => {
      if (!enabled) return;
      const ni = e.nativeEvent as InputEvent;
      if (
        ni.inputType === "insertFromPaste" ||
        ni.inputType === "insertFromDrop"
      ) {
        return;
      }
      if (
        ni.inputType === "insertCompositionText" ||
        ni.inputType === "insertFromComposition"
      ) {
        return;
      }
      if (ni.inputType !== "insertText" || !ni.data) return;
      if (ni.data.length !== 1) return;
      const d = ni.data;
      if (pinyinInput.length > 0) {
        if (d === " ") {
          e.preventDefault();
          return;
        }
        if (isDigitSelectKey(d, pageSize)) {
          e.preventDefault();
          return;
        }
        if (/^[=\-.,]$/.test(d)) {
          e.preventDefault();
          return;
        }
      }
      if (/^[a-zA-Z']$/.test(d)) {
        e.preventDefault();
      }
    },
    [enabled, pinyinInput.length, pageSize]
  );

  const handleKeyDown = useCallback<React.KeyboardEventHandler<T>>(
    (e) => {
      if (!enabled) {
        onKeyDown?.(e);
        return;
      }

      if (pinyinInput.length > 0 && isPagingOrControlSymbolKey(e)) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (pinyinInput.length > 0) {
        if (e.key === "Backspace") {
          e.preventDefault();
          if (pinyinCursorPosition > 0) {
            const before = pinyinInput.substring(0, pinyinCursorPosition - 1);
            const after = pinyinInput.substring(pinyinCursorPosition);
            setPinyinInput(before + after);
            setPinyinCursorPosition(pinyinCursorPosition - 1);
          }
          return;
        }

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setPinyinCursorPosition((p) => (p > 0 ? p - 1 : pinyinInput.length));
          return;
        }

        if (e.key === "ArrowRight") {
          e.preventDefault();
          setPinyinCursorPosition((p) => (p < pinyinInput.length ? p + 1 : 0));
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();
          insertText(pinyinInput);
          setPinyinInput("");
          setPinyinCursorPosition(0);
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          setPinyinInput("");
          setPinyinCursorPosition(0);
          return;
        }

        if (e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          if (candidates.length > 0) {
            selectCandidate(candidates[page * pageSize]);
          } else {
            insertText(pinyinInput);
            setPinyinInput("");
            setPinyinCursorPosition(0);
          }
          return;
        }

        if (isDigitSelectKey(e.key, pageSize)) {
          e.preventDefault();
          const index = parseInt(e.key, 10) - 1;
          const globalIndex = page * pageSize + index;
          if (globalIndex < candidates.length) {
            selectCandidate(candidates[globalIndex]);
          }
          return;
        }

        if (isNextPageKey(e)) {
          if ((page + 1) * pageSize < candidates.length) {
            setPage((p) => p + 1);
          }
          return;
        }

        if (isPrevPageKey(e)) {
          if (page > 0) {
            setPage((p) => p - 1);
          }
          return;
        }
      }

      if (/^[a-z']$/i.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const before = pinyinInput.substring(0, pinyinCursorPosition);
        const after = pinyinInput.substring(pinyinCursorPosition);
        setPinyinInput(before + e.key.toLowerCase() + after);
        setPinyinCursorPosition(pinyinCursorPosition + 1);
        return;
      }

      if (pinyinInput.length > 0 && isPagingOrControlSymbolKey(e)) return;

      onKeyDown?.(e);
    },
    [
      enabled,
      pinyinInput,
      pinyinCursorPosition,
      candidates,
      page,
      pageSize,
      insertText,
      selectCandidate,
      onKeyDown,
    ]
  );

  const displayCandidates = candidates.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  const showPopup = pinyinInput.length > 0 && position !== null;

  return {
    elementRef,
    pinyinInput,
    pinyinCursorPosition,
    candidates,
    displayCandidates,
    page,
    pageSize,
    position,
    showPopup,
    selectCandidate,
    setPage,
    handleKeyDown,
    handleBeforeInput,
  };
}
