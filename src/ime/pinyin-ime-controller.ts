/**
 * @file pinyin-ime-controller.ts
 * @description 与 DOM 解耦的拼音 IME 状态机（原生 `KeyboardEvent` / `InputEvent`），供 React Hook 与 Lit 组件共用。
 */

import type { CandidateItem } from "../engine/pinyin-engine";
import type { PinyinEngine } from "../engine/pinyin-engine";

/** 默认每页候选数量（与数字键 1–9 一致） */
export const IME_PAGE_SIZE = 3;

/**
 * 将每页条数限制在 1–9，以便用单个数字键选词。
 *
 * @param n - 期望的每页条数
 * @returns 夹在 1–9 的值
 */
export function clampIMPageSize(n: number): number {
  if (!Number.isFinite(n)) return IME_PAGE_SIZE;
  return Math.min(9, Math.max(1, Math.floor(n)));
}

/**
 * 宿主元素上读取/写入受控值与选区的回调集合。
 *
 * @typeParam T - `HTMLInputElement` 或 `HTMLTextAreaElement`
 */
export interface PinyinIMEHostAdapter<T extends HTMLInputElement | HTMLTextAreaElement> {
  /** 当前受控字符串 */
  getValue: () => string;
  /** 更新受控值（由宿主框架触发重渲染） */
  onValueChange: (value: string) => void;
  /** 当前聚焦的 input/textarea */
  getElement: () => T | null;
}

/**
 * 构造控制器时的选项（可在运行中通过 {@link PinyinIMEController.setOptions} 更新）。
 *
 * @typeParam T - 宿主元素类型
 */
export interface PinyinIMEControllerOptions<
  T extends HTMLInputElement | HTMLTextAreaElement,
> extends PinyinIMEHostAdapter<T> {
  /**
   * 返回当前用于匹配的引擎；字典未就绪时可返回 `null`（候选为空）。
   */
  getEngine: () => PinyinEngine | null;
  /** 为 `false` 时不拦截键盘 */
  enabled?: boolean;
  /** 每页候选数，默认 {@link IME_PAGE_SIZE} */
  pageSize?: number;
  /** 非 IME 拦截路径上的额外键盘回调 */
  onKeyDown?: (e: KeyboardEvent) => void;
}

/**
 * {@link PinyinIMEController.getSnapshot} 返回的快照（用于外部 UI 渲染）。
 */
export interface PinyinIMEControllerSnapshot {
  /** 拼音缓冲 */
  pinyinInput: string;
  /** 缓冲内光标 */
  pinyinCursorPosition: number;
  /** 全部候选 */
  candidates: CandidateItem[];
  /** 当前页候选 */
  displayCandidates: CandidateItem[];
  /** 当前页码（从 0 起） */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 拼音非空时可为 true；是否与弹层同显由宿主结合定位再定 */
  hasActiveComposition: boolean;
}

/**
 * 翻页或与拼音控制相关、需屏蔽默认输入的键。
 *
 * @param e - 键盘事件
 * @returns 是否为翻页/控制符号键
 */
