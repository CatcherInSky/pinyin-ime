/**
 * @file element.ts
 * @description 注册 `<pinyin-ime-editor>` Web Component（Lit）；侧载 `pinyin-ime/pinyin-ime.css` 或依赖 Shadow 内联样式。词典首载统一推迟（`queueMicrotask` + idle 与内部 `focusin` 竞速；`getDictionary` 变更时立即加载）。
 */
import {
  LitElement,
  html,
  unsafeCSS,
  nothing,
  type PropertyValues,
} from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { createPinyinEngine } from "./engine/pinyin";
import { registerDefaultEngine } from "./dictionary/registry";
import type { PinyinDict } from "./types/dist";
import type { PinyinEngine } from "./engine/pinyin-engine";
import type { CandidateItem } from "./engine/pinyin-engine";
import { PinyinIMEController } from "./ime/pinyin-ime-controller";
import type { PopupPlacement, PopupPosition } from "./lib/types";
import {
  parseEditorTypeFromAttribute,
  parseEnabledFromAttribute,
  parsePageSizeFromAttribute,
  parsePopupPlacementFromAttribute,
  popupPlacementToAttribute,
} from "./lib/pinyin-ime-editor-attr-parsers";

/** `tsup` / Vite 在构建时内联 `NODE_ENV`；本声明仅供类型检查。 */
declare const process: { env: { NODE_ENV?: string } };
import { PINYIN_IME_STYLE_TEXT } from "./ime/pinyin-ime-style-text";

/** 词典加载状态 */
type DictionaryState = "idle" | "loading" | "ready" | "error";

/** 默认包内 google 词典的共享 Promise（多实例共用同一次 dynamic import） */
let defaultGoogleDictPromise: Promise<PinyinDict> | null = null;

/**
 * @returns 包内 google 词典；全页共享同一 Promise。
 */
function getSharedDefaultGoogleDict(): Promise<PinyinDict> {
  return (defaultGoogleDictPromise ??= (async () => {
    try {
      const m = await import("pinyin-ime/dictionary/google_pinyin_dict");
      return m.dict;
    } catch {
      throw new Error("Failed to import default google dictionary");
    }
  })());
}

/**
 * 开发模式下输出词典加载轨迹（`idle` / `focusin` / `property:getDictionary` 等）；生产构建中由打包器内联为静默。
 *
 * @param args - 传给 `console.info` 的参数
 */
function dictionaryLoadDevLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === "production") return;
  console.info("[pinyin-ime-editor dictionary]", ...args);
}

/** 自有属性名（不透传到内部 input/textarea） */
const RESERVED_ATTRIBUTES = new Set([
  "value",
  "editor-type",
  "page-size",
  "enabled",
  "class",
  "dictionary-load",
  "popup-position",
]);

/**
 * getDictionary 函数类型：返回词典或 Promise；组件初始化时调用，resolve 前候选框显示 loading。
 */
export type GetDictionaryFn = () =>
  | Promise<PinyinDict>
  | PinyinDict;

/**
 * 宿主上可监听的事件：`detail.value` 为新的受控文本。
 */
export type PinyinIMEChangeDetail = { value: string };

/**
 * 拼音 IME 自定义元素。
 *
 * @remarks
 * 词典：`getDictionary`（若设置）→ 否则默认包内 `google_pinyin_dict`。自定义（dota2、远程、本地模块等）请用 `getDictionary`。
 * **首次加载**统一推迟：`connectedCallback` 内 `queueMicrotask` 再排队 `requestIdleCallback`（`timeout: 2000`，不支持时用 `setTimeout(0)`），与内部输入框 **`focusin`（捕获）** 竞速；先发生者触发加载。`getDictionary` 在 Lit `willUpdate` 中变更时会取消上述等待并立即 `_loadDictionary`，便于与 React `useLayoutEffect` / Vue `onBeforeMount` 等同宏任务内赋值对齐。
 * 宿主上的 `dictionary-load` 为**保留名**（不透传到内部 input），组件**不再解析**该属性。
 */
