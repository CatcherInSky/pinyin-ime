import { useEffect, useRef, useState } from "react";
import type { App as VueApp } from "vue";
import { PinyinInput, PinyinTextarea } from "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

/**
 * 使用 `document.createElement` 挂载 `<pinyin-ime-editor>`，演示无框架用法。
 *
 * @returns 区块 UI
 */
function NativeWcDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    const h = hostRef.current;
    if (!h) return;
    const ac = new AbortController();
    void (async () => {
      await import("pinyin-ime/element");
      if (ac.signal.aborted || hostRef.current !== h) return;
      if (h.querySelector("pinyin-ime-editor")) return;
      const editor = document.createElement("pinyin-ime-editor");
      const onChange = (e: Event) => {
        setText((e as CustomEvent<{ value: string }>).detail.value);
      };
      editor.addEventListener("pinyin-ime-change", onChange);
      h.appendChild(editor);
    })();
    return () => {
      ac.abort();
      h.replaceChildren();
    };
  }, []);

  return (
    <div className="space-y-2">
      <div ref={hostRef} />
      <p className="text-xs text-muted-foreground">
        受控值：<span className="font-mono">{JSON.stringify(text)}</span>
      </p>
    </div>
  );
}

/**
 * 挂载 Vue 子应用，演示在 `.vue` 单文件中使用自定义元素。
 *
 * @returns 挂载占位容器
 */
function VueWcHost() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let app: VueApp | undefined;
    let cancelled = false;
    void import("./vue-mount").then(({ mountVueWcDemo }) => {
      if (cancelled || mountRef.current !== el) return;
      app = mountVueWcDemo(el);
    });
    return () => {
      cancelled = true;
      app?.unmount();
      el.replaceChildren();
    };
  }, []);

  return <div ref={mountRef} />;
}

/**
 * GitHub Pages demo：React / 原生 WC / Vue + WC。
 *
 * @returns Demo page
 */
export default function App() {
  const [single, setSingle] = useState("");
  const [multi, setMulti] = useState("");

  return (
    <main className="mx-auto max-w-xl space-y-10 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">pinyin-ime</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          在无法使用系统输入法的场景下，用字母键输入拼音并选词上屏。本页构建于{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/pinyin-ime/</code>{" "}
          子路径；下方分别演示 React 组件、原生 Web Component、Vue 3 +
          自定义元素（与 README 对应）。
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">React：`PinyinInput` / `PinyinTextarea`</h2>
        <label className="text-sm font-medium" htmlFor="demo-single">
          PinyinInput
        </label>
        <PinyinInput
          id="demo-single"
          value={single}
          onChange={setSingle}
          placeholder="输入拼音，例如 nihao"
        />
        <p className="text-xs text-muted-foreground">
          受控值：<span className="font-mono">{JSON.stringify(single)}</span>
        </p>
        <label className="mt-4 block text-sm font-medium" htmlFor="demo-multi">
          PinyinTextarea
        </label>
        <PinyinTextarea
          id="demo-multi"
          value={multi}
          onChange={setMulti}
          placeholder="多行同样支持拼音选词"
          rows={4}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">原生：`&lt;pinyin-ime-editor&gt;`</h2>
        <p className="text-sm text-muted-foreground">
          动态 <code className="rounded bg-muted px-1 text-xs">import(&quot;pinyin-ime/element&quot;)</code>{" "}
          注册自定义元素后，用 DOM API 挂载即可。
        </p>
        <NativeWcDemo />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Vue 3：模板中使用 `pinyin-ime-editor`</h2>
        <p className="text-sm text-muted-foreground">
          依赖 <code className="rounded bg-muted px-1 text-xs">@vitejs/plugin-vue</code> 的{" "}
          <code className="rounded bg-muted px-1 text-xs">isCustomElement</code>，见{" "}
          <code className="rounded bg-muted px-1 text-xs">site/vite.config.ts</code>。
        </p>
        <VueWcHost />
      </section>

      <section className="rounded-md border border-border bg-muted/40 p-4 text-sm">
        <h2 className="font-medium">快捷键</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
          <li>字母 a–z：写入拼音缓冲</li>
          <li>空格：选第一候选；无候选则上屏拼音</li>
          <li>1–n：选当前页第 n 个候选（默认每页 3 条，最大 9）</li>
          <li>= / . / 小键盘 +：下一页；- / , / 小键盘 -：上一页</li>
          <li>左右方向键：拼音串内移动光标</li>
          <li>Enter：上屏拼音；Escape：清空缓冲</li>
        </ul>
      </section>
    </main>
  );
}
