import { useState } from "react";
import { PinyinInput, PinyinTextarea } from "pinyin-ime";

/**
 * GitHub Pages demo: controlled single-line and multi-line pinyin IME.
 *
 * @returns Demo page
 */
export default function App() {
  const [single, setSingle] = useState("");
  const [multi, setMulti] = useState("");

  return (
    <main className="mx-auto max-w-xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">pinyin-ime</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          在无法使用系统输入法的场景下，用字母键输入拼音并选词上屏。本页构建于{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/pinyin-ime/</code>{" "}
          子路径，供 GitHub Pages 使用。
        </p>
      </div>

      <section className="space-y-2">
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
      </section>

      <section className="space-y-2">
        <label className="text-sm font-medium" htmlFor="demo-multi">
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

      <section className="rounded-md border border-border bg-muted/40 p-4 text-sm">
        <h2 className="font-medium">快捷键</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
          <li>字母 a–z：写入拼音缓冲</li>
          <li>空格：选第一候选；无候选则上屏拼音</li>
          <li>1–n：选当前页第 n 个候选（n 为每页条数，默认 3，最大 9）</li>
          <li>= / . / 小键盘 +：下一页；- / , / 小键盘 -：上一页</li>
          <li>左右方向键：拼音串内移动光标</li>
          <li>Enter：上屏拼音；Escape：清空缓冲</li>
        </ul>
      </section>
    </main>
  );
}