export class PinyinIMEEditor extends LitElement {
  static override styles = [unsafeCSS(PINYIN_IME_STYLE_TEXT)];

  static override properties = {
    value: {
      type: String,
      converter: {
        fromAttribute(v: string | null): string {
          return v ?? "";
        },
      },
    },
    editorType: {
      type: String,
      attribute: "editor-type",
      converter: {
        fromAttribute(value: string | null): "input" | "textarea" {
          return parseEditorTypeFromAttribute(value);
        },
      },
    },
    pageSize: {
      type: Number,
      attribute: "page-size",
      converter: {
        fromAttribute(value: string | null): number {
          return parsePageSizeFromAttribute(value);
        },
      },
    },
    enabled: {
      type: Boolean,
      converter: {
        fromAttribute(value: string | null): boolean {
          return parseEnabledFromAttribute(value);
        },
        toAttribute(value: boolean): string | null {
          return value ? null : "false";
        },
      },
      reflect: true,
    },
    popupPosition: {
      type: String,
      attribute: "popup-position",
      converter: {
        fromAttribute(value: string | null): PopupPlacement {
          return parsePopupPlacementFromAttribute(value);
        },
        toAttribute(value: PopupPlacement): string {
          return popupPlacementToAttribute(value);
        },
      },
    },
    getDictionary: { attribute: false },
  };

  /** 受控文本 */
  declare value: string;
  /** `input` 或 `textarea` */
  declare editorType: "input" | "textarea";
  /** 每页候选数，默认 5 */
  declare pageSize: number;
  /** 是否启用 IME 拦截 */
  declare enabled: boolean;
  /** 候选框相对输入框的方位 */
  declare popupPosition: PopupPlacement;
  /** 词典加载函数，返回词典或 Promise；初始化时执行，resolve 前候选框 loading */
  declare getDictionary?: GetDictionaryFn;

  private readonly inputRef =
    createRef<HTMLInputElement | HTMLTextAreaElement>();

  private _controller: PinyinIMEController<
    HTMLInputElement | HTMLTextAreaElement
  > | null = null;

  private _unsub: (() => void) | null = null;
  private _cleanupNativeListeners: (() => void) | null = null;
  private _customEngine: PinyinEngine | null = null;
  private _dictionaryState: DictionaryState = "idle";
  /** 词典加载请求序号（递增）；仅接受最后一次请求结果。 */
  private _dictionaryLoadSeq = 0;
  private _position: PopupPosition | null = null;
  /** `requestIdleCallback` 句柄，或 `setTimeout` 兜底 */
  private _idleCallbackHandle: number | null = null;
  /** 当前 idle 句柄是否为 RIC（用于正确取消） */
  private _idleCallbackIsRic = false;
  /** 移除推迟首载模式下内部 input 的 `focusin` 监听 */
  private _deferredFocusCleanup: (() => void) | null = null;
  private _onWinResize = (): void => {
    this._syncPosition();
    this.requestUpdate();
  };

  constructor() {
    super();
    this.value = "";
    this.editorType = "input";
    this.enabled = true;
    this.pageSize = 5;
    this.popupPosition = "top";
  }

  /**
   * 将宿主的 `focus()` 代理到内部输入节点。
   *
   * @param options - 原生聚焦选项
   */
  override focus(options?: FocusOptions): void {
    const target = this.inputRef.value;
    if (target) {
      target.focus(options);
      return;
    }
    super.focus(options);
  }

  /**
   * 将宿主的 `blur()` 代理到内部输入节点。
   */
  override blur(): void {
    const target = this.inputRef.value;
    if (target) {
      target.blur();
      return;
    }
    super.blur();
  }

  /**
   * @returns 当前用于匹配的引擎
   */
  private _resolvedEngine(): PinyinEngine | null {
    return this._customEngine;
  }

  /**
   * 根据输入框几何更新弹层锚点。
   */
  private _syncPosition(): void {
    const el = this.inputRef.value;
    const snap = this._controller?.getSnapshot();
    if (!el || !snap?.hasActiveComposition) {
      this._position = null;
      return;
    }
    const rect = el.getBoundingClientRect();
    this._position = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }

