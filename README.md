# pinyin-ime

适用于**无法使用系统输入法**的场景（全屏游戏、内嵌 WebView、远程桌面、部分浏览器环境等）：在 React 受控 `<input />` / `<textarea />` 上用 **a–z 输入拼音**，通过候选框**选词上屏**。

- **在线演示**（需先在仓库 Settings → Pages 中启用 GitHub Pages，并将来源设为 GitHub Actions）：`https://<你的用户名>.github.io/pinyin-ime/`（若 GitHub 仓库目录名不同，请将 `site/vite.config.ts` 里的 `base` 改成与仓库名一致的路径，例如 `/你的仓库名/`）
- **包名**：[`pinyin-ime`](https://www.npmjs.com/search?q=pinyin-ime)（若已被占用，请改用作用域包如 `@your-org/pinyin-ime` 并相应修改 `package.json` 的 `name`）

## 安装

```bash
npm install pinyin-ime
```

对等依赖：`react`、`react-dom`（建议 18+）。

默认样式使用 **Tailwind CSS** 与 **shadcn/ui** 常见语义 token（`border-input`、`bg-popover` 等）。若项目中没有这些变量，请配置与 shadcn 一致的 CSS 变量，或通过 `className` / `classNames` 完全自定义。

## 用法

```tsx
import { useState } from "react";
import { PinyinInput, PinyinTextarea } from "pinyin-ime";

function Form() {
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

### 与 shadcn `Input` 对齐样式

把 shadcn 文档里 `Input` 的 `className` 原样传给 `PinyinInput` 的 `className` 即可覆盖包内默认 input 样式；候选框可用 `classNames` 分段覆盖：

```tsx
<PinyinInput
  value={v}
  onChange={setV}
  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
  classNames={{
    popup: "rounded-lg border bg-popover shadow-md",
    pinyinBar: "font-mono text-xs",
  }}
/>
```

也可从包中导入 `defaultPinyinPopupClassNames` 做合并，或拷贝到本地组件库再改。

### API 摘要

| 属性 | 说明 |
|------|------|
| `value` / `onChange(value)` | 受控字符串（与普通 input 一致，但 `onChange` 为 `(string) => void`） |
| `enabled` | 默认 `true`；`false` 时不启用 IME，行为等同普通受控输入 |
| `pageSize` | 每页候选数，默认 `3`，最大 `9`（对应数字键 `1`–`n`） |
| `classNames` | 候选弹窗分区 class，见类型 `PinyinPopupClassNames` |
| `popupPortalContainer` | Portal 挂载节点，默认 `document.body` |

高级用法可直接使用 **`usePinyinIME`**、**`PinyinCandidatePopup`**、**`getCandidates`** / **`computeMatchedLength`** 自建 UI（见包内导出）。

## 快捷键

- **a–z**：写入拼音缓冲（`'` 用于音节分隔，与引擎一致）
- **空格**：选第一个候选；若无候选则上屏当前拼音串
- **1–n**：选择当前页第 n 个候选（n ≤ `pageSize`）
- **= / . / 小键盘 +**：下一页；**- / , / 小键盘 -**：上一页
- **← / →**：在拼音串内移动光标
- **Enter**：上屏拼音串；**Escape**：清空缓冲

## 本地开发与发布

```bash
npm install
npm run build          # 产出 dist/（发布到 npm）
npm run site:dev       # 先 build 库，再启动示例站（Vite）
npm run site:build     # 构建 site/dist，供 GitHub Pages 上传
```

示例站源码在 **`site/`** 目录（构建产物 `site/dist`）。若你的工作区忽略了名为 `demo` 的目录，本仓库使用 `site` 作为示例应用路径，与计划中的「demo 页」等价。

将本目录作为独立 Git 仓库时，在 GitHub 仓库 **Settings → Pages** 中选择 **GitHub Actions** 作为来源；推送 `main` 分支会由 [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) 部署。

发布前：

```bash
npm pack --dry-run
```

确认 `files` 仅包含 `dist`、`README.md`、`LICENSE` 等预期文件。

## 第三方数据

拼音词表衍生自开源项目 [web-pinyin-ime](https://github.com/dongyuwei/web-pinyin-ime) 中的 Google 拼音风格字典数据；使用前请自行评估许可与合规要求。生成方式可与主项目脚本类似：从该仓库导出 `dict` 对象为 TypeScript 模块（见本包 `src/google_pinyin_dict.ts`）。

## 包体积说明

字典体积较大，安装后包体可达数 MB 量级。若需极致按需加载，可在上层用动态 `import()` 或拆包策略自行封装（本包当前为同步打包）。
