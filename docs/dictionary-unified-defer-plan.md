# 方案：移除 `dictionary-load`、统一推迟首载 + 开发模式日志

## 1. 行为（与此前方案一致）

- 删除 `dictionary-load` / `dictionaryLoad`；首次加载一律 **RIC / `setTimeout(0)`** 与 **内部 `focusin`** 竞速。
- `connectedCallback` 使用 **`queueMicrotask` 后再 `_scheduleDeferredIdleCallback()`**，便于 React/Vue layout 先写 `getDictionary`。
- `willUpdate` 保留 **`getDictionary`** 分支：取消等待器 + `_loadDictionary`。
- `RESERVED_ATTRIBUTES` **保留** `dictionary-load`，旧 HTML 不透传到内部 input。

## 2. 开发模式日志

**目标**：仅用 **`process.env.NODE_ENV !== "production"`** 决定是否打印词典加载日志；**不再使用** `isDictionaryLoadDebugEnabled`、`globalThis.__PINYIN_IME_DICTIONARY_DEBUG__`、`localStorage` 等开关（你已删除前者，方案与之一致）。

**实现要点**：

1. **[`src/element.ts`](src/element.ts)**  
   - 保留一个小函数例如 `dictionaryLoadDevLog(...args)`，内部：  
     `if (process.env.NODE_ENV === "production") return;`  
     `console.info("[pinyin-ime-editor dictionary]", ...args);`  
   - 所有原调试输出改为调用该函数（或等价内联判断）。

2. **[`tsup.config.ts`](tsup.config.ts)**  
   - 为 **主入口与 dictionary 子包** 配置 `esbuildOptions.define` 或 tsup `define`，将 **`process.env.NODE_ENV`** 固化为构建时的字符串（例如发布脚本下为 `"production"`），避免浏览器里出现未定义的 `process`。  
   - 典型写法：`define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production") }`（与当前构建环境一致）。

3. **README**  
   - 调试说明改为：**开发**（`NODE_ENV !== "production"`）会打 `[pinyin-ime-editor dictionary]`；**生产构建产物**内为 `production`，无日志。

4. **注意**  
   - 使用 **Vite 直接编译本仓库 `src`**（如 `site` 的 local alias）时，由 Vite 注入 `process.env.NODE_ENV`，行为与常规一致。  
   - **Vitest** 跑单测时一般为 `test`/`development`，若不想测里刷屏，可在相关用例 mock `NODE_ENV` 或接受少量日志。

## 3. 其余改动清单（摘要）

- [`src/element.ts`](src/element.ts)：移除 `dictionaryLoad`；统一推迟逻辑；调试日志字段去掉已删 API。
- [`src/lib/pinyin-ime-editor-attr-parsers.ts`](src/lib/pinyin-ime-editor-attr-parsers.ts)：删除 `parseDictionaryLoadFromAttribute`。
- 测试、README、site、[`package.json`](package.json) major、删除悬空 [`tests/dictionary-load-source.test.ts`](tests/dictionary-load-source.test.ts)。

## 4. 验证

- `pnpm test`；`site:dev:hot` 下 `NODE_ENV` 为开发时应出现 `[pinyin-ime-editor dictionary]` 日志。
- `pnpm build` 后检查 `dist` 内已内联 `process.env.NODE_ENV` 为 `"production"`，**无**上述日志分支被执行。
