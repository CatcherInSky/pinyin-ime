# pinyin-ime

## 0. 简介

**pinyin-ime** 是一套在浏览器内实现的 **拼音 → 汉字** 输入法能力：在无法使用系统输入法的场景（全屏游戏、内嵌 WebView、远程桌面、部分浏览器环境等），于 `<input>` / `<textarea>` 上用 **a–z** 输入拼音，通过 **候选框选词上屏**。

统一入口为 Lit 实现的 `**<pinyin-ime-editor>`** 自定义元素（`lit` 已打入产物，无需单独安装），可在 **React**、**Vue**、**任意框架或纯 HTML/JS** 中使用。

在线演示：将 `[site/vite.config.ts](site/vite.config.ts)` 的 `base` 与仓库的 GitHub Pages 路径对齐后部署 `site/dist`。演示站通过 `[site/package.json](site/package.json)` 从 **npm** 安装 `pinyin-ime`（`npm:` 协议，避免与仓库根包 workspace 链接），发新版库后如需固定演示版本可收紧该依赖范围。多页 HTML 入口在 `site` 根目录与各子目录（`[site/index.html](site/index.html)`、`[site/react/](site/react/)`、`[site/vue/](site/vue/)`、`[site/web_component/](site/web_component/)`）；本地开发请打开 `**http://localhost:5173/pinyinime/`**（与 `base` 一致，勿省略前缀）。

---

## 1. 安装与使用

```bash
pnpm add pinyin-ime
# 或 npm install pinyin-ime / yarn add pinyin-ime
```

**构建产物**：发布包以 `dist/` 下的 **编译后 ESM + `.d.ts`** 为主；在仓库里开发库时请执行 `pnpm run build` 保证 `dist` 存在。**演示站** `site/` 默认从 **npm** 解析 `pinyin-ime`，本地改库后若要演示站跟本地 `dist` 一致，需改回 workspace 链接或发版后再装新版本。

### 1.1 引入与注册

```ts
import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";
```

### 1.2 React

在 React 中使用 `<pinyin-ime-editor>`，需封装受控逻辑（监听 `change`、同步 `value`）：

```tsx
import { useRef, useEffect, useLayoutEffect } from "react";
import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

function PinyinEditor({ value, onChange, editorType = "input" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e) => onChange(e.detail.value);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onChange]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.value !== value) el.value = value;
  }, [value]);
  return <pinyin-ime-editor ref={ref} editor-type={editorType} />;
}
```

完整示例见 `**[site/src/react/react-page.tsx](site/src/react/react-page.tsx)**`。

### 1.3 Vue 3

1. 安装依赖并 **build 本库**（workspace 或从 npm 安装已发布版本）。
2. 在入口引入 `**import "pinyin-ime"`** 与 `**import "pinyin-ime/pinyin-ime.css"**`。
3. 在模板里写 `**<pinyin-ime-editor>**`，监听 `**change**`，`event.detail.value` 为字符串。
4. 使用 **Vite** 时，在 `@vitejs/plugin-vue` 中配置 `**compilerOptions.isCustomElement`**，例如 `(tag) => tag === "pinyin-ime-editor"`，避免 Vue 把未知标签当普通组件解析。

```vue
<script setup lang="ts">
import { ref } from "vue";
import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

const text = ref("");
function onChange(e: Event) {
  text.value = (e as CustomEvent<{ value: string }>).detail.value;
}
</script>

<template>
  <pinyin-ime-editor :value="text" @change="onChange" />
</template>
```

完整示例见 `**[site/src/vue/VuePage.vue](site/src/vue/VuePage.vue)**`。

### 1.4 原生 Web Component

```html
<script type="module">
  import "pinyin-ime";
  import "pinyin-ime/pinyin-ime.css";
</script>
```

```js
const el = document.createElement("pinyin-ime-editor");
el.addEventListener("change", (e) => {
  console.log(e.detail.value);
});
document.body.append(el);
```

示例见 `**[site/src/wc/wc-main.ts](site/src/wc/wc-main.ts)**`。

---

## 2. `<pinyin-ime-editor>` 属性与事件

### 2.1 自有属性


| 属性（HTML）      | 类型                     | 默认值       | 说明             |
| ------------- | ---------------------- | --------- | -------------- |
| `value`       | `string`               | `""`      | 受控文本（property）；属性缺失或移除时按空串 |
| `editor-type` | `"input" \| "textarea"` | `"input"` | 单行或多行宿主；仅 `textarea`（忽略大小写与首尾空白）为多行，**其它任意值按 `input`** |
| `page-size`   | `number`               | `5`       | 每页候选数；解析为整数后经内部限制为 **1–9**，**无法解析或非有限数时按默认 5** |
| `enabled`     | `boolean`              | `true`    | 是否启用 IME 逻辑（见下 **字符串语义**） |
| `popup-position` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | 候选框相对输入框的方位；**非法值按 `top`** |

**`enabled`（HTML 字符串）**

