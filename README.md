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
| `value`       | `string`               | `""`      | 受控文本（property） |
| `editor-type` | `"input" | "textarea"` | `"input"` | 单行或多行宿主        |
| `page-size`   | `number`               | `5`       | 每页候选数（1–9）     |
| `enabled`     | `boolean`              | `true`    | 是否启用 IME 逻辑    |


### 2.2 仅 property（不可用 HTML attribute 设置）

通过 JavaScript 可设置以下 property（无法通过 HTML attribute 设置）：

```ts
type PopupPlacement = "top" | "bottom" | "left" | "right";
type GetDictionaryFn = () => Promise<PinyinDict> | PinyinDict;
```

- `**popupPosition**`：候选框相对输入框位置，默认 `"top"`。
- `**getDictionary**`：组件初始化（`connectedCallback`）时调用；返回词典对象或 Promise；resolve 前候选框显示「加载中…」；未设置时动态 import 包内词典（`pinyin-ime/dict`），按需加载。

```js
const el = document.querySelector("pinyin-ime-editor");
el.popupPosition = "bottom";
el.getDictionary = () =>
  fetch("https://example.com/dict.json").then((r) => r.json());
```

### 2.3 属性透传

除 `value`、`editor-type`、`page-size`、`enabled`、`class` 外，其它 attribute 会透传到内部的 `<input>` 或 `<textarea>`，便于进一步定制（如 `placeholder`、`disabled`、`rows` 等）：

```html
<pinyin-ime-editor placeholder="请输入" rows="6" editor-type="textarea" />popupPosition
```

### 2.4 事件


| 事件       | `detail`            | 说明                              |
| -------- | ------------------- | ------------------------------- |
| `change` | `{ value: string }` | 文本变化（选词、上屏、普通输入等导致 `value` 更新时） |


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

### 4.1 两种加载方式


| 方式       | 条件                  | 行为                                      | 第三方构建                             |
| -------- | ------------------- | --------------------------------------- | --------------------------------- |
| **本地加载** | `getDictionary` 未设置 | 动态 `import("pinyin-ime/dict")` 按需加载包内词典 | 会生成字典 chunk，仅在使用本地时加载             |
| **远程加载** | `getDictionary` 已设置 | 调用用户方法获取词典                              | 不加载字典 chunk，运行时由 getDictionary 提供 |


只需 `import "pinyin-ime"`，无需额外 import；本地/远程由是否设置 `getDictionary` 决定。

### 4.2 远程加载示例

```js
el.getDictionary = () =>
  fetch("/path/to/dict.json").then((r) => r.json());
```

词典须为 `PinyinDict` 格式：`Record<string, Array<{ w: string; f: number }>>`。服务端需配置 **CORS**。

### 4.3 子路径与 API


| 子路径                         | 说明                                                    |
| --------------------------- | ----------------------------------------------------- |
| `pinyin-ime`                | 主入口，注册 `<pinyin-ime-editor>` 并导出 API                  |
| `pinyin-ime/dict`           | 导出 `dict`，供 element 本地加载时 `import("pinyin-ime/dict")` |
| `pinyin-ime/pinyin-ime.css` | 默认样式（Shadow DOM 内联为主，按需引入）                            |


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