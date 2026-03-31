/**
 * @file element.ts
 * @description 注册 `<pinyin-ime-editor>` Web Component（Lit）；侧载 `pinyin-ime/pinyin-ime.css` 或依赖 Shadow 内联样式。
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
import { PINYIN_IME_STYLE_TEXT } from "./ime/pinyin-ime-style-text";

/** 词典加载状态 */
type DictionaryState = "idle" | "loading" | "ready" | "error";

/** 自有属性名（不透传到内部 input/textarea） */
const RESERVED_ATTRIBUTES = new Set([
  "value",
  "editor-type",
  "page-size",
  "enabled",
  "class",
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
 */
export class PinyinIMEEditor extends LitElement {
  static override styles = [unsafeCSS(PINYIN_IME_STYLE_TEXT)];

  static override properties = {
    value: { type: String },
    editorType: { type: String, attribute: "editor-type" },
    pageSize: { type: Number, attribute: "page-size" },
    enabled: { type: Boolean },
    popupPosition: { attribute: false },
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
   * 加载默认包内 google 词典。
   *
   * @remarks
   * 先尝试子路径 `import("pinyin-ime/dictionary/google_pinyin_dict")`，以便 Vite 等按 `package.json` exports / alias 解析源码；
   * 失败时再使用 `import.meta.url` 邻接的 `./dictionary/google_pinyin_dict.js`（直连已发布的 `dist/index.js` 时）。
   *
   * @returns 词典对象
   */
  private async _importDefaultGoogleDict(): Promise<PinyinDict> {
    try {
      const m = await import("pinyin-ime/dictionary/google_pinyin_dict");
      return m.dict;
    } catch {
      throw new Error("Failed to import default google dictionary");
    }
  }

  /**
   * 按 `getDictionary`（若设置）否则默认包内 google 加载词典。
   */
  private _loadDictionary(): void {
    const requestSeq = ++this._dictionaryLoadSeq;
    this._dictionaryState = "loading";
    this._customEngine = null;

    const hasGetDictionary = typeof this.getDictionary === "function";

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
      })
      .catch(() => {
        if (requestSeq !== this._dictionaryLoadSeq) return;
        this._customEngine = null;
        this._dictionaryState = "error";
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
    this._loadDictionary();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
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
      this._loadDictionary();
    }
  }

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
      this.requestUpdate();
    });
    this.requestUpdate();
    this._cleanupNativeListeners = this._bindNativeListeners(el);
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
    sourceEl.addEventListener("focus", onFocusLike, true);
    sourceEl.addEventListener("blur", onFocusLike, true);
    sourceEl.addEventListener("focusin", onFocusLike, true);
    sourceEl.addEventListener("focusout", onFocusLike, true);
    sourceEl.addEventListener("select", onSelect, true);
    sourceEl.addEventListener("invalid", onInvalid, true);

    return () => {
      sourceEl.removeEventListener("beforeinput", onBeforeInput, true);
      sourceEl.removeEventListener("keydown", onKeyDown, true);
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
    this.requestUpdate();
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

  override render() {
    const snap = this._controller?.getSnapshot();
    const show =
      snap?.hasActiveComposition &&
      this._position != null &&
      snap.pinyinInput.length > 0;

    const field =
      this.editorType === "textarea"
        ? html`<textarea
            ${ref(this.inputRef)}
            class="pinyin-ime-textarea"
            .value=${this.value}
            @input=${this._onNativeInput}
          ></textarea>`
        : html`<input
            ${ref(this.inputRef)}
            class="pinyin-ime-input"
            .value=${this.value}
            @input=${this._onNativeInput}
          />`;

    return html`
      <div class="pinyin-ime-field-wrap">
        ${field}
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