  /**
   * 计算 popup 内联定位样式。
   *
   * @param position - 输入框几何快照
   * @returns style 字符串
   */
  private _popupStyle(position: PopupPosition): string {
    const gap = 2;
    if (this.popupPosition === "bottom") {
      return `top: ${position.top + position.height + gap}px; left: ${position.left}px; width: ${position.width}px;`;
    }
    if (this.popupPosition === "left") {
      return `top: ${position.top}px; left: ${position.left - gap}px; width: ${position.width}px; transform: translateX(-100%);`;
    }
    if (this.popupPosition === "right") {
      return `top: ${position.top}px; left: ${position.left + position.width + gap}px; width: ${position.width}px;`;
    }
    return `top: ${position.top}px; left: ${position.left}px; width: ${position.width}px; transform: translateY(-100%) translateY(-2px);`;
  }

  /**
   * 从宿主收集需透传到内部 input/textarea 的 attributes。
   */
  private _getPassThroughAttributes(): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (let i = 0; i < this.attributes.length; i++) {
      const a = this.attributes[i];
      if (!RESERVED_ATTRIBUTES.has(a.name)) {
        attrs[a.name] = a.value;
      }
    }
    return attrs;
  }

  /**
   * 加载默认包内 google 词典（模块级 Promise 单例）。
   *
   * @returns 词典对象
   */
  private _importDefaultGoogleDict(): Promise<PinyinDict> {
    return getSharedDefaultGoogleDict();
  }

  /**
   * 取消推迟首载竞态：`requestIdleCallback` / `setTimeout` 与内部 `focusin`。
   */
  private _cancelDeferredDictionaryWaiters(): void {
    if (this._idleCallbackHandle !== null) {
      if (this._idleCallbackIsRic && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(this._idleCallbackHandle);
      } else {
        clearTimeout(this._idleCallbackHandle);
      }
      this._idleCallbackHandle = null;
    }
    this._deferredFocusCleanup?.();
    this._deferredFocusCleanup = null;
  }

  /**
   * 在当前可排队空闲回调时注册 RIC / `setTimeout(0)`；已存在句柄或处于 `loading`/`ready` 时忽略。
   */
  private _scheduleDeferredIdleCallback(): void {
    if (
      this._dictionaryState === "loading" ||
      this._dictionaryState === "ready"
    ) {
      dictionaryLoadDevLog("scheduleDeferredIdle skipped", {
        state: this._dictionaryState,
      });
      return;
    }
    if (this._idleCallbackHandle !== null) {
      dictionaryLoadDevLog("scheduleDeferredIdle skipped", {
        reason: "idle-handle-already-set",
      });
      return;
    }
    const ric = globalThis.requestIdleCallback;
    if (typeof ric === "function") {
      this._idleCallbackIsRic = true;
      this._idleCallbackHandle = ric.call(
        globalThis,
        () => {
          this._idleCallbackHandle = null;
          this._tryKickoffDeferredDictionaryLoad("idle");
        },
        { timeout: 2000 }
      );
      dictionaryLoadDevLog("scheduled requestIdleCallback (unified-defer)", {
        timeoutMs: 2000,
      });
    } else {
      this._idleCallbackIsRic = false;
      this._idleCallbackHandle = window.setTimeout(() => {
        this._idleCallbackHandle = null;
        this._tryKickoffDeferredDictionaryLoad("idle");
      }, 0);
      dictionaryLoadDevLog("scheduled setTimeout(0) fallback (unified-defer)");
    }
  }

  /**
   * 推迟首载路径下由 idle 或 `focusin` 触发：取消等待器并 `_loadDictionary`。
   * `loading` / `ready` 时忽略，避免与进行中的请求重叠；`error` 时允许再次尝试（如补设 `getDictionary` 后聚焦）。
   *
   * @param source - `idle` 为 RIC / `setTimeout`；`focusin` 为内部输入框捕获阶段聚焦
   */
  private _tryKickoffDeferredDictionaryLoad(
    source: "idle" | "focusin"
  ): void {
    if (!this.isConnected) {
      dictionaryLoadDevLog("deferred kickoff skipped", {
        source,
        reason: "disconnected",
      });
      return;
    }
    if (this._dictionaryState === "loading") {
      dictionaryLoadDevLog("deferred kickoff skipped", {
        source,
        reason: "already-loading",
      });
      return;
    }
    if (this._dictionaryState === "ready") {
      return;
    }
    dictionaryLoadDevLog("deferred kickoff → _loadDictionary", {
      source,
      stateBefore: this._dictionaryState,
    });
    this._cancelDeferredDictionaryWaiters();
    this._loadDictionary(`deferred:${source}`);
  }

  /**
   * 在内部输入节点上监听 `focusin`（capture），参与推迟首载竞速。
   *
   * @param el - 内部 `input` / `textarea`
   */
  private _attachDeferredFocusKickoff(
    el: HTMLInputElement | HTMLTextAreaElement
  ): void {
    if (this._dictionaryState === "ready") return;
    this._deferredFocusCleanup?.();
    const handler = (): void => {
      this._tryKickoffDeferredDictionaryLoad("focusin");
    };
    el.addEventListener("focusin", handler, true);
    this._deferredFocusCleanup = (): void => {
      el.removeEventListener("focusin", handler, true);
    };
  }

  /**
   * 按 `getDictionary`（若设置）否则默认包内 google 加载词典。
   *
   * @param trigger - 便于调试日志区分调用路径
   */
  private _loadDictionary(trigger: string): void {
    const requestSeq = ++this._dictionaryLoadSeq;
    this._dictionaryState = "loading";
    this._customEngine = null;

    const hasGetDictionary = typeof this.getDictionary === "function";

    dictionaryLoadDevLog("_loadDictionary start", {
      trigger,
      requestSeq,
      firstLoadPolicy: "unified-defer",
      hasGetDictionary,
      dictSource: hasGetDictionary ? "getDictionary" : "default-google",
    });

    const load: Promise<PinyinDict> =
      hasGetDictionary
        ? Promise.resolve(this.getDictionary!())
        : this._importDefaultGoogleDict();

    load
      .then((dict) => {
        if (requestSeq !== this._dictionaryLoadSeq) return;
        const engine = createPinyinEngine(dict);
        this._customEngine = engine;
        registerDefaultEngine(engine);
        this._dictionaryState = "ready";
        dictionaryLoadDevLog("_loadDictionary ok", {
          trigger,
          requestSeq,
          dictKeyCount: Object.keys(dict).length,
        });
      })
      .catch(() => {
        if (requestSeq !== this._dictionaryLoadSeq) return;
        this._customEngine = null;
        this._dictionaryState = "error";
        dictionaryLoadDevLog("_loadDictionary error", { trigger, requestSeq });
      })
      .finally(() => {
        if (requestSeq !== this._dictionaryLoadSeq) return;
        this._controller?.setOptions({ getEngine: () => this._resolvedEngine() });
        this.requestUpdate();
      });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("resize", this._onWinResize);
    window.addEventListener("scroll", this._onWinResize, true);
    dictionaryLoadDevLog("connectedCallback", {
      firstLoadPolicy: "unified-defer",
      phase: "queueMicrotask-then-schedule-idle",
    });
    queueMicrotask(() => {
      if (!this.isConnected) return;
      dictionaryLoadDevLog("connectedCallback microtask", {
        phase: "schedule-idle-or-await-focusin",
      });
      this._scheduleDeferredIdleCallback();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cancelDeferredDictionaryWaiters();
    this._cleanupNativeListeners?.();
    this._cleanupNativeListeners = null;
    this._unsub?.();
    this._unsub = null;
    this._controller = null;
    window.removeEventListener("resize", this._onWinResize);
    window.removeEventListener("scroll", this._onWinResize, true);
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("getDictionary")) {
      this._cancelDeferredDictionaryWaiters();
      this._loadDictionary("property:getDictionary");
    }
  }

  /**
   * 首屏渲染后挂载控制器与原生监听；末尾用 `queueMicrotask` 再请求一次更新（与控制器订阅里推迟的 `requestUpdate` 一致，避免 Lit change-in-update）。
   */
  override firstUpdated(): void {
    const el = this.inputRef.value;
    if (!el) return;

    this._controller = new PinyinIMEController<
      HTMLInputElement | HTMLTextAreaElement
    >({
      getValue: () => this.value,
      onValueChange: (v) => this._onValueChange(v),
      getElement: () => this.inputRef.value ?? null,
      getEngine: () => this._resolvedEngine(),
      enabled: this.enabled,
      pageSize: this.pageSize,
    });

    this._unsub = this._controller.subscribe(() => {
      this._syncPosition();
      queueMicrotask(() => this.requestUpdate());
    });
    queueMicrotask(() => this.requestUpdate());
    this._cleanupNativeListeners = this._bindNativeListeners(el);
    if (this._dictionaryState !== "ready") {
      this._attachDeferredFocusKickoff(el);
    }
  }

  /**
   * 将内部输入节点的关键事件桥接到宿主，供框架在 `<pinyin-ime-editor>` 上监听。
   *
   * @param sourceEl - 当前激活的内部输入节点
   * @returns 解绑函数
   */
  private _bindNativeListeners(
    sourceEl: HTMLInputElement | HTMLTextAreaElement
  ): () => void {
    const onBeforeInput = (e: Event): void => {
      this._controller?.handleBeforeInput(e as InputEvent);
    };
    const onKeyDown = (e: Event): void => {
      this._controller?.handleKeyDown(e as KeyboardEvent);
    };
    const onKeyUp = (e: Event): void => {
      this._controller?.handleKeyUp(e as KeyboardEvent);
    };

    const onFocusLike = (e: Event): void => {
      this._forwardFocusEvent(e as FocusEvent);
    };
    const onSelect = (e: Event): void => {
      this._forwardSimpleEvent(e, "select", false);
    };
    const onInvalid = (e: Event): void => {
      this._forwardSimpleEvent(e, "invalid", true);
    };

    sourceEl.addEventListener("beforeinput", onBeforeInput, true);
    sourceEl.addEventListener("keydown", onKeyDown, true);
    sourceEl.addEventListener("keyup", onKeyUp, true);
    sourceEl.addEventListener("focus", onFocusLike, true);
    sourceEl.addEventListener("blur", onFocusLike, true);
    sourceEl.addEventListener("focusin", onFocusLike, true);
    sourceEl.addEventListener("focusout", onFocusLike, true);
    sourceEl.addEventListener("select", onSelect, true);
    sourceEl.addEventListener("invalid", onInvalid, true);

    return () => {
      sourceEl.removeEventListener("beforeinput", onBeforeInput, true);
      sourceEl.removeEventListener("keydown", onKeyDown, true);
      sourceEl.removeEventListener("keyup", onKeyUp, true);
      sourceEl.removeEventListener("focus", onFocusLike, true);
      sourceEl.removeEventListener("blur", onFocusLike, true);
      sourceEl.removeEventListener("focusin", onFocusLike, true);
      sourceEl.removeEventListener("focusout", onFocusLike, true);
      sourceEl.removeEventListener("select", onSelect, true);
      sourceEl.removeEventListener("invalid", onInvalid, true);
    };
  }

  /**
   * 转发来自内部输入节点的焦点事件到宿主元素。
   *
   * @param e - 内部输入节点触发的焦点事件
   */
  private _forwardFocusEvent(e: FocusEvent): void {
    if (e.target !== this.inputRef.value) return;
    if (e.type === "blur" || e.type === "focusout") {
      this._controller?.resetShiftGestureState();
    }
    const forwarded = new FocusEvent(e.type, {
      bubbles: true,
      composed: true,
      cancelable: e.cancelable,
      relatedTarget: e.relatedTarget,
    });
    const accepted = this.dispatchEvent(forwarded);
    if (!accepted && e.cancelable) {
      e.preventDefault();
    }
  }

  /**
   * 转发来自内部输入节点的通用事件到宿主元素。
   *
   * @param e - 内部输入节点触发的事件
   * @param type - 事件名
   * @param cancelable - 是否允许取消
   */
  private _forwardSimpleEvent(
    e: Event,
    type: "select" | "invalid",
    cancelable: boolean
  ): void {
    if (e.target !== this.inputRef.value) return;
    const forwarded = new Event(type, {
      bubbles: true,
      composed: true,
      cancelable,
    });
    const accepted = this.dispatchEvent(forwarded);
    if (!accepted && cancelable && e.cancelable) {
      e.preventDefault();
    }
  }

  private _onValueChange(v: string): void {
    this.value = v;
    const el = this.inputRef.value;
    if (el) el.value = v;
    this.dispatchEvent(
      new CustomEvent<PinyinIMEChangeDetail>("change", {
        detail: { value: v },
        bubbles: true,
        composed: true,
      })
    );
  }

  override updated(changedProperties: PropertyValues<this>): void {
    if (
      changedProperties.has("enabled") ||
      changedProperties.has("pageSize") ||
      changedProperties.has("value")
    ) {
      this._controller?.setOptions({
        getValue: () => this.value,
        onValueChange: (v) => this._onValueChange(v),
        getElement: () => this.inputRef.value ?? null,
        getEngine: () => this._resolvedEngine(),
        enabled: this.enabled,
        pageSize: this.pageSize,
      });
    }

    const inputEl = this.inputRef.value;
    if (inputEl) {
      if (inputEl.value !== this.value) {
        inputEl.value = this.value;
      }
      const passThrough = this._getPassThroughAttributes();
      for (const [name, value] of Object.entries(passThrough)) {
        inputEl.setAttribute(name, value);
      }
    }
  }

  /**
   * 选词或翻页时调用控制器。
   */
  private _onSelect(item: CandidateItem): void {
    this._controller?.selectCandidate(item);
  }

  /**
   * @param delta - 页码增量
   */
  private _onPageDelta(delta: number): void {
    this._controller?.addPage(delta);
  }

  /**
   * 供读屏与 `title` 使用的中/英文模式说明。
   *
   * @param chineseMode - 是否为中文（拼音）模式
   * @returns 简短说明句
   */
  private _modeDescription(chineseMode: boolean): string {
    return chineseMode
      ? "中文输入模式，按 Shift 切换英文"
      : "英文输入模式，按 Shift 切换中文";
  }

  /**
   * 渲染内部输入框、中/英文模式角标（仅在 {@link PinyinIMEEditor.enabled} 为真时）及拼音候选弹层。
   */
  override render() {
    const snap = this._controller?.getSnapshot();
    const show =
      snap?.hasActiveComposition &&
      this._position != null &&
      snap.pinyinInput.length > 0;

    const chineseMode = snap?.chineseMode !== false;
    const modeHint = this.enabled
      ? this._modeDescription(chineseMode)
      : undefined;
    const fieldModeBadgeClass = this.enabled
      ? " pinyin-ime-field--with-mode-badge"
      : "";

    const field =
      this.editorType === "textarea"
        ? html`<textarea
            ${ref(this.inputRef)}
            class=${`pinyin-ime-textarea${fieldModeBadgeClass}`}
            .value=${this.value}
            aria-label=${modeHint}
            title=${modeHint}
            @input=${this._onNativeInput}
          ></textarea>`
        : html`<input
            ${ref(this.inputRef)}
            class=${`pinyin-ime-input${fieldModeBadgeClass}`}
            .value=${this.value}
            aria-label=${modeHint}
            title=${modeHint}
            @input=${this._onNativeInput}
          />`;

    return html`
      <div class="pinyin-ime-field-wrap">
        ${field}
        ${this.enabled
          ? html`<span
              part="mode-badge"
              class="pinyin-ime-mode-badge"
              aria-hidden="true"
              >${chineseMode ? "中" : "A"}</span
            >`
          : nothing}
        ${show ? this._renderPopup() : nothing}
      </div>
    `;
  }

  private _onNativeInput(e: Event): void {
    const t = e.target as HTMLInputElement;
    if (t.value !== this.value) {
      this._onValueChange(t.value);
    }
  }

  /**
   * 阻止候选框鼠标按下导致输入框失焦。
   *
   * @param e - 鼠标事件
   */
  private _onPopupMouseDown(e: MouseEvent): void {
    e.preventDefault();
  }

  private _renderPopup() {
    const c = this._controller;
    const position = this._position;
    if (!c || !position) return nothing;

    const loading = this._dictionaryState === "loading";
    const {
      pinyinInput,
      pinyinCursorPosition,
      pinyinSelectionStart,
      pinyinSelectionEnd,
      candidates,
      displayCandidates,
      page,
      pageSize,
      highlightedCandidateIndex,
    } = c.getSnapshot();
    const totalPages = Math.ceil(candidates.length / pageSize) || 1;
    const hasPrev = page > 0;
    const hasNext = (page + 1) * pageSize < candidates.length;

    return html`
      <div
        part="popup"
        class="pinyin-ime-popup"
        style=${this._popupStyle(position)}
        @mousedown=${this._onPopupMouseDown}
      >
        <div part="pinyin-bar" class="pinyin-ime-pinyin-bar">
          ${pinyinSelectionStart !== pinyinSelectionEnd
            ? html`${pinyinInput.substring(0, pinyinSelectionStart)}<span
                  part="pinyin-selection"
                  class="pinyin-ime-pinyin-selection"
                  >${pinyinInput.substring(
                    pinyinSelectionStart,
                    pinyinSelectionEnd
                  )}</span
                >${pinyinInput.substring(pinyinSelectionEnd)}`
            : html`${pinyinInput.substring(0, pinyinCursorPosition)}<span
                  part="cursor"
                  class="pinyin-ime-cursor"
                ></span
                >${pinyinInput.substring(pinyinCursorPosition)}`}
        </div>
        <div part="candidate-list" class="pinyin-ime-candidate-list">
          ${loading
            ? html`<div part="loading" class="pinyin-ime-loading"
                >加载中…</div
              >`
            : displayCandidates.length > 0
              ? displayCandidates.map((item, idx) => {
                  const globalIndex = page * pageSize + idx;
                  const isActive = highlightedCandidateIndex === globalIndex;
                  return html`
                    <div
                      part=${isActive
                        ? "candidate-row candidate-row-active"
                        : "candidate-row"}
                      class="pinyin-ime-candidate-row ${isActive
                        ? "pinyin-ime-candidate-row--active"
                        : ""}"
                      role="option"
                      aria-selected=${isActive ? "true" : "false"}
                      @mousedown=${(e: MouseEvent) => {
                        e.preventDefault();
                        this._onSelect(item);
                      }}
                    >
                      <span part="candidate-index" class="pinyin-ime-candidate-index"
                        >${idx + 1}.</span
                      >
                      <span part="candidate-text" class="pinyin-ime-candidate-text"
                        >${item.word}</span
                      >
                    </div>
                  `;
                })
              : html`<div part="empty" class="pinyin-ime-empty">无候选词</div>`}
        </div>
        ${!loading && candidates.length > pageSize
          ? html`
              <div part="footer" class="pinyin-ime-footer">
                <div class="pinyin-ime-footer-nav">
                  <span
                    class="pinyin-ime-page-link ${!hasPrev
                      ? "pinyin-ime-page-link--disabled"
                      : ""}"
                    @mousedown=${(e: MouseEvent) => {
                      e.preventDefault();
                      if (hasPrev) this._onPageDelta(-1);
                    }}
                    >&lt; (-)</span
                  >
                  <span
                    class="pinyin-ime-page-link ${!hasNext
                      ? "pinyin-ime-page-link--disabled"
                      : ""}"
                    @mousedown=${(e: MouseEvent) => {
                      e.preventDefault();
                      if (hasNext) this._onPageDelta(1);
                    }}
                    >(=) &gt;</span
                  >
                </div>
                <span>${page + 1} / ${totalPages}</span>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

if (!customElements.get("pinyin-ime-editor")) {
  customElements.define("pinyin-ime-editor", PinyinIMEEditor);
}
