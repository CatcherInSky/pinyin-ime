import "../common/index.css";
import { PinyinIMEEditor } from "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";
import { getDemoRoutes } from "../common/demo-routes";

/** 兜底注册自定义元素，避免依赖包副作用导入被裁剪后组件未定义。 */
if (!customElements.get("pinyin-ime-editor")) {
  customElements.define("pinyin-ime-editor", PinyinIMEEditor);
}

/** 词典条目结构（与库内 `PinyinDict` 同形）。 */
type DictEntry = { w: string; f: number };

/** 词典对象结构。 */
type PinyinDict = Record<string, DictEntry[]>;

/** 带 `getDictionary` 属性的 pinyin-ime 宿主元素类型。 */
type PinyinImeHostEl = HTMLElement & {
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
};

/** 远程词典 CDN 地址（示例固定版本）。 */
const CDN_DICT_URL =
  "https://cdn.jsdelivr.net/npm/pinyin-ime@0.7.0/dist/dictionary/google_pinyin_dict.js";

/** Web Component 本地 input 示例代码。 */
const WC_LOCAL_INPUT_CODE = `import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

const el = document.createElement("pinyin-ime-editor");
document.body.append(el);`;

/** Web Component 本地 textarea 示例代码。 */
const WC_LOCAL_TEXTAREA_CODE = `import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

const el = document.createElement("pinyin-ime-editor");
el.setAttribute("editor-type", "textarea");
document.body.append(el);`;

/** Web Component CDN 词典示例代码。 */
const WC_CDN_CODE = `import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

const CDN_DICT_URL =
  "https://cdn.jsdelivr.net/npm/pinyin-ime@0.7.0/dist/dictionary/google_pinyin_dict.js";
const el = document.createElement("pinyin-ime-editor");
el.getDictionary = async () => {
  const mod = await import(/* @vite-ignore */ CDN_DICT_URL);
  return mod.dict;
};
document.body.append(el);`;

/**
 * 通过 ESM 动态 import 从 CDN 获取词典模块。
 *
 * @returns 远程 `dict` 对象
 */
async function loadCdnDict(): Promise<PinyinDict> {
  const mod = (await import(/* @vite-ignore */ CDN_DICT_URL)) as {
    dict: PinyinDict;
  };
  return mod.dict;
}

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
    "空格：选择当前高亮候选；无候选则上屏拼音",
    "上/下方向键：切换候选高亮（默认高亮第一个）",
    "1–n：选当前页第 n 个候选（默认每页 5 条，最大 9）",
    "= / . / 小键盘 +：下一页；- / , / 小键盘 -：上一页",
    "左右方向键：拼音串内移动光标",
    "Ctrl+A：全选拼音缓冲，可删除或直接替换",
    "Enter：上屏拼音；Escape：清空缓冲",
    "Shift 单击：无拼音时切换中/英（见框内角标）",
    "Shift 单击：有拼音时上屏拼音（与 Enter 相同）；Shift+左右键仍用于扩选",
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
 * Appends a formatted code block under current section.
 *
 * @param parent - Section container
 * @param code - Full demo code snippet
 */
function appendCodeBlock(parent: HTMLElement, code: string): void {
  const pre = document.createElement("pre");
  pre.className = "overflow-x-auto rounded bg-muted/40 p-3 text-xs";
  const codeEl = document.createElement("code");
  codeEl.textContent = code;
  pre.appendChild(codeEl);
  parent.appendChild(pre);
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
    "引入 pinyin-ime 注册自定义元素后，用 document.createElement(\"pinyin-ime-editor\") 挂载；设置 editor-type 为 \"textarea\" 使用多行宿主。";
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
  editorInput.addEventListener("change", (e) => {
    const v = (e as CustomEvent<{ value: string }>).detail.value;
    outInput.textContent = `受控值：${JSON.stringify(v)}`;
  });
  holderInput.appendChild(editorInput);
  sectionInput.appendChild(holderInput);
  sectionInput.appendChild(outInput);
  appendCodeBlock(sectionInput, WC_LOCAL_INPUT_CODE);
  mainEl.appendChild(sectionInput);

  const sectionTa = document.createElement("section");
  sectionTa.className = "space-y-2";
  const h2Ta = document.createElement("h2");
  h2Ta.className = "text-lg font-semibold";
  h2Ta.textContent = "多行（editor-type = \"textarea\"）";
  sectionTa.appendChild(h2Ta);
  const holderTa = document.createElement("div");
  const editorTa = document.createElement("pinyin-ime-editor");
  editorTa.setAttribute("editor-type", "textarea");
  const outTa = document.createElement("p");
  outTa.className = "text-xs text-muted-foreground";
  editorTa.addEventListener("change", (e) => {
    const v = (e as CustomEvent<{ value: string }>).detail.value;
    outTa.textContent = `受控值：${JSON.stringify(v)}`;
  });
  holderTa.appendChild(editorTa);
  sectionTa.appendChild(holderTa);
  sectionTa.appendChild(outTa);
  appendCodeBlock(sectionTa, WC_LOCAL_TEXTAREA_CODE);
  mainEl.appendChild(sectionTa);

  const sectionRemote = document.createElement("section");
  sectionRemote.className = "space-y-2";
  const h2Remote = document.createElement("h2");
  h2Remote.className = "text-lg font-semibold";
  h2Remote.textContent =
    "远程词典（getDictionary + CDN google_pinyin_dict.js）";
  sectionRemote.appendChild(h2Remote);
  const remoteTip = document.createElement("p");
  remoteTip.className = "text-xs text-muted-foreground";
  remoteTip.textContent =
    "示例从 jsDelivr 动态加载 https://cdn.jsdelivr.net/npm/pinyin-ime@0.7.0/dist/dictionary/google_pinyin_dict.js 并通过 getDictionary 注入。";
  sectionRemote.appendChild(remoteTip);
  const holderRemote = document.createElement("div");
  const editorRemote = document.createElement("pinyin-ime-editor") as PinyinImeHostEl;
  editorRemote.getDictionary = loadCdnDict;
  const outRemote = document.createElement("p");
  outRemote.className = "text-xs text-muted-foreground";
  editorRemote.addEventListener("change", (e) => {
    const v = (e as CustomEvent<{ value: string }>).detail.value;
    outRemote.textContent = `受控值：${JSON.stringify(v)}`;
  });
  holderRemote.appendChild(editorRemote);
  sectionRemote.appendChild(holderRemote);
  sectionRemote.appendChild(outRemote);
  appendCodeBlock(sectionRemote, WC_CDN_CODE);
  mainEl.appendChild(sectionRemote);

  appendShortcuts(mainEl);
  root.appendChild(mainEl);
}

main();
