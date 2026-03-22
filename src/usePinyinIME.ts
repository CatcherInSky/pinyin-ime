/**
 * @file usePinyinIME.ts
 * @description 拼音输入法状态管理 Hook（无 i18n / 业务耦合）
 */
import * as React from "react";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import type { GooglePinyinDict } from "./google_pinyin_dict";
import {
  createPinyinEngine,
  type PinyinEngine,
} from "./pinyin-engine";
import { defaultPinyinEngine } from "./pinyin";
import { loadGooglePinyinDictFromUrl } from "./load-dictionary";
import type { CandidateItem } from "./pinyin-engine";
import { PinyinIMEController } from "./pinyin-ime-controller";
import type { PopupPosition } from "./types";

/** 默认每页候选数量（与数字键 1–3 的原始设计一致） */
export const PAGE_SIZE = 3;

export type { PopupPosition };

/**
 * 远程词典加载状态（仅在使用 `dictionaryUrl` 时有意义）。
 */
export type DictionaryLoadState = "idle" | "loading" | "ready" | "error";

/**
 * 词典来源优先级（后者仅在前者未提供时生效）：
 *
 * 1. {@link UsePinyinIMEOptions.getEngine}
 * 2. {@link UsePinyinIMEOptions.dictionary}（内存中的 {@link GooglePinyinDict}）
 * 3. {@link UsePinyinIMEOptions.dictionaryUrl}（`fetch` JSON）
 * 4. 包内嵌默认词典 {@link defaultPinyinEngine}
 */
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
  /**
   * 完全自定义引擎（最高优先级）。
   */
  getEngine?: () => PinyinEngine | null;
  /**
   * 直接使用已解析的词典对象构建引擎。
   */
  dictionary?: GooglePinyinDict;
  /**
   * 从该 URL `fetch` JSON 词典（需 CORS）；加载完成前候选为空。
   */
  dictionaryUrl?: string;
  /**
   * 传给 `fetch(dictionaryUrl, init)` 的选项。
   */
  dictionaryFetchInit?: RequestInit;
  /**
   * 远程词典成功加载并创建引擎后调用。
   */
  onDictionaryLoaded?: () => void;
  /**
   * 远程词典加载或解析失败时调用。
   */
  onDictionaryLoadError?: (error: unknown) => void;
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
  /**
   * 使用 `dictionaryUrl` 时的加载状态；否则为 `idle`。
   */
  dictionaryLoadState: DictionaryLoadState;
  /** 最近一次远程加载错误 */
  dictionaryError: Error | null;
}

/**
 * 拼音输入法状态管理 Hook。
 *
 * @remarks
 * 支持递进选词、拼音串内光标、数字选词、翻页与防输入泄漏。
 * 词典来源见 {@link UsePinyinIMEOptions} 优先级说明。
 *
 * @param value - 受控值
 * @param onChange - 值变化回调
 * @param onKeyDown - 可选，非 IME 拦截路径上的键盘回调（参数为 React 合成事件，与 `nativeEvent` 共享同一底层事件）
 * @param options - 可选：启用、分页、词典
 * @returns IME 状态与事件处理器
 */
