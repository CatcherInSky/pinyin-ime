# pinyin-ime

## 0. 简介

**pinyin-ime** 是一套在浏览器内实现的 **拼音 → 汉字** 输入法能力：在无法使用系统输入法的场景（全屏游戏、内嵌 WebView、远程桌面、部分浏览器环境等），于 `<input>` / `<textarea>` 上用 **a–z** 输入拼音，通过 **候选框选词上屏**。

- **React**：提供 `PinyinField`、`PinyinInput`、`PinyinTextarea` 与 `usePinyinIME` 等 API。  
- **任意框架 / 无框架**：可通过子路径 **`pinyin-ime/element`** 使用 Lit 实现的 **`<pinyin-ime-editor>`** 自定义元素（`lit` 已打入该入口，无需单独安装）。  
- **Vue**：无官方 Vue 组件；推荐在模板中直接使用 `<pinyin-ime-editor>`，并在构建工具中将该标签识别为自定义元素（示例见本仓库 [`site/`](site/)）。

在线演示：将 [`site/vite.config.ts`](site/vite.config.ts) 的 `base` 与仓库的 GitHub Pages 路径对齐后部署 `site/dist`。演示站通过 [`site/package.json`](site/package.json) 从 **npm** 安装 `pinyin-ime`（`npm:` 协议，避免与仓库根包 workspace 链接），发新版库后如需固定演示版本可收紧该依赖范围。多页 HTML 入口在 `site` 根目录与各子目录（[`site/index.html`](site/index.html)、[`site/react/`](site/react/)、[`site/vue/`](site/vue/)、[`site/web_component/`](site/web_component/)），与 `base: '/pinyin-ime/'` 一致；本地开发请打开 **`http://localhost:5173/pinyin-ime/`**（勿省略前缀）。

---

## 1. 安装与使用

```bash
pnpm add pinyin-ime
# 或 npm install pinyin-ime / yarn add pinyin-ime
```

**对等依赖**：主入口 `pinyin-ime` 声明 `react`、`react-dom`（建议 18+）。若项目 **仅** 使用 `pinyin-ime/element` 与样式子路径、不装 React，安装器可能对 peer 给出警告，可按包管理器文档选择忽略或配置（例如 pnpm 的 `peerDependencyRules`）。

**构建产物**：发布包以 `dist/` 下的 **编译后 ESM + `.d.ts`** 为主；在仓库里开发库时请执行 `pnpm run build` 保证 `dist` 存在。**演示站** `site/` 默认从 **npm** 解析 `pinyin-ime`，本地改库后若要演示站跟本地 `dist` 一致，需改回 workspace 链接或发版后再装新版本。

### 1.1 React

入口安装样式（与组件配套使用）：

```ts
import "pinyin-ime/pinyin-ime.css";
```

**`PinyinInput` / `PinyinTextarea`**（单行 / 多行，API 与原生控件接近）：

```tsx
import { useState } from "react";
import { PinyinInput, PinyinTextarea } from "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

export function Demo() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <>
      <PinyinInput value={title} onChange={setTitle} placeholder="标题" />
      <PinyinTextarea value={body} onChange={setBody} rows={6} />
    </>
  );
}
```

**`PinyinField`**（推荐）：用 `variant="input" | "textarea"` 切换宿主，其余原生属性放进 `inputProps` / `textareaProps`，避免与 IME 内部绑定的属性冲突。

```tsx
import { PinyinField } from "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

<PinyinField
  variant="textarea"
  value={body}
  onChange={setBody}
  textareaProps={{ id: "body", placeholder: "正文", rows: 6 }}
/>;
```

### 1.2 Vue 3

本包不提供 `.vue` 单文件组件。做法是：

