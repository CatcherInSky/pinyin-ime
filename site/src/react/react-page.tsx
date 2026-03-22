import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { PinyinInput, PinyinTextarea } from "pinyin-ime"; // todo 修改统一
import { getDemoRoutes } from "../common/demo-routes";
import "pinyin-ime/pinyin-ime.css";
import "../common/index.css";

/** 快捷键说明文案（与其它演示页一致）。 */
const SHORTCUT_LINES = [
  "字母 a–z：写入拼音缓冲",
  "空格：选第一候选；无候选则上屏拼音",
  "1–n：选当前页第 n 个候选（默认每页 3 条，最大 9）",
  "= / . / 小键盘 +：下一页；- / , / 小键盘 -：上一页",
  "左右方向键：拼音串内移动光标",
  "Enter：上屏拼音；Escape：清空缓冲",
] as const;

/**
 * React 演示页：从主包命名导入 `PinyinInput` / `PinyinTextarea`，受控展示单行与多行。
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
            import &#123; PinyinInput, PinyinTextarea &#125; from &quot;pinyin-ime&quot;
          </code>
          ，并引入{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">pinyin-ime/pinyin-ime.css</code>
          ；主包无默认导出，Web Component 类在{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">pinyin-ime/element</code>（
          <code className="rounded bg-muted px-1 py-0.5 text-xs">PinyinIMEEditor</code>
          ）。
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">单行（PinyinInput）</h2>
        <PinyinInput
          className="w-full"
          value={single}
          onChange={setSingle}
          placeholder="在此输入拼音…"
        />
        <p className="text-xs text-muted-foreground">
          受控值：<span className="font-mono">{JSON.stringify(single)}</span>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">多行（PinyinTextarea）</h2>
        <PinyinTextarea
          className="w-full"
          value={multi}
          onChange={setMulti}
          placeholder="多行输入…"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          受控值：<span className="font-mono">{JSON.stringify(multi)}</span>
        </p>
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
