/**
 * @file pinyin-ime-controller.ts
 * @description 与 DOM 解耦的拼音 IME 状态机（原生 `KeyboardEvent` / `InputEvent`），供 Lit 组件 `pinyin-ime-editor` 使用。
 */

import type { CandidateItem } from "../engine/pinyin-engine";
import type { PinyinEngine } from "../engine/pinyin-engine";

/** 默认每页候选数量（与数字键 1–9 一致） */
export const IME_PAGE_SIZE = 5;

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
  /** 选区起点（含） */
  pinyinSelectionStart: number;
  /** 选区终点（不含） */
  pinyinSelectionEnd: number;
  /** 全部候选 */
  candidates: CandidateItem[];
  /** 当前页候选 */
  displayCandidates: CandidateItem[];
  /** 当前页码（从 0 起） */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 当前高亮候选（全局索引） */
  highlightedCandidateIndex: number | null;
  /** 拼音非空时可为 true；是否与弹层同显由宿主结合定位再定 */
  hasActiveComposition: boolean;
  /** `true` 为中文（拼音缓冲）模式；`false` 为英文直输 */
  chineseMode: boolean;
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
 * 是否为物理 Shift 键（左右）。
 *
 * @param code - `KeyboardEvent.code`
 * @returns 是否为 ShiftLeft / ShiftRight
 */