1. 安装依赖并 **build 本库**（workspace 或从 npm 安装已发布版本）。  
2. 在入口引入 **`import "pinyin-ime/element"`** 与 **`import "pinyin-ime/pinyin-ime.css"`**。  
3. 在模板里写 **`<pinyin-ime-editor>`**，监听 **`pinyin-ime-change`**，`event.detail.value` 为字符串。  
4. 使用 **Vite** 时，在 `@vitejs/plugin-vue` 中配置 **`compilerOptions.isCustomElement`**，例如 `(tag) => tag === "pinyin-ime-editor"`，避免 Vue 把未知标签当普通组件解析。

完整可运行示例见 **[`site/src/vue/VuePage.vue`](site/src/vue/VuePage.vue)** 与 **[`site/vite.config.ts`](site/vite.config.ts)**。

```vue
<script setup lang="ts">
import { ref } from "vue";
import "pinyin-ime/element";
import "pinyin-ime/pinyin-ime.css";

const text = ref("");
function onPinyinChange(e: Event) {
  text.value = (e as CustomEvent<{ value: string }>).detail.value;
}
</script>

<template>
  <pinyin-ime-editor :value="text" @pinyin-ime-change="onPinyinChange" />
</template>
```

### 1.3 原生 Web Component

在支持 **ESM** 的页面或应用中：

```html
<script type="module">
  import "pinyin-ime/element";
  import "pinyin-ime/pinyin-ime.css";
</script>
```

注册完成后可用 HTML / DOM API 使用 **`<pinyin-ime-editor>`**：

```js
const el = document.createElement("pinyin-ime-editor");
el.addEventListener("pinyin-ime-change", (e) => {
  console.log(e.detail.value);
});
document.body.append(el);
```

独立页面演示见 **[`site/src/react/react-page.tsx`](site/src/react/react-page.tsx)**（React 内挂载自定义元素）与 **[`site/src/wc/wc-main.ts`](site/src/wc/wc-main.ts)**（纯 DOM）。

---

## 2. Props / 属性说明

### 2.1 React：`PinyinField`

`PinyinInput` / `PinyinTextarea` 的 IME 相关 props 与下表一致；差别在于：二者把 **原生 `input` / `textarea` 属性** 直接铺在根上（仍不含被 IME 占用的键），而 `PinyinField` 通过 **`inputProps` / `textareaProps`** 透传。

以下 **不可** 出现在 `inputProps` / `textareaProps` 中：`value`、`onChange`、`onBeforeInput`、`onKeyDownCapture`、`ref`（由组件接管）。类型见 **`PinyinFieldNativeInputProps`** / **`PinyinFieldNativeTextareaProps`**。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `string` | — | 受控文本 |
| `onChange` | `(value: string) => void` | — | 文本变化 |
| `onKeyDown` | `KeyboardEventHandler<HTMLInputElement \| HTMLTextAreaElement>` | — | 未被 IME 拦截时的键盘回调 |
| `variant` | `"input" \| "textarea"` | `"input"` | 宿主类型（仅 `PinyinField`） |
| `enabled` | `boolean` | `true` | `false` 时关闭 IME，行为等同普通受控输入 |
| `pageSize` | `number` | `3` | 每页候选数，范围 1–9（对应数字键 1–n） |
| `classNames` | `Partial<PinyinPopupClassNames>` | — | 候选弹窗各区域 `className` |
| `popupPortalContainer` | `HTMLElement \| null` | `document.body` | 候选层 Portal 挂载节点 |
| `className` | `string` | — | 外层包裹元素 `className` |
| `inputProps` | `PinyinFieldNativeInputProps` | — | 仅 `variant="input"` 时合并到 `<input>` |
| `textareaProps` | `PinyinFieldNativeTextareaProps` | — | 仅 `variant="textarea"` 时合并到 `<textarea>` |
| `getEngine` | `() => PinyinEngine \| null` | — | **词典优先级最高**：自定义引擎实例 |
| `dictionary` | `GooglePinyinDict` | — | 内存中的整本词典对象 |
| `dictionaryUrl` | `string` | — | 远程词典 JSON 的 URL（需 CORS）；加载完成前候选为空 |
| `dictionaryFetchInit` | `RequestInit` | — | 传给 `fetch(dictionaryUrl, init)` |
| `onDictionaryLoaded` | `() => void` | — | 远程词典加载成功并创建引擎后调用 |
| `onDictionaryLoadError` | `(error: unknown) => void` | — | 远程加载或解析失败时调用 |

