<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import RelatedKnowledge from './components/RelatedKnowledge.vue'
import PageSource from './components/PageSource.vue'
import { renderMermaidDiagrams } from './mermaid'

const { Layout } = DefaultTheme
const { page, isDark } = useData()

function scheduleMermaid() {
  if (typeof window === 'undefined') return
  nextTick(() => {
    window.setTimeout(() => {
      void renderMermaidDiagrams()
    }, 40)
  })
}

onMounted(scheduleMermaid)
watch(() => page.value.relativePath, scheduleMermaid)
watch(isDark, scheduleMermaid)
</script>

<template>
  <Layout>
    <template #aside-outline-after>
      <RelatedKnowledge />
    </template>
    <template #doc-after>
      <PageSource />
    </template>
  </Layout>
</template>
