<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import type { CurriculumData, RelatedItem } from '../../data/types'

const { page, theme } = useData()

const curriculum = computed(() => (theme.value as { curriculum?: CurriculumData }).curriculum)

function pageKey(relativePath: string) {
  if (!relativePath || relativePath === 'index.md') return ''
  if (relativePath.endsWith('/README.md')) return relativePath.slice(0, -'README.md'.length)
  if (relativePath.endsWith('/index.md')) return relativePath.slice(0, -'index.md'.length)
  return relativePath.replace(/\.md$/, '')
}

const groups = computed(() => {
  const key = pageKey(page.value.relativePath)
  const related = curriculum.value?.related?.[key]
  if (!related) return []

  return [
    { key: 'courses', label: '相关课程', items: related.courses ?? [] },
    { key: 'topics', label: '知识专题', items: related.topics ?? [] },
    { key: 'labs', label: '交互实验', items: related.labs ?? [] }
  ].filter((group) => group.items.length > 0)
})

function toneClass(item: RelatedItem) {
  return item.tone ? `tone-${item.tone}` : ''
}
</script>

<template>
  <nav v-if="groups.length" class="related" aria-label="关联知识">
    <div class="related-head">
      <span class="related-eyebrow">KNOWLEDGE GRAPH</span>
      <p class="related-title">关联知识</p>
    </div>

    <section v-for="group in groups" :key="group.key" class="related-group">
      <p class="related-label">{{ group.label }}</p>
      <ul>
        <li v-for="item in group.items" :key="`${group.key}-${item.label}`">
          <a v-if="item.link" :href="withBase(item.link)" class="related-link">
            <span v-if="item.tone" class="dot" :class="toneClass(item)"></span>
            <span class="related-name">{{ item.label }}</span>
            <small v-if="item.meta">{{ item.meta }}</small>
          </a>
          <span v-else class="related-text">
            <span v-if="item.tone" class="dot" :class="toneClass(item)"></span>
            <span class="related-name">{{ item.label }}</span>
            <small v-if="item.meta">{{ item.meta }}</small>
          </span>
        </li>
      </ul>
    </section>
  </nav>
</template>

<style scoped>
.related {
  padding-top: 22px;
  margin-top: 26px;
  border-top: 1px solid var(--cs-border);
}

.related-head {
  margin-bottom: 16px;
}

.related-eyebrow {
  display: block;
  font-family: var(--cs-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--vp-c-text-3);
}

.related-title {
  margin: 4px 0 0;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-1);
}

.related-group + .related-group {
  margin-top: 16px;
}

.related-label {
  margin: 0 0 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}

.related ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.related li {
  margin: 0;
}

.related li + li {
  margin-top: 3px;
}

.related-link,
.related-text {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 2px 6px;
  padding: 4px 6px;
  border-radius: 6px;
  text-decoration: none;
}

.related-link:hover {
  background: var(--vp-c-bg-soft);
}

.related-name {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.related-link:hover .related-name {
  color: var(--vp-c-brand-1);
}

.related-link small,
.related-text small {
  grid-column: 2;
  font-size: 10px;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}

.dot {
  align-self: center;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
}

.dot.tone-active {
  background: var(--cs-amber);
}

.dot.tone-done {
  background: var(--vp-c-brand-2);
}

.dot.tone-planned {
  background: var(--vp-c-divider);
  border: 1px solid var(--vp-c-text-3);
}

.related-text .related-name {
  color: var(--vp-c-text-2);
}
</style>
