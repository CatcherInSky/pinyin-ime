import React, { useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { PinyinIMEEditor } from "pinyin-ime";
import { getDemoRoutes } from "../common/demo-routes";
import { DEMO_CDN_GOOGLE_PINYIN_DICT } from "../common/demo-cdn";
import "pinyin-ime/pinyin-ime.css";
import "../common/index.css";
// @ts-expect-error demo local js dictionary module
import { dict } from "./dict.js";

/** 兜底注册自定义元素，避免依赖包副作用导入被裁剪后组件未定义。 */
if (!customElements.get("pinyin-ime-editor")) {
  customElements.define("pinyin-ime-editor", PinyinIMEEditor);
}

/** 快捷键说明文案（与其它演示页一致）。 */
const SHORTCUT_LINES = [
  "字母 a–z：写入拼音缓冲",
  "空格：选择当前高亮候选；无候选则上屏拼音",
  "上/下方向键：切换候选高亮（默认高亮第一个）",
  "1–n：选当前页第 n 个候选（默认每页 5 条，最大 9）",
  "= / . / 小键盘 +：下一页；- / , / 小键盘 -：上一页",
  "左右方向键：拼音串内移动光标",
  "Ctrl+A：全选拼音缓冲，可删除或直接替换",
  "Enter：上屏拼音；Escape：清空缓冲",
  "Shift 单击：无拼音时切换中/英（见框内角标）",
  "Shift 单击：有拼音时上屏拼音（与 Enter 相同）；Shift+左右键仍用于扩选",
] as const;

type DictEntry = { w: string; f: number };
type PinyinDict = Record<string, DictEntry[]>;
type PinyinHostEl = HTMLElement & {
  value: string;
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
};

const REACT_SETUP = `import React, { useLayoutEffect, useRef, useState } from "react";
import { PinyinIMEEditor } from "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

if (!customElements.get("pinyin-ime-editor")) {
  customElements.define("pinyin-ime-editor", PinyinIMEEditor);
}`;

const REACT_DOTA2_CODE = `${REACT_SETUP}

type PinyinDict = Record<string, { w: string; f: number }[]>;
type PinyinHostEl = HTMLElement & {
  value: string;
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
};

export function Dota2DeferredDemo() {
  const [value, setValue] = useState("");
  const ref = useRef<PinyinHostEl | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.getDictionary = () =>
      import("pinyin-ime/dictionary/dota2_pinyin_dict").then((m) => m.dict);
    const onChange = (e: Event) =>
      setValue((e as CustomEvent<{ value: string }>).detail.value);
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.value !== value) el.value = value;
  }, [value]);

  return (
    <pinyin-ime-editor
      ref={ref}
      className="w-full"
    />
  );
}`;

const REACT_LOCAL_CODE = `import React, { useLayoutEffect, useRef, useState } from "react";
import { PinyinIMEEditor } from "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";
import { dict } from "./dict.js";

if (!customElements.get("pinyin-ime-editor")) {
  customElements.define("pinyin-ime-editor", PinyinIMEEditor);
}

type PinyinDict = Record<string, { w: string; f: number }[]>;
type PinyinHostEl = HTMLElement & {
  value: string;
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
};

export function LocalDictDemo() {
  const [value, setValue] = useState("");
  const ref = useRef<PinyinHostEl | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.getDictionary = () => dict;
    const onChange = (e: Event) =>
      setValue((e as CustomEvent<{ value: string }>).detail.value);
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.value !== value) el.value = value;
  }, [value]);

  return <pinyin-ime-editor ref={ref} className="w-full" />;
}`;

const REACT_TEXTAREA_CDN_CODE = `${REACT_SETUP}

type PinyinDict = Record<string, { w: string; f: number }[]>;
type PinyinHostEl = HTMLElement & {
  value: string;
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
};

const CDN_DICT_URL = "${DEMO_CDN_GOOGLE_PINYIN_DICT}";

export function TextareaCdnDemo() {
  const [value, setValue] = useState("");
  const ref = useRef<PinyinHostEl | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.getDictionary = async () => {
      const mod = (await import(/* @vite-ignore */ CDN_DICT_URL)) as {
        dict: PinyinDict;
      };
      return mod.dict;
    };
    const onChange = (e: Event) =>
      setValue((e as CustomEvent<{ value: string }>).detail.value);
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.value !== value) el.value = value;
  }, [value]);

  return (
    <pinyin-ime-editor
      ref={ref}
      className="w-full"
      editor-type="textarea"
      popup-position="bottom"
    />
  );
}`;

/**
 * React 演示页：页面内直接使用 {@link pinyin-ime-editor}，与下方 pre 中代码一致。
 *
 * @returns 页面 JSX
 */
function ReactDemoPage() {
  const r = getDemoRoutes();
  const [single, setSingle] = useState("");
  const [singleLocal, setSingleLocal] = useState("");
  const [multi, setMulti] = useState("");

  const refDota = useRef<PinyinHostEl | null>(null);
  useLayoutEffect(() => {
    const el = refDota.current;
    if (!el) return;
    el.getDictionary = () =>
      import("pinyin-ime/dictionary/dota2_pinyin_dict").then((m) => m.dict);
    const onChange = (e: Event) =>
      setSingle((e as CustomEvent<{ value: string }>).detail.value);
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);
  useLayoutEffect(() => {
    const el = refDota.current;
    if (el && el.value !== single) el.value = single;
  }, [single]);

  const refLocal = useRef<PinyinHostEl | null>(null);
  useLayoutEffect(() => {
    const el = refLocal.current;
    if (!el) return;
    el.getDictionary = () => dict;
    const onChange = (e: Event) =>
      setSingleLocal((e as CustomEvent<{ value: string }>).detail.value);
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);
  useLayoutEffect(() => {
    const el = refLocal.current;
    if (el && el.value !== singleLocal) el.value = singleLocal;
  }, [singleLocal]);

  const refCdnTa = useRef<PinyinHostEl | null>(null);
  useLayoutEffect(() => {
    const el = refCdnTa.current;
    if (!el) return;
    el.getDictionary = async () => {
      const mod = (await import(/* @vite-ignore */ DEMO_CDN_GOOGLE_PINYIN_DICT)) as {
        dict: PinyinDict;
      };
      return mod.dict;
    };
    const onChange = (e: Event) =>
      setMulti((e as CustomEvent<{ value: string }>).detail.value);
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);
  useLayoutEffect(() => {
    const el = refCdnTa.current;
    if (el && el.value !== multi) el.value = multi;
  }, [multi]);

  return (
    <main className="mx-auto max-w-xl space-y-10 px-4 py-10">
      <nav className="mb-2 flex flex-wrap gap-x-4 gap-y-2" aria-label="演示页面">
        <a
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          href={r.home}
        >
          首页
        </a>
        <a className="text-sm font-medium text-foreground" href={r.react}>
          React
        </a>
        <a
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          href={r.vue}
        >
          Vue
        </a>
        <a
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          href={r.webComponent}
        >
          Web Component
        </a>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">React 演示</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          使用{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            import &quot;pinyin-ime&quot;
          </code>{" "}
          与{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            pinyin-ime/pinyin-ime.css
          </code>
          ；模板中直接写{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            &lt;pinyin-ime-editor&gt;
          </code>
          。HTML 属性如{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            editor-type
          </code>
          、
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            popup-position
          </code>
          ；{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            getDictionary
          </code>{" "}
          仅可写 property。首载已统一推迟（
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            queueMicrotask
          </code>{" "}
          + idle 与内部{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">focusin</code>{" "}
          竞速）；自定义词典请在{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            useLayoutEffect
          </code>{" "}
          （或同步 ref 回调）里尽早赋值{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            getDictionary
          </code>
          ，以便与 Lit 更新对齐。
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">单行（Dota2 词表）</h2>
        <p className="text-xs text-muted-foreground">
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            getDictionary
          </code>{" "}
          在{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            useLayoutEffect
          </code>{" "}
          中绑定，指向{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            dota2_pinyin_dict
          </code>
          。
        </p>
        <pinyin-ime-editor
          ref={refDota}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          受控值：<span className="font-mono">{JSON.stringify(single)}</span>
        </p>
        <pre className="overflow-x-auto rounded bg-muted/40 p-3 text-xs">
          <code>{REACT_DOTA2_CODE}</code>
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">单行（本地词典：dd -&gt; test）</h2>
        <p className="text-xs text-muted-foreground">
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            getDictionary
          </code>{" "}
          返回本地{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            ./dict.js
          </code>
          ；与默认包内 google 一样走统一推迟首载。
        </p>
        <pinyin-ime-editor ref={refLocal} className="w-full" />
        <p className="text-xs text-muted-foreground">
          受控值：
          <span className="font-mono">{JSON.stringify(singleLocal)}</span>
        </p>
        <pre className="overflow-x-auto rounded bg-muted/40 p-3 text-xs">
          <code>{REACT_LOCAL_CODE}</code>
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          多行（editor-type + popup-position + CDN）
        </h2>
        <p className="text-xs text-muted-foreground">
          属性{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            editor-type=&quot;textarea&quot;
          </code>
          、
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            popup-position=&quot;bottom&quot;
          </code>
          ；词典来自{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            {DEMO_CDN_GOOGLE_PINYIN_DICT}
          </code>
          。
        </p>
        <pinyin-ime-editor
          ref={refCdnTa}
          className="w-full"
          editor-type="textarea"
          popup-position="bottom"
        />
        <p className="text-xs text-muted-foreground">
          受控值：<span className="font-mono">{JSON.stringify(multi)}</span>
        </p>
        <pre className="overflow-x-auto rounded bg-muted/40 p-3 text-xs">
          <code>{REACT_TEXTAREA_CDN_CODE}</code>
        </pre>
      </section>

      <section className="rounded-md border border-border bg-muted/40 p-4 text-sm">
        <h2 className="font-medium">快捷键</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
          {SHORTCUT_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

/**
 * `/react/` 入口：挂载演示应用。
 */
function main() {
  const el = document.getElementById("root");
  if (!el) return;
  const rootEl = el as HTMLElement & { __pinyinImeReactRoot?: ReactDOM.Root };
  rootEl.__pinyinImeReactRoot ??= ReactDOM.createRoot(el);
  rootEl.__pinyinImeReactRoot.render(
    <React.StrictMode>
      <ReactDemoPage />
    </React.StrictMode>
  );
}

main();