### 2.2 `usePinyinIME` 的选项与返回值（进阶）

除组件外可直接使用 **`usePinyinIME(value, onChange, onKeyDown, options)`**。其中 **`options`** 的字段与上表中的 `enabled`、`pageSize`、`getEngine`、`dictionary`、`dictionaryUrl`、`dictionaryFetchInit`、`onDictionaryLoaded`、`onDictionaryLoadError` 相同。

返回值中常用字段：`elementRef`、`pinyinInput`、`candidates`、`displayCandidates`、`page`、`pageSize`、`position`、`showPopup`、`selectCandidate`、`setPage`、`handleKeyDown`、`handleBeforeInput`；若使用 `dictionaryUrl`，另有 **`dictionaryLoadState`**（`"idle" \| "loading" \| "ready" \| "error"`）、**`dictionaryError`**。

### 2.3 自定义元素：`<pinyin-ime-editor>`

属性名为 **DOM 中的写法**（Lit 会将 camelCase 映射为 attribute）。

| 属性（HTML） | 类型 | 默认值 | 说明 |
|--------------|------|--------|------|
| `value` | `string` | `""` | 受控文本（property） |
| `variant` | `"input" \| "textarea"` | `"input"` | 单行或多行宿主 |
| `dictionary-url` | `string` | `""` | 非空时从该 URL 拉取词典 JSON |
| `enabled` | `boolean` | `true` | 是否启用 IME 逻辑 |
| `page-size` | `number` | `3` | 每页候选数（1–9） |

| 事件 | `detail` | 说明 |
|------|-----------|------|
| `pinyin-ime-change` | `{ value: string }` | 文本变化（选词、上屏、普通输入等导致 `value` 更新时） |

---

## 3. 样式

### 3.1 默认样式怎么用

在应用入口（或懒加载 IME 的 chunk 入口）增加：

```ts
import "pinyin-ime/pinyin-ime.css";
```

样式使用 **`pinyin-ime-*`** 类名（输入框、候选条、分页区等）。**不引入该文件** 时，组件仍可运行，但默认外观会缺失，需自行用下文方式补全。

### 3.2 怎么自定义

1. **React 宿主**：根级 **`className`**（或 `inputProps.className` / `textareaProps.className`）覆盖输入框；**`classNames`** 覆盖弹窗分区，键名见类型 **`PinyinPopupClassNames`**（`popup`、`pinyinBar`、`cursor`、`candidateRow` 等）。可与 **`defaultPinyinPopupClassNames`** 合并后再覆盖局部。  
2. **自建弹窗**：使用 **`usePinyinIME`** + **`PinyinCandidatePopup`**（或完全自建 UI），只消费 hook 返回的状态与事件。  
3. **Web Component**：样式在 **Shadow DOM** 内联，默认已包含与 `pinyin-ime.css` 等价的一套规则；宿主页面再引 `pinyin-ime.css` 主要影响 **document 内** 其它元素，一般仍需依赖内置样式或通过 **继承 / 未来主题 API** 扩展（当前版本以内联为主）。

工具函数 **`joinClassNames`** 可用于拼接 `className` 字符串（无 Tailwind 依赖）。

---

## 4. 字典与懒加载

### 4.1 默认行为

未配置 `getEngine` / `dictionary` / `dictionaryUrl` 时，使用包内 **同步内嵌** 的默认词典（体积较大，安装包可达数 MB 量级）。

### 4.2 懒加载（远程 URL）

设置 **`dictionaryUrl`**（React 组件或 `usePinyinIME` / 自定义元素的 **`dictionary-url`**）后：

