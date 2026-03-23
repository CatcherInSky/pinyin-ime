import "../common/index.css";
import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";
import { getDemoRoutes } from "../common/demo-routes";

/**
 * Appends top navigation with the current page highlighted.
 *
 * @param parent - Container (e.g. `<main>`)
 */
function appendNav(parent: HTMLElement) {
  const r = getDemoRoutes();
  const nav = document.createElement("nav");
  nav.className = "mb-2 flex flex-wrap gap-x-4 gap-y-2";
  nav.setAttribute("aria-label", "演示页面");
  const items: { label: string; href: string; current: boolean }[] = [
    { label: "首页", href: r.home, current: false },
    { label: "React", href: r.react, current: false },
    { label: "Vue", href: r.vue, current: false },
    { label: "Web Component", href: r.webComponent, current: true },
  ];
  for (const it of items) {
    const a = document.createElement("a");
    a.href = it.href;
    a.textContent = it.label;
    a.className = it.current
      ? "text-sm font-medium text-foreground"
      : "text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline";
    nav.appendChild(a);
  }
  parent.appendChild(nav);
}

/**
 * Appends shortcut help consistent with other demo pages.
 *
 * @param parent - Container
 */
function appendShortcuts(parent: HTMLElement) {
  const section = document.createElement("section");
  section.className = "rounded-md border border-border bg-muted/40 p-4 text-sm";
  const h2 = document.createElement("h2");
  h2.className = "font-medium";
  h2.textContent = "快捷键";
  section.appendChild(h2);
  const ul = document.createElement("ul");
  ul.className = "mt-2 list-inside list-disc space-y-1 text-muted-foreground";
  const lines = [
    "字母 a–z：写入拼音缓冲",
    "空格：选第一候选；无候选则上屏拼音",
    "1–n：选当前页第 n 个候选（默认每页 3 条，最大 9）",
    "= / . / 小键盘 +：下一页；- / , / 小键盘 -：上一页",
    "左右方向键：拼音串内移动光标",
    "Enter：上屏拼音；Escape：清空缓冲",
  ];
  for (const t of lines) {
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  }
  section.appendChild(ul);
  parent.appendChild(section);
}

/**
 * Client entry for `/web_component/`: no React/Vue, DOM-only usage.
 */
function main() {
  const root = document.getElementById("root");
  if (!root) return;
  root.replaceChildren();

  const mainEl = document.createElement("main");
  mainEl.className = "mx-auto max-w-xl space-y-10 px-4 py-10";
  appendNav(mainEl);

  const head = document.createElement("div");
  const h1 = document.createElement("h1");
  h1.className = "text-2xl font-semibold tracking-tight";
  h1.textContent = "Web Component 演示";
  head.appendChild(h1);
  const intro = document.createElement("p");
  intro.className = "mt-2 text-sm text-muted-foreground";
  intro.textContent =
    "引入 pinyin-ime 注册自定义元素后，用 document.createElement(\"pinyin-ime-editor\") 挂载；设置 property variant 为 \"textarea\" 使用多行宿主。";
  head.appendChild(intro);
  mainEl.appendChild(head);

  const sectionInput = document.createElement("section");
  sectionInput.className = "space-y-2";
  const h2Input = document.createElement("h2");
  h2Input.className = "text-lg font-semibold";
  h2Input.textContent = "单行（默认 input）";
  sectionInput.appendChild(h2Input);
  const holderInput = document.createElement("div");
  const editorInput = document.createElement("pinyin-ime-editor");
  const outInput = document.createElement("p");
  outInput.className = "text-xs text-muted-foreground";
  editorInput.addEventListener("pinyin-ime-change", (e) => {
    const v = (e as CustomEvent<{ value: string }>).detail.value;
    outInput.textContent = `受控值：${JSON.stringify(v)}`;
  });
  holderInput.appendChild(editorInput);
  sectionInput.appendChild(holderInput);
  sectionInput.appendChild(outInput);
  mainEl.appendChild(sectionInput);

  const sectionTa = document.createElement("section");
  sectionTa.className = "space-y-2";
  const h2Ta = document.createElement("h2");
  h2Ta.className = "text-lg font-semibold";
  h2Ta.textContent = "多行（variant = \"textarea\"）";
  sectionTa.appendChild(h2Ta);
  const holderTa = document.createElement("div");
  const editorTa = document.createElement("pinyin-ime-editor");
  editorTa.setAttribute("variant", "textarea");
  const outTa = document.createElement("p");
  outTa.className = "text-xs text-muted-foreground";
  editorTa.addEventListener("pinyin-ime-change", (e) => {
    const v = (e as CustomEvent<{ value: string }>).detail.value;
    outTa.textContent = `受控值：${JSON.stringify(v)}`;
  });
  holderTa.appendChild(editorTa);
  sectionTa.appendChild(holderTa);
  sectionTa.appendChild(outTa);
  mainEl.appendChild(sectionTa);

  appendShortcuts(mainEl);
  root.appendChild(mainEl);
}

main();