export function usePinyinIME<T extends HTMLInputElement | HTMLTextAreaElement>(
  value: string | undefined,
  onChange: ((value: string) => void) | undefined,
  onKeyDown: React.KeyboardEventHandler<T> | undefined,
  options?: UsePinyinIMEOptions
): UsePinyinIMEReturn<T> {
  const enabled = options?.enabled !== false;
  const pageSizeOpt = options?.pageSize ?? PAGE_SIZE;

  const [position, setPosition] = useState<PopupPosition | null>(null);
  const elementRef = useRef<T>(null);
  const onKeyDownRef = useRef(onKeyDown);
  onKeyDownRef.current = onKeyDown;

  /** 避免内联 `onChange` 导致 `useLayoutEffect` 每帧执行并触发 `emit` 死循环 */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [urlEngine, setUrlEngine] = useState<PinyinEngine | null>(null);
  const [dictionaryLoadState, setDictionaryLoadState] =
    useState<DictionaryLoadState>("idle");
  const [dictionaryError, setDictionaryError] = useState<Error | null>(null);

  const inlineEngine = useMemo(() => {
    if (!options?.dictionary) return null;
    return createPinyinEngine(options.dictionary);
  }, [options?.dictionary]);

  const onDictionaryLoadedRef = useRef(options?.onDictionaryLoaded);
  const onDictionaryLoadErrorRef = useRef(options?.onDictionaryLoadError);
  onDictionaryLoadedRef.current = options?.onDictionaryLoaded;
  onDictionaryLoadErrorRef.current = options?.onDictionaryLoadError;

  useEffect(() => {
    const url = options?.dictionaryUrl;
    if (!url) {
      setUrlEngine(null);
      setDictionaryLoadState("idle");
      setDictionaryError(null);
      return;
    }
    let cancelled = false;
    setDictionaryLoadState("loading");
    setDictionaryError(null);
    loadGooglePinyinDictFromUrl(url, options.dictionaryFetchInit)
      .then((d) => {
        if (cancelled) return;
        setUrlEngine(createPinyinEngine(d));
        setDictionaryLoadState("ready");
        onDictionaryLoadedRef.current?.();
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setUrlEngine(null);
        setDictionaryLoadState("error");
        const err = e instanceof Error ? e : new Error(String(e));
        setDictionaryError(err);
        onDictionaryLoadErrorRef.current?.(e);
      });
    return () => {
      cancelled = true;
    };
  }, [options?.dictionaryUrl, options?.dictionaryFetchInit]);

  const resolvedEngine = useMemo((): PinyinEngine | null => {
    if (options?.getEngine) return options.getEngine();
    if (inlineEngine) return inlineEngine;
    if (options?.dictionaryUrl) return urlEngine;
    return defaultPinyinEngine;
  }, [
    options?.getEngine,
    options?.dictionaryUrl,
    inlineEngine,
    urlEngine,
  ]);

  const controllerRef = useRef<PinyinIMEController<T> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new PinyinIMEController<T>({
      getValue: () => "",
      onValueChange: () => {},
      getElement: () => elementRef.current,
      getEngine: () => null,
      enabled: true,
      pageSize: pageSizeOpt,
      onKeyDown: (ev: KeyboardEvent) => {
        onKeyDownRef.current?.(ev as unknown as React.KeyboardEvent<T>);
      },
    });
  }

  useLayoutEffect(() => {
    const c = controllerRef.current;
    if (!c) return;
    c.setOptions({
      getValue: () => String(value ?? ""),
      onValueChange: (v: string) => onChangeRef.current?.(v),
      getElement: () => elementRef.current,
      getEngine: () => resolvedEngine,
      enabled,
      pageSize: pageSizeOpt,
      onKeyDown: (ev: KeyboardEvent) => {
        onKeyDownRef.current?.(ev as unknown as React.KeyboardEvent<T>);
      },
    });
  }, [value, resolvedEngine, enabled, pageSizeOpt]);

  const snap = useSyncExternalStore(
    (onStoreChange: () => void) =>
      controllerRef.current!.subscribe(onStoreChange),
    () => controllerRef.current!.getSnapshot(),
    () => controllerRef.current!.getSnapshot()
  );

  const updatePosition = useCallback(() => {
    const el = elementRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPosition({ top: rect.top, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!snap.hasActiveComposition) {
      setPosition(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [snap.hasActiveComposition, snap.pinyinInput, updatePosition]);

  const handleKeyDown = useCallback<React.KeyboardEventHandler<T>>(
    (e: React.KeyboardEvent<T>) => {
      controllerRef.current?.handleKeyDown(e.nativeEvent);
    },
    []
  );

  const handleBeforeInput = useCallback<React.FormEventHandler<T>>(
    (e: React.FormEvent<T>) => {
      controllerRef.current?.handleBeforeInput(e.nativeEvent as InputEvent);
    },
    []
  );

  const selectCandidate = useCallback((item: CandidateItem) => {
    controllerRef.current?.selectCandidate(item);
  }, []);

  const setPage = useCallback<React.Dispatch<React.SetStateAction<number>>>(
    (action: React.SetStateAction<number>) => {
      const c = controllerRef.current;
      if (!c) return;
      if (typeof action === "function") {
        c.setPage((p: number) => action(p));
      } else {
        c.setPage(() => action);
      }
    },
    []
  );

  const showPopup = snap.hasActiveComposition && position !== null;

  return {
    elementRef,
    pinyinInput: snap.pinyinInput,
    pinyinCursorPosition: snap.pinyinCursorPosition,
    candidates: snap.candidates,
    displayCandidates: snap.displayCandidates,
    page: snap.page,
    pageSize: snap.pageSize,
    position,
    showPopup,
    selectCandidate,
    setPage,
    handleKeyDown,
    handleBeforeInput,
    dictionaryLoadState: options?.dictionaryUrl
      ? dictionaryLoadState
      : "idle",
    dictionaryError: options?.dictionaryUrl ? dictionaryError : null,
  };
}
