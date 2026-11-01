<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import type { CurriculumData } from '../../data/types'

const { theme } = useData()
const props = defineProps<{ type: 'topics' | 'labs' }>()

const curriculum = computed(
  () => (theme.value as { curriculum?: CurriculumData }).curriculum
)

const topics = computed(() => curriculum.value?.topics ?? [])
const labs = computed(() => curriculum.value?.labs ?? [])
</script>

<template>
  <div v-if="props.type === 'topics'" class="catalog-grid">
    <a
      v-for="(topic, index) in topics"
      :key="topic.route"
      class="catalog-card"
      :href="withBase(topic.href)"
    >
      <span class="catalog-index">{{ String(index + 1).padStart(2, '0') }}</span>
      <div class="catalog-body">
        <h3>{{ topic.title }}</h3>
        <p>{{ topic.description }}</p>
        <span class="catalog-meta">{{ topic.tag }} · {{ topic.courses.length }} 个课程关联</span>
      </div>
    </a>
  </div>

  <div v-else class="catalog-grid">
    <a
      v-for="(lab, index) in labs"
      :key="lab.route"
      class="catalog-card"
      :href="withBase(lab.href)"
    >
      <span class="catalog-index">{{ String(index + 1).padStart(2, '0') }}</span>
      <div class="catalog-body">
        <h3>{{ lab.title }}</h3>
        <p>{{ lab.description }}</p>
        <span class="catalog-meta">{{ lab.difficulty }} · 约 {{ lab.minutes }} 分钟</span>
      </div>
    </a>
  </div>
</template>

<style scoped>
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin: 26px 0 8px;
}

.catalog-card {
  display: flex;
  gap: 14px;
  padding: 18px;
  text-decoration: none !important;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-md);
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.catalog-card:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-2);
  box-shadow: var(--cs-card-shadow);
}

.catalog-index {
  padding-top: 2px;
  font-family: var(--cs-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--vp-c-brand-1);
}

.catalog-body h3 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 650;
  color: var(--vp-c-text-1);
}

.catalog-body p {
  margin: 0 0 10px;
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--vp-c-text-2);
}

.catalog-meta {
  font-size: 10.5px;
  letter-spacing: 0.03em;
  color: var(--vp-c-text-3);
}
</style>