function isShiftPhysicalCode(code: string): boolean {
  return code === "ShiftLeft" || code === "ShiftRight";
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
  private pinyinSelectionStart = 0;
  private pinyinSelectionEnd = 0;
  private candidates: CandidateItem[] = [];
  private page = 0;
  private pageSize = IME_PAGE_SIZE;
  private highlightedCandidateIndex: number | null = null;
  private recomputeRafId: number | null = null;
  /**
   * 失配短路锚点：当某个前缀命中候选为空后，后续仅追加字符且仍以该前缀开头时跳过引擎计算。
   *
   * @remarks
   * 这属于「增量检索 + 失配剪枝（negative cache）」：降低长串无效输入时的重复计算成本。
   * 删除回退到锚点以内或发生选词/提交后会解除该状态。
   */
  private missPrefixLock: string | null = null;

  /** `true`：字母进入拼音缓冲；`false`：交给浏览器默认插入（保留大小写） */
  private chineseMode = true;
  /** 当前仍按下的物理 Shift 键数量（左右各算一个） */
  private shiftPhysicalDown = 0;
  /**
   * 自本轮首个 Shift 按下以来是否出现过非 Shift 的 keydown（用于区分单独点按 Shift 与 Shift+组合键）。
   */
  private shiftGestureOtherKeySeen = false;

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
    this.cancelScheduledRecompute();
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
        pinyinSelectionStart: this.pinyinSelectionStart,
        pinyinSelectionEnd: this.pinyinSelectionEnd,
        candidates: this.candidates,
        displayCandidates,
        page: this.page,
        pageSize: this.pageSize,
        highlightedCandidateIndex: this.highlightedCandidateIndex,
        hasActiveComposition: this.pinyinInput.length > 0,
        chineseMode: this.chineseMode,
      };
    }
    return this.cachedSnapshot;
  }

  /**
   * 触发订阅者更新，并使快照缓存失效。
   */
  private emit(): void {
    this.cachedSnapshot = null;
    for (const l of this.listeners) l();
  }

  /**
   * 归一化并写入拼音选区，同时同步光标到选区末端。
   *
   * @param start - 选区起点
   * @param end - 选区终点
   */
  private setPinyinSelection(start: number, end: number): void {
    const max = this.pinyinInput.length;
    const s = Math.max(0, Math.min(max, start));
    const e = Math.max(0, Math.min(max, end));
    this.pinyinSelectionStart = Math.min(s, e);
    this.pinyinSelectionEnd = Math.max(s, e);
    this.pinyinCursorPosition = e;
  }

  /**
   * 将拼音选区折叠为插入点。
   *
   * @param cursor - 折叠位置
   */
  private collapsePinyinSelection(cursor: number): void {
    this.setPinyinSelection(cursor, cursor);
  }

  /**
   * @returns 当前是否存在非空选区
   */
  private hasPinyinSelection(): boolean {
    return this.pinyinSelectionStart !== this.pinyinSelectionEnd;
  }

  /**
   * 用文本替换当前选区（若无选区则在光标处插入）。
   *
   * @param text - 要插入的文本
   */
  private replacePinyinSelection(text: string): void {
    const before = this.pinyinInput.substring(0, this.pinyinSelectionStart);
    const after = this.pinyinInput.substring(this.pinyinSelectionEnd);
    this.pinyinInput = before + text + after;
    this.collapsePinyinSelection(before.length + text.length);
  }

  /**
   * 删除当前选区并将光标折叠到删除起点。
   *
   * @returns 是否执行了删除
   */
  private deleteSelectedPinyin(): boolean {
    if (!this.hasPinyinSelection()) return false;
    this.replacePinyinSelection("");
    return true;
  }

  /**
   * 使高亮候选与当前候选/页码保持一致。
   */
  private syncHighlightedCandidate(): void {
    if (this.candidates.length === 0) {
      this.highlightedCandidateIndex = null;
      return;
    }
    if (
      this.highlightedCandidateIndex !== null &&
      this.highlightedCandidateIndex >= 0 &&
      this.highlightedCandidateIndex < this.candidates.length
    ) {
      return;
    }
    const firstIndex = this.page * this.pageSize;
    this.highlightedCandidateIndex = Math.min(
      firstIndex,
      this.candidates.length - 1
    );
  }

  /**
   * 取消已排队的帧级重算任务。
   */
  private cancelScheduledRecompute(): void {
    if (this.recomputeRafId !== null) {
      cancelAnimationFrame(this.recomputeRafId);
      this.recomputeRafId = null;
    }
  }

  /**
   * 立即执行候选重算并触发更新；若有排队任务会先取消。
   */
  private flushRecomputeAndEmit(): void {
    this.cancelScheduledRecompute();
    this.recomputeCandidates();
    this.emit();
  }

  /**
   * 将「重算 + 更新」合并到下一帧，避免高频按键时重复同步计算。
   */
  private scheduleRecomputeAndEmit(): void {
    if (this.recomputeRafId !== null) return;
    this.recomputeRafId = requestAnimationFrame(() => {
      this.recomputeRafId = null;
      this.recomputeCandidates();
      this.emit();
    });
  }

  /**
   * 清空「失配短路」状态；用于选词、提交、清空输入等语义边界。
   */
  private clearMissPrefixLock(): void {
    this.missPrefixLock = null;
  }

  /**
   * 判断当前输入是否可直接短路：
   * 若已进入失配状态，且本次是对失配前缀的继续追加，则无需再次调用引擎。
   *
   * @param input - 当前拼音缓冲
   * @returns 是否跳过候选计算
   */
  private shouldSkipByMissPrefixLock(input: string): boolean {
    const lock = this.missPrefixLock;
    if (!lock) return false;
    return input.length > lock.length && input.startsWith(lock);
  }

  /**
   * 候选重算后维护失配锚点。
   *
   * @param input - 当前拼音缓冲
   */
  private updateMissPrefixLock(input: string): void {
    if (input.length === 0) {
      this.clearMissPrefixLock();
      return;
    }
    if (this.candidates.length === 0) {
      if (
        this.missPrefixLock === null ||
        input.length < this.missPrefixLock.length ||
        !input.startsWith(this.missPrefixLock)
      ) {
        this.missPrefixLock = input;
      }
      return;
    }
    this.clearMissPrefixLock();
  }

  /**
   * 基于当前拼音缓冲与引擎计算候选，并应用失配剪枝策略。
   */
  private recomputeCandidates(): void {
    const engine = this.options.getEngine();
    if (!this.pinyinInput || !engine) {
      this.candidates = [];
      this.page = 0;
      this.highlightedCandidateIndex = null;
      this.clearMissPrefixLock();
      return;
    }

    if (this.shouldSkipByMissPrefixLock(this.pinyinInput)) {
      this.candidates = [];
      this.page = 0;
      this.highlightedCandidateIndex = null;
      return;
    }

    this.candidates = engine.getCandidates(this.pinyinInput).candidates;
    const maxPage = Math.max(
      0,
      Math.ceil(this.candidates.length / this.pageSize) - 1
    );
    if (this.page > maxPage) this.page = maxPage;
    this.updateMissPrefixLock(this.pinyinInput);
    this.syncHighlightedCandidate();
  }

  /**
   * 在选中候选后插入汉字并更新缓冲。
   *
   * @param item - 候选项
   */
  selectCandidate(item: CandidateItem): void {
    this.cancelScheduledRecompute();
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
    this.collapsePinyinSelection(nextInput.length);
    this.clearMissPrefixLock();
    this.recomputeCandidates();
    // 选词后若仍有剩余拼音，默认回到第一页并高亮第一个候选。
    this.page = 0;
    this.highlightedCandidateIndex =
      this.candidates.length > 0 ? 0 : null;
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
    this.highlightedCandidateIndex =
      this.candidates.length > 0
        ? Math.min(this.page * this.pageSize, this.candidates.length - 1)
        : null;
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
   * 将当前拼音缓冲按原文上屏并清空缓冲（与 Enter 行为一致）。
   */
  private commitPinyinBufferAsRaw(): void {
    this.insertText(this.pinyinInput);
    this.pinyinInput = "";
    this.collapsePinyinSelection(0);
    this.clearMissPrefixLock();
    this.recomputeCandidates();
    this.emit();
  }

  /**
   * 失焦时重置 Shift 手势跟踪，避免计数与真实键盘状态脱节。
   *
   * @remarks
   * 由宿主在内部 `input`/`textarea` 的 `blur`/`focusout` 上调用。
   */
  resetShiftGestureState(): void {
    this.shiftPhysicalDown = 0;
    this.shiftGestureOtherKeySeen = false;
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
    if (this.chineseMode && /^[a-zA-Z']$/.test(d)) {
      e.preventDefault();
    }
  }

  /**
   * 处理 `keyup`（建议在 capture 阶段调用）；用于单独点按 Shift 切换中/英或提交拼音。
   *
   * @param e - 原生 `KeyboardEvent`
   * @remarks
   * 仅在松开「最后一个」仍按下的物理 Shift 键且本轮未组合其它键时生效；
   * 与 {@link PinyinIMEController.handleKeyDown} 中的 Shift 计数及 `shiftGestureOtherKeySeen` 配合。
   */
  handleKeyUp(e: KeyboardEvent): void {
    if (this.options.enabled === false) return;
    if (!isShiftPhysicalCode(e.code)) return;

    if (this.shiftPhysicalDown === 0) return;
    this.shiftPhysicalDown -= 1;
    if (this.shiftPhysicalDown > 0) return;

    const solo = !this.shiftGestureOtherKeySeen;
    this.shiftGestureOtherKeySeen = false;

    if (!solo) return;

    e.preventDefault();

    if (this.pinyinInput.length > 0) {
      this.commitPinyinBufferAsRaw();
    } else {
      this.chineseMode = !this.chineseMode;
      this.emit();
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

    if (isShiftPhysicalCode(e.code)) {
      if (this.shiftPhysicalDown === 0) {
        this.shiftGestureOtherKeySeen = false;
      }
      this.shiftPhysicalDown++;
      this.options.onKeyDown?.(e);
      return;
    }
    if (this.shiftPhysicalDown > 0) {
      this.shiftGestureOtherKeySeen = true;
    }

    if (this.pinyinInput.length > 0 && isPagingOrControlSymbolKey(e)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (this.pinyinInput.length > 0) {
      if (e.key.toLowerCase() === "a" && e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        this.setPinyinSelection(0, this.pinyinInput.length);
        this.emit();
        return;
      }

      if (!/^[a-z']$/i.test(e.key)) {
        this.flushRecomputeAndEmit();
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        if (this.deleteSelectedPinyin()) {
          this.scheduleRecomputeAndEmit();
          return;
        }
        if (this.pinyinCursorPosition > 0) {
          this.setPinyinSelection(
            this.pinyinCursorPosition - 1,
            this.pinyinCursorPosition
          );
          this.deleteSelectedPinyin();
          this.scheduleRecomputeAndEmit();
        }
        return;
      }

      if (e.key === "Delete") {
        e.preventDefault();
        if (this.deleteSelectedPinyin()) {
          this.scheduleRecomputeAndEmit();
          return;
        }
        if (this.pinyinCursorPosition < this.pinyinInput.length) {
          this.setPinyinSelection(
            this.pinyinCursorPosition,
            this.pinyinCursorPosition + 1
          );
          this.deleteSelectedPinyin();
          this.scheduleRecomputeAndEmit();
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const nextCursor =
          this.pinyinCursorPosition > 0
            ? this.pinyinCursorPosition - 1
            : this.pinyinInput.length;
        if (e.shiftKey) {
          const anchor = this.hasPinyinSelection()
            ? this.pinyinSelectionStart
            : this.pinyinCursorPosition;
          this.setPinyinSelection(anchor, nextCursor);
        } else {
          this.collapsePinyinSelection(nextCursor);
        }
        this.emit();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextCursor =
          this.pinyinCursorPosition < this.pinyinInput.length
            ? this.pinyinCursorPosition + 1
            : 0;
        if (e.shiftKey) {
          const anchor = this.hasPinyinSelection()
            ? this.pinyinSelectionEnd
            : this.pinyinCursorPosition;
          this.setPinyinSelection(anchor, nextCursor);
        } else {
          this.collapsePinyinSelection(nextCursor);
        }
        this.emit();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (this.candidates.length > 0) {
          const current = this.highlightedCandidateIndex ?? this.page * this.pageSize;
          const next = Math.min(this.candidates.length - 1, current + 1);
          this.highlightedCandidateIndex = next;
          this.page = Math.floor(next / this.pageSize);
          this.emit();
        }
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (this.candidates.length > 0) {
          const current = this.highlightedCandidateIndex ?? this.page * this.pageSize;
          const next = Math.max(0, current - 1);
          this.highlightedCandidateIndex = next;
          this.page = Math.floor(next / this.pageSize);
          this.emit();
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        this.commitPinyinBufferAsRaw();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        this.pinyinInput = "";
        this.collapsePinyinSelection(0);
        this.clearMissPrefixLock();
        this.recomputeCandidates();
        this.emit();
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        if (this.candidates.length > 0) {
          const index = this.highlightedCandidateIndex ?? this.page * this.pageSize;
          const clamped = Math.min(Math.max(0, index), this.candidates.length - 1);
          this.selectCandidate(this.candidates[clamped]);
        } else {
          this.insertText(this.pinyinInput);
          this.pinyinInput = "";
          this.collapsePinyinSelection(0);
          this.clearMissPrefixLock();
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

    if (
      this.chineseMode &&
      /^[a-z']$/i.test(e.key) &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey
    ) {
      e.preventDefault();
      e.stopPropagation();
      const ch = e.key.toLowerCase();
      this.replacePinyinSelection(ch);
      this.scheduleRecomputeAndEmit();
      return;
    }

    if (this.pinyinInput.length > 0 && isPagingOrControlSymbolKey(e)) return;

    this.options.onKeyDown?.(e);
  }
}
