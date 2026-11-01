<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { page, frontmatter } = useData()

const source = computed(() => page.value.relativePath)
const hidden = computed(() => Boolean(frontmatter.value.layout))
</script>

<template>
  <div v-if="!hidden && source" class="page-source-bar">
    <span>本页源文件</span>
    <code>{{ source }}</code>
    <span class="sep">·</span>
    <span>Markdown 单一来源，构建时自动生成页面</span>
  </div>
</template>

<style scoped>
.page-source-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 38px 0 0;
  padding: 10px 14px;
  font-size: 11.5px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-md);
}

.page-source-bar code {
  padding: 2px 6px;
  font-family: var(--cs-mono);
  font-size: 11px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: 5px;
}

.sep {
  opacity: 0.6;
}
</style>
