import "../common/index.css";
import { PinyinIMEEditor } from "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";
import { getDemoRoutes } from "../common/demo-routes";
import { DEMO_CDN_GOOGLE_PINYIN_DICT } from "../common/demo-cdn";

/** 兜底注册自定义元素，避免依赖包副作用导入被裁剪后组件未定义。 */
if (!customElements.get("pinyin-ime-editor")) {
  customElements.define("pinyin-ime-editor", PinyinIMEEditor);
}

/** 词典条目结构（与库内 `PinyinDict` 同形）。 */
type DictEntry = { w: string; f: number };

/** 词典对象结构。 */
type PinyinDict = Record<string, DictEntry[]>;

/** 带 `getDictionary` 的宿主元素类型。 */
type PinyinImeHostEl = HTMLElement & {
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
};

const WC_REGISTER_SNIPPET = `import { PinyinIMEEditor } from "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

if (!customElements.get("pinyin-ime-editor")) {
  customElements.define("pinyin-ime-editor", PinyinIMEEditor);
}`;

/** Web Component 单行示例代码。 */
const WC_LOCAL_INPUT_CODE = `${WC_REGISTER_SNIPPET}

const el = document.createElement("pinyin-ime-editor");
document.body.append(el);`;

/** Web Component 多行示例代码。 */
const WC_LOCAL_TEXTAREA_CODE = `${WC_REGISTER_SNIPPET}

const el = document.createElement("pinyin-ime-editor");
el.setAttribute("editor-type", "textarea");
document.body.append(el);`;

/** 与页面第三段演示一致：多行 + CDN + 属性 API。 */
const WC_CDN_TEXTAREA_CODE = `${WC_REGISTER_SNIPPET}

const CDN_DICT_URL = "${DEMO_CDN_GOOGLE_PINYIN_DICT}";
const el = document.createElement("pinyin-ime-editor") as HTMLElement & {
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
};
el.setAttribute("editor-type", "textarea");
el.setAttribute("popup-position", "bottom");
el.getDictionary = async () => {
  const mod = (await import(/* @vite-ignore */ CDN_DICT_URL)) as {
    dict: PinyinDict;
  };
  return mod.dict;
};
document.body.append(el);`;

/**
 * 与演示代码中 `CDN_DICT_URL` 一致。
 *
 * @returns 远程 `dict` 对象
 */
async function loadCdnDict(): Promise<PinyinDict> {
  const mod = (await import(/* @vite-ignore */ DEMO_CDN_GOOGLE_PINYIN_DICT)) as {
    dict: PinyinDict;
  };
  return mod.dict;
}

/**
 * 追加顶栏导航。
 *
 * @param parent - 容器（如 `<main>`）
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
 * 追加与其它演示页一致的快捷键说明。
 *
 * @param parent - 容器
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
 * 在章节下追加代码块。
 *
 * @param parent - 章节容器
 * @param code - 完整示例源码
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
 * `/web_component/` 入口：无框架，仅用 DOM API。
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
    "使用 document.createElement(\"pinyin-ime-editor\") 挂载；editor-type、popup-position 等用 setAttribute；getDictionary 仅可写 property。首载由组件内部 idle 与 focusin 竞速触发。";
  head.appendChild(intro);
  mainEl.appendChild(head);

  const sectionInput = document.createElement("section");
  sectionInput.className = "space-y-2";
  const h2Input = document.createElement("h2");
  h2Input.className = "text-lg font-semibold";
  h2Input.textContent = "单行（默认 input，包内 google 词典）";
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
    "多行 + CDN 词典 + popup-position（统一推迟首载）";
  sectionRemote.appendChild(h2Remote);
  const remoteTip = document.createElement("p");
  remoteTip.className = "text-xs text-muted-foreground";
  remoteTip.textContent = `getDictionary 加载 ${DEMO_CDN_GOOGLE_PINYIN_DICT}；属性与下方代码块一致。`;
  sectionRemote.appendChild(remoteTip);
  const holderRemote = document.createElement("div");
  const editorRemote = document.createElement(
    "pinyin-ime-editor"
  ) as PinyinImeHostEl;
  editorRemote.setAttribute("editor-type", "textarea");
  editorRemote.setAttribute("popup-position", "bottom");
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
  appendCodeBlock(sectionRemote, WC_CDN_TEXTAREA_CODE);
  mainEl.appendChild(sectionRemote);

  appendShortcuts(mainEl);
  root.appendChild(mainEl);
}

main();
