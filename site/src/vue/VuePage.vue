<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getDemoRoutes } from "../common/demo-routes";
import { PinyinIMEEditor } from "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

/** 兜底注册自定义元素，避免依赖包副作用导入被裁剪后组件未定义。 */
if (!customElements.get("pinyin-ime-editor")) {
  customElements.define("pinyin-ime-editor", PinyinIMEEditor);
}

type DictEntry = { w: string; f: number };
type PinyinDict = Record<string, DictEntry[]>;
type PinyinHostEl = HTMLElement & {
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
};

const CDN_DICT_URL =
  "https://cdn.jsdelivr.net/npm/pinyin-ime@0.7.0/dist/dictionary/google_pinyin_dict.js";

const VUE_CDN_CODE = `<script setup lang="ts">
import { onMounted, ref } from "vue";
import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";

type DictEntry = { w: string; f: number };
type PinyinDict = Record<string, DictEntry[]>;
type PinyinHostEl = HTMLElement & {
  getDictionary?: () => Promise<PinyinDict> | PinyinDict;
};

const CDN_DICT_URL =
  "https://cdn.jsdelivr.net/npm/pinyin-ime@0.7.0/dist/dictionary/google_pinyin_dict.js";
const editorRef = ref<PinyinHostEl | null>(null);

onMounted(() => {
  const el = editorRef.value;
  if (!el) return;
  el.getDictionary = async () => {
    const mod = (await import(/* @vite-ignore */ CDN_DICT_URL)) as {
      dict: PinyinDict;
    };
    return mod.dict;
  };
});
<\/script>

<template>
  <pinyin-ime-editor ref="editorRef" editor-type="textarea" />
<\/template>`;
const VUE_LOCAL_CODE = `<script setup lang="ts">
import "pinyin-ime";
import "pinyin-ime/pinyin-ime.css";
<\/script>

<template>
  <!-- 本地词典（默认行为）：不设置 getDictionary -->
  <pinyin-ime-editor />
<\/template>`;

const r = getDemoRoutes();

const textInput = ref("");
const textTextarea = ref("");
const editorInputRef = ref<PinyinHostEl | null>(null);
const editorTextareaRef = ref<PinyinHostEl | null>(null);

const SHORTCUT_LINES = [
  "字母 a–z：写入拼音缓冲",
  "空格：选第一候选；无候选则上屏拼音",
  "1–n：选当前页第 n 个候选（默认每页 5 条，最大 9）",
  "= / . / 小键盘 +：下一页；- / , / 小键盘 -：上一页",
  "左右方向键：拼音串内移动光标",
  "Enter：上屏拼音；Escape：清空缓冲",
] as const;

/**
 * @param e - 自定义事件 `change`
 */
function onInputChange(e: Event) {
  const ce = e as CustomEvent<{ value: string }>;
  textInput.value = ce.detail.value;
}

/**
 * @param e - 自定义事件 `change`
 */
function onTextareaChange(e: Event) {
  const ce = e as CustomEvent<{ value: string }>;
  textTextarea.value = ce.detail.value;
}

/**
 * Loads dictionary module from CDN and returns exported dict.
 *
 * @returns Promise of Google pinyin dictionary
 */
async function loadCdnDict(): Promise<PinyinDict> {
  const mod = (await import(/* @vite-ignore */ CDN_DICT_URL)) as {
    dict: PinyinDict;
  };
  return mod.dict;
}

/**
 * Assigns getDictionary function to demo editors after mount.
 */
function bindDictionaryLoader(): void {
  if (editorTextareaRef.value) {
    editorTextareaRef.value.getDictionary = loadCdnDict;
  }
}

onMounted(() => {
  bindDictionaryLoader();
});
</script>

<template>
  <main class="mx-auto max-w-xl space-y-10 px-4 py-10">
    <nav class="mb-2 flex flex-wrap gap-x-4 gap-y-2" aria-label="演示页面">
      <a
        class="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        :href="r.home"
      >
        首页
      </a>
      <a
        class="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        :href="r.react"
      >
        React
      </a>
      <a class="text-sm font-medium text-foreground" :href="r.vue">Vue</a>
      <a
        class="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        :href="r.webComponent"
      >
        Web Component
      </a>
    </nav>

    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Vue 3 演示</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        在模板中使用 <code class="rounded bg-muted px-1 py-0.5 text-xs">pinyin-ime-editor</code>；Vite 需在
        <code class="rounded bg-muted px-1 py-0.5 text-xs">@vitejs/plugin-vue</code> 中配置
        <code class="rounded bg-muted px-1 py-0.5 text-xs">isCustomElement</code>（见
        <code class="rounded bg-muted px-1 py-0.5 text-xs">site/vite.config.ts</code>）。
      </p>
    </div>

    <section class="space-y-2">
      <h2 class="text-lg font-semibold">单行（默认 input）</h2>
      <pinyin-ime-editor ref="editorInputRef" :value="textInput" @change="onInputChange" />
      <p class="text-xs text-muted-foreground">
        受控值：<span class="font-mono">{{ JSON.stringify(textInput) }}</span>
      </p>
      <pre class="overflow-x-auto rounded bg-muted/40 p-3 text-xs"><code>{{ VUE_LOCAL_CODE }}</code></pre>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-semibold">多行（editor-type=&quot;textarea&quot;）</h2>
      <pinyin-ime-editor
        ref="editorTextareaRef"
        editor-type="textarea"
        :value="textTextarea"
        @change="onTextareaChange"
      />
      <p class="text-xs text-muted-foreground">
        受控值：<span class="font-mono">{{ JSON.stringify(textTextarea) }}</span>
      </p>
      <pre class="overflow-x-auto rounded bg-muted/40 p-3 text-xs"><code>{{ VUE_CDN_CODE }}</code></pre>
    </section>

    <section class="rounded-md border border-border bg-muted/40 p-4 text-sm">
      <h2 class="font-medium">快捷键</h2>
      <ul class="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
        <li v-for="line in SHORTCUT_LINES" :key="line">{{ line }}</li>
      </ul>
    </section>

  </main>
</template>
