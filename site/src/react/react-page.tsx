import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { PinyinIMEEditor } from "pinyin-ime";
import { getDemoRoutes } from "../common/demo-routes";
import "pinyin-ime/pinyin-ime.css";
import "../common/index.css";

/** 兜底注册自定义元素，避免依赖包副作用导入被裁剪后组件未定义。 */
if (!customElements.get("pinyin-ime-editor")) {
  customElements.define("pinyin-ime-editor", PinyinIMEEditor);
}

/** 快捷键说明文案（与其它演示页一致）。 */
const SHORTCUT_LINES = [
  "字母 a–z：写入拼音缓冲",
  "空格：选第一候选；无候选则上屏拼音",
  "1–n：选当前页第 n 个候选（默认每页 5 条，最大 9）",
  "= / . / 小键盘 +：下一页；- / , / 小键盘 -：上一页",
  "左右方向键：拼音串内移动光标",
  "Enter：上屏拼音；Escape：清空缓冲",
] as const;

/** Lit 宿主上的受控 `value` 与自定义事件。 */
type DictEntry = { w: string; f: number };
type GooglePinyinDict = Record<string, DictEntry[]>;
type PinyinHostEl = HTMLElement & {
  value: string;
  getDictionary?: () => Promise<GooglePinyinDict> | GooglePinyinDict;
};

const CDN_DICT_URL = "https://cdn.jsdelivr.net/npm/pinyin-ime@0.5.0/dist/dict.js";

const REACT_CDN_CODE = `import { useEffect, useRef } from "react";
import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

type DictEntry = { w: string; f: number };
type GooglePinyinDict = Record<string, DictEntry[]>;
type PinyinHostEl = HTMLElement & {
  getDictionary?: () => Promise<GooglePinyinDict> | GooglePinyinDict;
};

const CDN_DICT_URL = "https://cdn.jsdelivr.net/npm/pinyin-ime@0.5.0/dist/dict.js";

function TextareaWithCdnDict() {
  const ref = useRef<PinyinHostEl | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.getDictionary = async () => {
      const mod = (await import(/* @vite-ignore */ CDN_DICT_URL)) as {
        dict: GooglePinyinDict;
      };
      return mod.dict;
    };
  }, []);

  return <pinyin-ime-editor ref={ref} editor-type="textarea" />;
}`;
const REACT_LOCAL_CODE = `import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

function InputWithLocalDict() {
  // 本地词典（默认行为）：不设置 getDictionary
  return <pinyin-ime-editor />;
}`;

/**
 * Loads dictionary module from CDN and returns exported dict.
 *
 * @returns Promise of Google pinyin dictionary
 */
async function loadCdnDict(): Promise<GooglePinyinDict> {
  const mod = (await import(/* @vite-ignore */ CDN_DICT_URL)) as {
    dict: GooglePinyinDict;
  };
  return mod.dict;
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
  useCdnDictionary?: boolean;
}) {
  const { value, onValueChange, variant, className, useCdnDictionary } = props;
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
    if (useCdnDictionary) {
      el.getDictionary = loadCdnDict;
      return;
    }
    delete el.getDictionary;
  }, [useCdnDictionary]);

  return (
    <pinyin-ime-editor
      ref={ref}
      className={className}
      editor-type={variant}
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
        <h2 className="text-lg font-semibold">单行（默认 input）</h2>
        <PinyinImeEditorCtl
          className="w-full"
          value={single}
          onValueChange={setSingle}
        />
        <p className="text-xs text-muted-foreground">
          受控值：<span className="font-mono">{JSON.stringify(single)}</span>
        </p>
        <pre className="overflow-x-auto rounded bg-muted/40 p-3 text-xs">
          <code>{REACT_LOCAL_CODE}</code>
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">多行（variant = &quot;textarea&quot;）</h2>
        <PinyinImeEditorCtl
          className="w-full"
          value={multi}
          onValueChange={setMulti}
          variant="textarea"
          useCdnDictionary
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
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <ReactDemoPage />
    </React.StrictMode>
  );
}

main();
