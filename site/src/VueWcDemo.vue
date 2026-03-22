<script setup lang="ts">
import { ref } from "vue";
import "pinyin-ime/element";
import "pinyin-ime/pinyin-ime.css";

const text = ref("");

/**
 * @param e - 自定义事件 `pinyin-ime-change`
 */
function onPinyinChange(e: Event) {
  const ce = e as CustomEvent<{ value: string }>;
  text.value = ce.detail.value;
}
</script>

<template>
  <div class="space-y-2">
    <pinyin-ime-editor
      :value="text"
      @pinyin-ime-change="onPinyinChange"
    />
    <p class="text-xs text-muted-foreground">
      受控值：<span class="font-mono">{{ JSON.stringify(text) }}</span>
    </p>
    <p class="text-xs text-muted-foreground">
      在 Vue 中需将 <code class="rounded bg-muted px-1">pinyin-ime-editor</code> 视为自定义元素；Vite 需在
      <code class="rounded bg-muted px-1">@vitejs/plugin-vue</code> 里配置
      <code class="rounded bg-muted px-1">isCustomElement</code>（见本仓库
      <code class="rounded bg-muted px-1">site/vite.config.ts</code>）。
    </p>
  </div>
</template>
