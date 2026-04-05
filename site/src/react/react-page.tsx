import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { PinyinIMEEditor } from "pinyin-ime";
import type { PopupPlacement } from "pinyin-ime";
import { getDemoRoutes } from "../common/demo-routes";
import "pinyin-ime/pinyin-ime.css";
import "../common/index.css";
// @ts-expect-error demo local js dictionary module
import { dict as localDemoDict } from "./dict.js";

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

/** Lit 宿主上的受控 `value` 与自定义事件。 */
type DictEntry = { w: string; f: number };
type PinyinDict = Record<string, DictEntry[]>;
type PinyinHostEl = HTMLElement & {
  value: string;
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
  popupPosition?: PopupPlacement;
};

const CDN_DICT_URL =
  "https://cdn.jsdelivr.net/npm/pinyin-ime@0.5.0/dist/dict.js";

const REACT_CDN_CODE = `import { useEffect, useRef } from "react";
import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

type DictEntry = { w: string; f: number };
type PinyinDict = Record<string, DictEntry[]>;
type PinyinHostEl = HTMLElement & {
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
};

const CDN_DICT_URL =
  "https://cdn.jsdelivr.net/npm/pinyin-ime@0.7.0/dist/dictionary/google_pinyin_dict.js";

function TextareaWithCdnDict() {
  const ref = useRef<PinyinHostEl | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.getDictionary = async () => {
      const mod = (await import(/* @vite-ignore */ CDN_DICT_URL)) as {
        dict: PinyinDict;
      };
      return mod.dict;
    };
  }, []);

  return <pinyin-ime-editor ref={ref} editor-type="textarea" />;
}`;

const REACT_DOTA2_CODE = `import { useEffect, useRef } from "react";
import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

function InputWithDota2() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.getDictionary = () =>
      import("pinyin-ime/dictionary/dota2_pinyin_dict").then((m) => m.dict);
  }, []);
  return <pinyin-ime-editor ref={ref} />;
}`;

const REACT_LOCAL_CODE = `import { useEffect, useRef } from "react";
import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";
import { dict } from "./dict.js";

function InputWithLocalDict() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.getDictionary = () => dict;
  }, []);
  return <pinyin-ime-editor ref={ref} />;
}`;

/**
 * Loads dictionary module from CDN and returns exported dict.
 *
 * @returns Promise of Google pinyin dictionary
 */
async function loadCdnDict(): Promise<PinyinDict> {
  const mod = (await import(/* @vite-ignore */ CDN_DICT_URL)) as {
    dict: PinyinDict;
  };
  return mod.dict;
}

/**
 * 加载包内 Dota2 合并词典（与 `package.json` exports 一致）。
 *
 * @returns Dota2 + Google 合并词典
 */
async function loadDota2Dict(): Promise<PinyinDict> {
  const m = await import("pinyin-ime/dictionary/dota2_pinyin_dict");
  return m.dict;
}

/**
 * 加载本地演示词典 `./dict.js`（仅含 `dd -> test`）。
 *
 * @returns 本地演示词典
 */
async function loadLocalDict(): Promise<PinyinDict> {
  return localDemoDict as PinyinDict;
}

/**
 * 在 React 中受控使用 `<pinyin-ime-editor>`：同步 `value` 并转发 `pinyin-ime-change`。
 *
 * @param props - 受控值、回调与可选 `variant`
 * @returns JSX
 */
function PinyinImeEditorCtl(props: {
  value: string;
  onValueChange: (v: string) => void;
  variant?: "input" | "textarea";
  className?: string;
  /** 词典加载函数；未提供时走组件默认包内词典 */
  getDictionaryFn?: () => Promise<PinyinDict> | PinyinDict;
  popupPosition?: PopupPlacement;
}) {
  const {
    value,
    onValueChange,
    variant,
    className,
    getDictionaryFn,
    popupPosition,
  } = props;
  const ref = useRef<PinyinHostEl | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /**
     * @param e - `pinyin-ime` 自定义事件
     */
    const handler = (e: Event) => {
      onValueChange((e as CustomEvent<{ value: string }>).detail.value);
    };
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onValueChange]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.value !== value) {
      el.value = value;
    }
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.popupPosition = popupPosition;
  }, [popupPosition]);

  return (
    <pinyin-ime-editor
      ref={(node) => {
        const el = node as PinyinHostEl | null;
        ref.current = el;
        if (!el) return;
        if (getDictionaryFn) {
          el.getDictionary = getDictionaryFn;
        } else {
          delete el.getDictionary;
        }
      }}
      className={className}
      editor-type={variant}
    />
  );
}

/**
 * 单行：包内 Dota2 词典。
 */
function InputWithDota2Ctl(props: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
}) {
  return (
    <PinyinImeEditorCtl
      className={props.className}
      value={props.value}
      onValueChange={props.onValueChange}
      getDictionaryFn={loadDota2Dict}
    />
  );
}

/**
 * 单行：本地 `./dict.js` 词典。
 */
function InputWithLocalDictCtl(props: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
}) {
  return (
    <PinyinImeEditorCtl
      className={props.className}
      value={props.value}
      onValueChange={props.onValueChange}
      getDictionaryFn={loadLocalDict}
    />
  );
}

/**
 * 多行：远程 CDN 词典。
 */
function TextareaWithCdnDictCtl(props: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
}) {
  return (
    <PinyinImeEditorCtl
      className={props.className}
      value={props.value}
      onValueChange={props.onValueChange}
      variant="textarea"
      popupPosition="bottom"
      getDictionaryFn={loadCdnDict}
    />
  );
}

/**
 * React 演示页：侧载 `import "pinyin-ime"` 注册 `<pinyin-ime-editor>`，受控展示单行与多行。
 *
 * @returns 页面 JSX
 */
function ReactDemoPage() {
  const r = getDemoRoutes();
  const [single, setSingle] = useState("");
  const [singleLocal, setSingleLocal] = useState("");
  const [multi, setMulti] = useState("");

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
          注册自定义元素，模板中渲染{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            &lt;pinyin-ime-editor&gt;
          </code>
          ，并引入{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            pinyin-ime/pinyin-ime.css
          </code>
          ；类型导出可选{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            PinyinIMEEditor
          </code>
          。
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">单行（Dota2 词表）</h2>
        <p className="text-xs text-muted-foreground">
          通过{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            getDictionary
          </code>
          返回{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            import(&quot;pinyin-ime/dictionary/dota2_pinyin_dict&quot;)
          </code>
          。
        </p>
        <InputWithDota2Ctl
          className="w-full"
          value={single}
          onValueChange={setSingle}
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
          通过{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            import("./dict.js")
          </code>{" "}
          加载本地词典。
        </p>
        <InputWithLocalDictCtl
          className="w-full"
          value={singleLocal}
          onValueChange={setSingleLocal}
        />
        <p className="text-xs text-muted-foreground">
          受控值：<span className="font-mono">{JSON.stringify(singleLocal)}</span>
        </p>
        <pre className="overflow-x-auto rounded bg-muted/40 p-3 text-xs">
          <code>{REACT_LOCAL_CODE}</code>
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">多行（variant = &quot;textarea&quot;）</h2>
        <TextareaWithCdnDictCtl
          className="w-full"
          value={multi}
          onValueChange={setMulti}
        />
        <p className="text-xs text-muted-foreground">
          受控值：<span className="font-mono">{JSON.stringify(multi)}</span>
        </p>
        <pre className="overflow-x-auto rounded bg-muted/40 p-3 text-xs">
          <code>{REACT_CDN_CODE}</code>
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