- **关闭**：`enabled="false"`，以及 `0`、`off`、`no`、`disabled`（忽略大小写与首尾空白）。
- **开启**：无该属性、或 `enabled` 布尔属性（值为空串）、或 `true`、`1`、`on`、`yes`。
- **无法识别的非空字符串**：按 **开启** 处理（偏安全默认）；反射到 DOM 时，开启会 **省略** 属性，关闭为 `enabled="false"`。

**`popup-position`**

与 JavaScript 的 `popupPosition` 一致；仅上述四个小写方位名有效（属性中大小写不敏感），其它字符串兜底为 `top`。


**词典首次加载（统一推迟）**

- 挂载后不在同步路径立即拉词典；`connectedCallback` 内 **`queueMicrotask`** 再排队 **`requestIdleCallback`**（`timeout: 2000ms`；不支持时用 `setTimeout(0)`），与 **内部输入框 `focusin`（捕获阶段）** **竞速**，**先发生者**触发首次加载。这样同一宏任务内 React **`useLayoutEffect`** / Vue 等可先写入 **`getDictionary`**，减少「先默认 google、再自定义」的固定双拉。
- **`getDictionary` 变更**（property）：Lit `willUpdate` 会**取消**上述 idle / focus 等待并**立即** `_loadDictionary`；用户主动换词典时的第二次加载为预期行为。
- **开发日志**：非生产构建下（`process.env.NODE_ENV !== "production"`）可向控制台输出轨迹，前缀 **`[pinyin-ime-editor dictionary]`**；`trigger` 形如 **`deferred:idle`** / **`deferred:focusin`** / **`property:getDictionary`**。

多实例使用**同一份**默认包内词典（同一对象引用）时，`createPinyinEngine` 会**复用同一引擎**，避免重复构建 trie / 索引，降低内存与主线程尖峰。

**v2 破坏性变更**：已移除 HTML 属性 **`dictionary-load`** 与对应 property；该名仍列入下方**不透传**列表，旧页面上的 `dictionary-load="..."` 会留在宿主上、不会落到内部 `<input>`。

### 2.2 仅 JavaScript property（无 HTML attribute）

以下只能通过 property 赋值（无对应 attribute）：

```ts
type GetDictionaryFn = () => Promise<PinyinDict> | PinyinDict;
```

- `**getDictionary**`：初始化时调用；返回词典或 Promise；resolve 前候选框显示「加载中…」。未设置时默认加载包内 google 词典。

候选框方位也可在 HTML 中写 **`popup-position`**（见上表）；`popupPosition` property 与之对应。

主包另导出 `**packagedDictionaryModuleUrl("google" | "dota2")**`：返回包内词典 ESM 的绝对 URL，供 `import(url)` 兜底；自定义词典请优先在 **`getDictionary`** 里使用 `import("pinyin-ime/dictionary/...")` 或 `fetch`。

```js
const el = document.querySelector("pinyin-ime-editor");
el.popupPosition = "bottom"; // 或与属性 popup-position="bottom" 等价
el.getDictionary = () =>
  fetch("https://example.com/dict.json").then((r) => r.json());
```

### 2.3 属性透传

除 `value`、`editor-type`、`page-size`、`enabled`、**`dictionary-load`（已废弃，仅保留为不透传占位）**、`popup-position`、`class` 外，其它 attribute 会透传到内部的 `<input>` 或 `<textarea>`，便于进一步定制（如 `placeholder`、`disabled`、`rows` 等）：

```html
<pinyin-ime-editor placeholder="请输入" rows="6" editor-type="textarea" />
```

### 2.4 事件


| 事件         | `detail`            | 说明                                                                 |
| ---------- | ------------------- | -------------------------------------------------------------------- |
| `change`   | `{ value: string }` | 文本变化（选词、上屏、普通输入等导致 `value` 更新时）                                     |
| `focus`    | -                   | 内部输入节点聚焦时桥接到宿主；可直接在 `<pinyin-ime-editor>` 上监听                        |
| `blur`     | -                   | 内部输入节点失焦时桥接到宿主；可直接在 `<pinyin-ime-editor>` 上监听                        |
| `focusin`  | -                   | 焦点进入时桥接到宿主（便于 React/Vue 事件系统）                                       |
| `focusout` | -                   | 焦点离开时桥接到宿主（便于 React/Vue 事件系统）                                       |
| `select`   | -                   | 内部输入节点文本选区变更时桥接到宿主                                                  |
| `invalid`  | -                   | 内部输入节点触发表单校验失败时桥接到宿主                                                |

说明：

- 宿主支持直接调用 `focus()` / `blur()`，会代理到内部 `<input>` / `<textarea>`。
- 不桥接 `beforeinput` / `keydown` / `keyup` / `composition*`，避免与 IME 拦截链路冲突。


---

## 3. 样式定制

组件使用 Shadow DOM，样式在内部。支持两种定制方式：

### 3.1 CSS 变量

在宿主或父级设置变量覆盖默认值：