function isPagingOrControlSymbolKey(e: KeyboardEvent): boolean {
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
function isNextPageKey(e: KeyboardEvent): boolean {
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
function isPrevPageKey(e: KeyboardEvent): boolean {
  if (e.key === "-" || e.key === "," || e.key === "_") return true;
  const c = e.code;
  return c === "Minus" || c === "Comma" || c === "NumpadSubtract";
}

/**
 * 是否为当前页范围内的数字选词键。
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
 * 拼音 IME 控制器：在原生事件上调用 {@link PinyinIMEController.handleBeforeInput} /
 * {@link PinyinIMEController.handleKeyDown}，通过 {@link PinyinIMEController.subscribe} 订阅 UI 更新。
 *
 * @typeParam T - 宿主元素类型
 */
export class PinyinIMEController<
  T extends HTMLInputElement | HTMLTextAreaElement,
> {
  private options: PinyinIMEControllerOptions<T>;
  private listeners = new Set<() => void>();
  private pinyinInput = "";
  private pinyinCursorPosition = 0;
  private candidates: CandidateItem[] = [];
  private page = 0;
  private pageSize = IME_PAGE_SIZE;

  /**
   * `useSyncExternalStore` 要求：在状态未变时 {@link PinyinIMEController.getSnapshot} 返回同一引用。
   * 仅在 {@link PinyinIMEController.emit} 时置 `null` 以在下次读取时重建。
   */
  private cachedSnapshot: PinyinIMEControllerSnapshot | null = null;

  /**
   * @param options - 初始选项（须提供稳定的 `getEngine` / `getValue` 等闭包）
   */
  constructor(options: PinyinIMEControllerOptions<T>) {
    this.options = options;
    this.pageSize = clampIMPageSize(options.pageSize ?? IME_PAGE_SIZE);
  }

  /**
   * 合并运行期选项（如字典加载完成后更新 `getEngine`）。
   *
   * @param patch - 要覆盖的字段
   */
  setOptions(patch: Partial<PinyinIMEControllerOptions<T>>): void {
    this.options = { ...this.options, ...patch };
    if (patch.pageSize !== undefined) {
      this.pageSize = clampIMPageSize(patch.pageSize);
      this.page = 0;
    }
    this.recomputeCandidates();
    this.emit();
  }

  /**
   * 订阅状态变化（用于 `useSyncExternalStore` 等）。
   *
   * @param onStoreChange - 在快照变化时调用
   * @returns 取消订阅函数
   */
  subscribe(onStoreChange: () => void): () => void {
    this.listeners.add(onStoreChange);
    return () => this.listeners.delete(onStoreChange);
  }

  /**
   * 取得当前快照（应在订阅回调后读取以保证一致性）。
   *
   * @returns 不可变快照视图
   */
  getSnapshot(): PinyinIMEControllerSnapshot {
    if (this.cachedSnapshot === null) {
      const displayCandidates = this.candidates.slice(
        this.page * this.pageSize,
        (this.page + 1) * this.pageSize
      );
      this.cachedSnapshot = {
        pinyinInput: this.pinyinInput,
        pinyinCursorPosition: this.pinyinCursorPosition,
        candidates: this.candidates,
        displayCandidates,
        page: this.page,
        pageSize: this.pageSize,
        hasActiveComposition: this.pinyinInput.length > 0,
      };
    }
    return this.cachedSnapshot;
  }

  private emit(): void {
    this.cachedSnapshot = null;
    for (const l of this.listeners) l();
  }

  private recomputeCandidates(): void {
    const engine = this.options.getEngine();
    if (!this.pinyinInput || !engine) {
      this.candidates = [];
      this.page = 0;
      return;
    }
    this.candidates = engine.getCandidates(this.pinyinInput).candidates;
    const maxPage = Math.max(
      0,
      Math.ceil(this.candidates.length / this.pageSize) - 1
    );
    if (this.page > maxPage) this.page = maxPage;
  }

  /**
   * 在选中候选后插入汉字并更新缓冲。
   *
   * @param item - 候选项
   */
  selectCandidate(item: CandidateItem): void {
    const engine = this.options.getEngine();
    if (!engine) return;
    this.insertText(item.word);
    const len = engine.computeMatchedLength(
      item.word,
      this.pinyinInput,
      item.matchedLength
    );
    const remaining = this.pinyinInput.substring(len);
    const nextInput = remaining.startsWith("'")
      ? remaining.substring(1)
      : remaining;
    this.pinyinInput = nextInput;
    this.pinyinCursorPosition = nextInput.length;
    this.recomputeCandidates();
    this.emit();
  }

  /**
   * 设置当前页码（相对偏移）。
   *
   * @param delta - 页码增量
   */
  addPage(delta: number): void {
    this.setPage((p) => Math.max(0, p + delta));
  }

  /**
   * 用函数式更新设置页码。
   *
   * @param updater - 接收旧页码，返回新页码
   */
  setPage(updater: (prev: number) => number): void {
    const next = updater(this.page);
    const maxPage = Math.max(
      0,
      Math.ceil(this.candidates.length / this.pageSize) - 1
    );
    this.page = Math.min(maxPage, Math.max(0, next));
    this.emit();
  }

  /**
   * 在光标处插入文本并同步受控值。
   *
   * @param text - 要上屏的字符串
   */
  insertText(text: string): void {
    const el = this.options.getElement();
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const currentVal = String(this.options.getValue() || "");
    const newValue =
      currentVal.substring(0, start) + text + currentVal.substring(end);

    this.options.onValueChange(newValue);

    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    });
  }

  /**
   * 处理 `beforeinput`（需在 capture 或目标阶段与 `preventDefault` 配合）。
   *
   * @param e - 原生 `InputEvent`
   */
  handleBeforeInput(e: InputEvent): void {
    if (this.options.enabled === false) return;
    if (
      e.inputType === "insertFromPaste" ||
      e.inputType === "insertFromDrop"
    ) {
      return;
    }
    if (
      e.inputType === "insertCompositionText" ||
      e.inputType === "insertFromComposition"
    ) {
      return;
    }
    if (e.inputType !== "insertText" || !e.data) return;
    if (e.data.length !== 1) return;
    const d = e.data;
    if (this.pinyinInput.length > 0) {
      if (d === " ") {
        e.preventDefault();
        return;
      }
      if (isDigitSelectKey(d, this.pageSize)) {
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
  }

  /**
   * 处理 `keydown`（建议在 capture 阶段调用）。
   *
   * @param e - 原生 `KeyboardEvent`
   */
  handleKeyDown(e: KeyboardEvent): void {
    if (this.options.enabled === false) {
      this.options.onKeyDown?.(e);
      return;
    }

    if (this.pinyinInput.length > 0 && isPagingOrControlSymbolKey(e)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (this.pinyinInput.length > 0) {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (this.pinyinCursorPosition > 0) {
          const before = this.pinyinInput.substring(
            0,
            this.pinyinCursorPosition - 1
          );
          const after = this.pinyinInput.substring(this.pinyinCursorPosition);
          this.pinyinInput = before + after;
          this.pinyinCursorPosition -= 1;
          this.recomputeCandidates();
          this.emit();
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.pinyinCursorPosition =
          this.pinyinCursorPosition > 0
            ? this.pinyinCursorPosition - 1
            : this.pinyinInput.length;
        this.emit();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        this.pinyinCursorPosition =
          this.pinyinCursorPosition < this.pinyinInput.length
            ? this.pinyinCursorPosition + 1
            : 0;
        this.emit();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        this.insertText(this.pinyinInput);
        this.pinyinInput = "";
        this.pinyinCursorPosition = 0;
        this.recomputeCandidates();
        this.emit();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        this.pinyinInput = "";
        this.pinyinCursorPosition = 0;
        this.recomputeCandidates();
        this.emit();
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        if (this.candidates.length > 0) {
          this.selectCandidate(this.candidates[this.page * this.pageSize]);
        } else {
          this.insertText(this.pinyinInput);
          this.pinyinInput = "";
          this.pinyinCursorPosition = 0;
          this.recomputeCandidates();
          this.emit();
        }
        return;
      }

      if (isDigitSelectKey(e.key, this.pageSize)) {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const globalIndex = this.page * this.pageSize + index;
        if (globalIndex < this.candidates.length) {
          this.selectCandidate(this.candidates[globalIndex]);
        }
        return;
      }

      if (isNextPageKey(e)) {
        if ((this.page + 1) * this.pageSize < this.candidates.length) {
          this.setPage((p) => p + 1);
        }
        return;
      }

      if (isPrevPageKey(e)) {
        if (this.page > 0) {
          this.setPage((p) => p - 1);
        }
        return;
      }
    }

    if (/^[a-z']$/i.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      const before = this.pinyinInput.substring(0, this.pinyinCursorPosition);
      const after = this.pinyinInput.substring(this.pinyinCursorPosition);
      const ch = e.key.toLowerCase();
      this.pinyinInput = before + ch + after;
      this.pinyinCursorPosition += 1;
      this.recomputeCandidates();
      this.emit();
      return;
    }

    if (this.pinyinInput.length > 0 && isPagingOrControlSymbolKey(e)) return;

    this.options.onKeyDown?.(e);
  }
}
