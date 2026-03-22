<script setup lang="ts">
import { ref } from "vue";
import { getDemoRoutes } from "../common/demo-routes";
import "pinyin-ime/element";
import "pinyin-ime/pinyin-ime.css";

const r = getDemoRoutes();

const textInput = ref("");
const textTextarea = ref("");

const SHORTCUT_LINES = [
  "字母 a–z：写入拼音缓冲",
  "空格：选第一候选；无候选则上屏拼音",
  "1–n：选当前页第 n 个候选（默认每页 3 条，最大 9）",
  "= / . / 小键盘 +：下一页；- / , / 小键盘 -：上一页",
  "左右方向键：拼音串内移动光标",
  "Enter：上屏拼音；Escape：清空缓冲",
] as const;

/**
 * @param e - 自定义事件 `pinyin-ime-change`
 */
function onInputChange(e: Event) {
  const ce = e as CustomEvent<{ value: string }>;
  textInput.value = ce.detail.value;
}

/**
 * @param e - 自定义事件 `pinyin-ime-change`
 */
function onTextareaChange(e: Event) {
  const ce = e as CustomEvent<{ value: string }>;
  textTextarea.value = ce.detail.value;
}
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
      <pinyin-ime-editor :value="textInput" @pinyin-ime-change="onInputChange" />
      <p class="text-xs text-muted-foreground">
        受控值：<span class="font-mono">{{ JSON.stringify(textInput) }}</span>
      </p>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-semibold">多行（variant=&quot;textarea&quot;）</h2>
      <pinyin-ime-editor
        variant="textarea"
        :value="textTextarea"
        @pinyin-ime-change="onTextareaChange"
      />
      <p class="text-xs text-muted-foreground">
        受控值：<span class="font-mono">{{ JSON.stringify(textTextarea) }}</span>
      </p>
    </section>

    <section class="rounded-md border border-border bg-muted/40 p-4 text-sm">
      <h2 class="font-medium">快捷键</h2>
      <ul class="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
        <li v-for="line in SHORTCUT_LINES" :key="line">{{ line }}</li>
      </ul>
    </section>
  </main>
</template>