```css
pinyin-ime-editor {
  --pinyin-ime-border-color: #e5e7eb;
  --pinyin-ime-focus-border: #6366f1;
  --pinyin-ime-popup-bg: #fff;
  --pinyin-ime-cursor-color: #4f46e5;
  --pinyin-ime-hover-bg: #f3f4f6;
  --pinyin-ime-text-color: #111827;
  --pinyin-ime-muted-color: #6b7280;
  --pinyin-ime-popup-border: #e5e7eb;
  --pinyin-ime-focus-shadow: rgba(99, 102, 241, 0.25);
}
```

### 3.2 Part 选择器

内部元素暴露 `part`，可通过 `::part()` 选择器定制：

```css
pinyin-ime-editor::part(popup) {
  border-radius: 8px;
}
pinyin-ime-editor::part(candidate-row):hover {
  background: #eef2ff;
}
```

可用 part：`popup`、`pinyin-bar`、`cursor`、`candidate-list`、`candidate-row`、`candidate-index`、`candidate-text`、`empty`、`loading`、`footer`。

---

## 4. 字典

### 4.1 加载方式

| 方式 | 条件 | 行为 |
| ---- | ---- | ---- |
| **自定义** | 已设置 `getDictionary` | 宿主返回 `PinyinDict`（`fetch`、`import("pinyin-ime/dictionary/...")`、本地模块等均可） |
| **默认包内** | 未设置 `getDictionary` | 加载包内 google 词典（`dist/dictionary/google_pinyin_dict.js`，不内嵌进 `index.js`） |

使用包内 **dota2** 词典：`getDictionary: () => import("pinyin-ime/dictionary/dota2_pinyin_dict").then((m) => m.dict)`。

### 4.2 远程加载示例

```js
el.getDictionary = () =>
  fetch("/path/to/dict.json").then((r) => r.json());
```

词典须为 `PinyinDict` 格式：`Record<string, Array<{ w: string; f: number }>>`。服务端需配置 **CORS**。

### 4.3 子路径与 API


| 子路径 | 说明 |
| ------ | ---- |
| `pinyin-ime` | 主入口，注册 `<pinyin-ime-editor>` 并导出 API（含 `packagedDictionaryModuleUrl`） |
| `pinyin-ime/dictionary/google_pinyin_dict` | 包内 google 词典 ESM（`export const dict`） |
| `pinyin-ime/dictionary/dota2_pinyin_dict` | 包内 dota2+google 合并词典 ESM |
| `pinyin-ime/pinyin-ime.css` | 默认样式（Shadow DOM 内联为主，按需引入） |


可导入 `**createPinyinEngine`**、`**loadPinyinDictFromUrl**` 等 API 自行构建引擎。`getCandidates`、`computeMatchedLength` 使用已注册的默认引擎（需至少有一个 `<pinyin-ime-editor>` 已加载词典后才会生效）。

---

## 5. 导出 API

主入口分两种使用方式：

- `import "pinyin-ime"`：执行副作用，注册 `<pinyin-ime-editor>`
- `import { ... } from "pinyin-ime"`：按需导入命名导出

`pinyin-ime` 当前命名导出如下：

- **组件**
  - `PinyinIMEEditor`
- **引擎**
  - `createPinyinEngine`
  - `getCandidates`
  - `computeMatchedLength`
  - 类型：`CandidateItem`、`PinyinMatchResult`、`PinyinEngine`
- **字典工具**
  - `loadPinyinDictFromUrl`
  - `assertPinyinDictShape`
  - `DictionaryLoadError`
- **控制器**
  - `PinyinIMEController`
  - `IME_PAGE_SIZE`
  - `clampIMPageSize`
  - 类型：`PinyinIMEControllerOptions`、`PinyinIMEControllerSnapshot`、`PinyinIMEHostAdapter`
- **样式工具**
  - `joinClassNames`
  - 类型：`PinyinPopupClassNames`、`PopupPosition`、`PopupPlacement`
- **基础类型**
  - `DictEntry`
  - `PinyinDict`
  - `GetDictionaryFn`
  - `PinyinIMEChangeDetail`

---

## 6. 快捷键

- **a–z**：写入拼音缓冲（`'` 音节分隔）  
- **空格**：选第一候选；无候选则上屏当前拼音串  
- **1–n**：选择当前页第 n 个候选（n ≤ `pageSize`）  
- **= / . / 小键盘 +**：下一页；**- / , / 小键盘 -**：上一页  
- **← / →**：在拼音串内移动光标  
- **Enter**：上屏拼音串；**Escape**：清空缓冲

---

## 7. 字典数据

拼音词表衍生自 [web-pinyin-ime](https://github.com/dongyuwei/web-pinyin-ime)。

---

## 8. 神秘问题

最近在部署本项目演示页时遇到一个比较诡异的问题，想向社区请教经验：

- 站点根路径可以正常访问（HTTP 200）。
- `pinyin-ime` 子路径（包含 `index.html`）稳定返回 404。
- 但 `pinyinime` 子路径（包含 `index.html`）就正常。
- Actions 构建与部署流程显示成功，且构建产物里确认包含 `pinyin-ime` 目录及其页面文件。
- 本地静态服务同一份产物可正常访问对应路径。

所以本项目的demo页面是 `https://catcherinsky.github.io/pinyinime/` 而不是 `https://catcherinsky.github.io/piny-inime/` 有点强迫症。