- 会在客户端 **`fetch(url)`** 拉取 JSON； body 须为与 **`GooglePinyinDict`** 同形的对象：`Record<string, Array<{ w: string; f: number }>>`。  
- **加载完成前** 引擎为空，**候选列表为空**（不会回退到内嵌大词典，除非你自己在 `getEngine` 里组合逻辑）。  
- 服务端需配置 **CORS**，生产环境建议 **版本化 URL** 与合理 **`Cache-Control`**。  
- 可选 **`dictionaryFetchInit`** 传入 `fetch` 的第二参数；**`onDictionaryLoaded` / `onDictionaryLoadError`** 做提示或埋点。  
- React 下可通过 **`dictionaryLoadState`**、**`dictionaryError`** 展示加载态与错误。

### 4.3 其它方式

- **`dictionary`**：已解析的对象，适合小表或与打包器拆分的 JSON 模块。  
- **`getEngine()`**：返回 **`createPinyinEngine(dict)`** 的实例，优先级最高，可实现缓存、多源合并等。

### 4.4 构建体积：`index.js` / `element.js` 与词典

- **为何曾经各约 5MB**：`src/google_pinyin_dict.ts` 内嵌整本词典；若用 **两次独立的 tsup 构建**（先 `index.ts`、再 `element.ts`），esbuild 无法在两次运行之间复用模块，**同一份词典会被完整打进两个入口**，体积几乎翻倍。  
- **当前仓库做法**：`tsup.config.ts` 使用 **单次多入口**（`index` + `element`）并开启 **`splitting: true`（仅 ESM）**，共享依赖（含词典）落到 **`dist/chunk-*.js`**，`index.js` / `element.js` 只保留入口胶水代码。部署 npm 包或静态资源时，请 **一并发布所有 `dist/*.js`**，否则相对路径的 chunk 会 404。  
- **单独词典文件**：`pnpm run build` 会在 `dist/google-pinyin-dict.json` 再写一份 JSON（与内嵌数据一致），并通过子路径 **`pinyin-ime/google-pinyin-dict.json`** 暴露。业务里可设 `dictionaryUrl`（或自定义 `fetch`）指向该文件，便于 CDN 缓存或与内嵌默认引擎并存。  
- **若希望应用首包不含内嵌词典**：需要避免从主入口引用会 **静态拉取 `defaultPinyinEngine` / `dict`** 的 API（例如 `getCandidates`、`computeMatchedLength` 等），并改用 **`createPinyinEngine` + `loadGooglePinyinDictFromUrl`** 等自行装配；这属于进阶用法，当前包仍以「开箱即用内嵌词典」为主。

---

## 快捷键

- **a–z**：写入拼音缓冲（`'` 音节分隔）  
- **空格**：选第一候选；无候选则上屏当前拼音串  
- **1–n**：选择当前页第 n 个候选（n ≤ `pageSize`）  
- **= / . / 小键盘 +**：下一页；**- / , / 小键盘 -**：上一页  
- **← / →**：在拼音串内移动光标  
- **Enter**：上屏拼音串；**Escape**：清空缓冲  

---

## 本地开发与演示站

```bash
pnpm install
pnpm run test
pnpm run build              # 生成根目录 dist/（npm 发布内容）
pnpm run site:dev           # 启动 site（依赖 registry 中的 pinyin-ime，见 site/package.json）
pnpm run site:build         # 构建 site/dist（同上）
```

发布前可使用 `pnpm pack` / `npm pack --dry-run` 检查打包包容。

---

## 第三方数据与合规

拼音词表衍生自 [web-pinyin-ime](https://github.com/dongyuwei/web-pinyin-ime) 等开源数据；使用与再分发前请自行评估许可与合规要求。

---

## SSR 与客户端

IME 使用 Portal、`window` 监听与选区 API，**仅适用于客户端**。在 Next.js 等环境中请对含 IME 的界面使用 **`dynamic(..., { ssr: false })`** 或等价方式。
