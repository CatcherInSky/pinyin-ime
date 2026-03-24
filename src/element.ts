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
import type { GooglePinyinDict } from "../dictionary/google_pinyin_dict";
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
  | Promise<GooglePinyinDict>
  | GooglePinyinDict;

/**
 * 宿主上可监听的事件：`detail.value` 为新的受控文本。
 */
export type PinyinIMEChangeDetail = { value: string };

/**
 * 拼音 IME 自定义元素；通过 `getDictionary` property 自定义词典加载。
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
  private _customEngine: PinyinEngine | null = null;
  private _dictionaryState: DictionaryState = "idle";
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
   * 加载词典：getDictionary 非空则调用（远程），否则动态 import 本地词典。
   */
  private _loadDictionary(): void {
    this._dictionaryState = "loading";
    this._customEngine = null;

    const loadFromRemote = (): Promise<GooglePinyinDict> =>
      Promise.resolve(this.getDictionary!());

    const loadFromLocal = (): Promise<GooglePinyinDict> =>
      import("./dict").then((m) => m.dict);

    const load = this.getDictionary ? loadFromRemote() : loadFromLocal();

    load
      .then((dict) => {
        const engine = createPinyinEngine(dict);
        this._customEngine = engine;
        registerDefaultEngine(engine);
        this._dictionaryState = "ready";
      })
      .catch(() => {
        this._customEngine = null;
        this._dictionaryState = "error";
      })
      .finally(() => {
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

    el.addEventListener(
      "beforeinput",
      (e) => this._controller?.handleBeforeInput(e as InputEvent),
      true
    );
    el.addEventListener(
      "keydown",
      (e: Event) => this._controller?.handleKeyDown(e as KeyboardEvent),
      true
    );
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
