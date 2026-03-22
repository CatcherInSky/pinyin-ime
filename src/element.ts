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
import { defaultPinyinEngine, createPinyinEngine } from "./pinyin";
import { loadGooglePinyinDictFromUrl } from "./load-dictionary";
import type { PinyinEngine } from "./pinyin-engine";
import type { CandidateItem } from "./pinyin-engine";
import { PinyinIMEController } from "./pinyin-ime-controller";
import type { PopupPosition } from "./types";
import { PINYIN_IME_STYLE_TEXT } from "./pinyin-ime-style-text";

/**
 * 宿主上可监听的事件：`detail.value` 为新的受控文本。
 */
export type PinyinIMEChangeDetail = { value: string };

/**
 * 拼音 IME 自定义元素；属性 `dictionary-url` 可远程加载词典 JSON。
 */
export class PinyinIMEEditor extends LitElement {
  static override styles = [unsafeCSS(PINYIN_IME_STYLE_TEXT)];

  static override properties = {
    value: { type: String },
    variant: { type: String },
    dictionaryUrl: { type: String, attribute: "dictionary-url" },
    enabled: { type: Boolean },
    pageSize: { type: Number, attribute: "page-size" },
  };

  /** 受控文本 */
  value = "";
  /** `input` 或 `textarea` */
  variant: "input" | "textarea" = "input";
  /** 远程词典 URL（空则使用包内默认引擎） */
  dictionaryUrl = "";
  /** 是否启用 IME 拦截 */
  enabled = true;
  /** 每页候选数 */
  pageSize = 3;

  private readonly inputRef = createRef<HTMLInputElement | HTMLTextAreaElement>();

  private _controller: PinyinIMEController<
    HTMLInputElement | HTMLTextAreaElement
  > | null = null;

  private _unsub: (() => void) | null = null;
  private _urlEngine: PinyinEngine | null = null;
  private _position: PopupPosition | null = null;
  private _onWinResize = (): void => {
    this._syncPosition();
    this.requestUpdate();
  };

  /**
   * @returns 当前用于匹配的引擎
   */
  private _resolvedEngine(): PinyinEngine | null {
    if (this.dictionaryUrl) return this._urlEngine;
    return defaultPinyinEngine;
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
    this._position = { top: rect.top, left: rect.left, width: rect.width };
  }

  /**
   * 异步加载 `dictionaryUrl` 指向的词典。
   */
  private async _reloadDictionary(): Promise<void> {
    if (!this.dictionaryUrl) {
      this._urlEngine = null;
      this._controller?.setOptions({ getEngine: () => this._resolvedEngine() });
      this.requestUpdate();
      return;
    }
    try {
      const d = await loadGooglePinyinDictFromUrl(this.dictionaryUrl);
      this._urlEngine = createPinyinEngine(d);
    } catch {
      this._urlEngine = null;
    }
    this._controller?.setOptions({ getEngine: () => this._resolvedEngine() });
    this.requestUpdate();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("resize", this._onWinResize);
    window.addEventListener("scroll", this._onWinResize, true);
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
    if (changedProperties.has("dictionaryUrl")) {
      void this._reloadDictionary();
    }
  }

  override firstUpdated(): void {
    const el = this.inputRef.value;
    if (!el) return;

    this._controller = new PinyinIMEController<
      HTMLInputElement | HTMLTextAreaElement
    >({
      getValue: () => this.value,
      onValueChange: (v) => {
        this.value = v;
        if (this.inputRef.value) this.inputRef.value.value = v;
        this.dispatchEvent(
          new CustomEvent<PinyinIMEChangeDetail>("pinyin-ime-change", {
            detail: { value: v },
            bubbles: true,
            composed: true,
          })
        );
        this.requestUpdate();
      },
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
      (e: Event) =>
        this._controller?.handleKeyDown(e as KeyboardEvent),
      true
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
        onValueChange: (v) => {
          this.value = v;
          if (this.inputRef.value) this.inputRef.value.value = v;
          this.dispatchEvent(
            new CustomEvent<PinyinIMEChangeDetail>("pinyin-ime-change", {
              detail: { value: v },
              bubbles: true,
              composed: true,
            })
          );
          this.requestUpdate();
        },
        getElement: () => this.inputRef.value ?? null,
        getEngine: () => this._resolvedEngine(),
        enabled: this.enabled,
        pageSize: this.pageSize,
      });
    }

    const inputEl = this.inputRef.value;
    if (inputEl && inputEl.value !== this.value) {
      inputEl.value = this.value;
    }
  }

  /**
   * 选词或翻页时调用控制器。
   *
   * @param item - 候选项
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
      (snap.pinyinInput.length > 0);

    const field =
      this.variant === "textarea"
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
      this.value = t.value;
      this.dispatchEvent(
        new CustomEvent<PinyinIMEChangeDetail>("pinyin-ime-change", {
          detail: { value: t.value },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private _renderPopup() {
    const c = this._controller;
    const position = this._position;
    if (!c || !position) return nothing;
    const {
      pinyinInput,
      pinyinCursorPosition,
      candidates,
      displayCandidates,
      page,
      pageSize,
    } = c.getSnapshot();
    const totalPages = Math.ceil(candidates.length / pageSize) || 1;
    const hasPrev = page > 0;
    const hasNext = (page + 1) * pageSize < candidates.length;

    return html`
      <div
        class="pinyin-ime-popup"
        style="top: ${position.top}px; left: ${position.left}px; width: ${position.width}px; transform: translateY(-100%) translateY(-2px);"
      >
        <div class="pinyin-ime-pinyin-bar">
          ${pinyinInput.substring(0, pinyinCursorPosition)}<span
            class="pinyin-ime-cursor"
          ></span
          >${pinyinInput.substring(pinyinCursorPosition)}
        </div>
        <div class="pinyin-ime-candidate-list">
          ${displayCandidates.length > 0
            ? displayCandidates.map(
                (item, idx) => html`
                  <div
                    class="pinyin-ime-candidate-row"
                    role="option"
                    @mousedown=${(e: MouseEvent) => {
                      e.preventDefault();
                      this._onSelect(item);
                    }}
                  >
                    <span class="pinyin-ime-candidate-index">${idx + 1}.</span>
                    <span class="pinyin-ime-candidate-text">${item.word}</span>
                  </div>
                `
              )
            : html`<div class="pinyin-ime-empty">无候选词</div>`}
        </div>
        ${candidates.length > pageSize
          ? html`
              <div class="pinyin-ime-footer">
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
