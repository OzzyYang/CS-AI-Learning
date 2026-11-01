<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import type { CurriculumData } from '../../data/types'

const props = defineProps<{ year: string }>()
const { theme } = useData()

const curriculum = computed(() => (theme.value as { curriculum?: CurriculumData }).curriculum)
const year = computed(() => curriculum.value?.years.find((item) => item.name === props.year))

const percent = computed(() => {
  const current = year.value
  if (!current || !current.plannedHours) return 0
  return Math.round((current.passedHours / current.plannedHours) * 100)
})
</script>

<template>
  <div v-if="year" class="year-overview">
    <div class="yo-head">
      <span class="yo-kicker">{{ year.period || '培养方案' }}</span>
      <span class="yo-badge" :class="`tone-${year.tone}`">
        {{ year.tone === 'planned' ? '规划中' : year.status }}
      </span>
    </div>
    <p class="yo-direction">{{ year.direction }}</p>

    <div class="yo-stats">
      <div>
        <strong>{{ year.plannedHours }}</strong>
        <span>计划学时</span>
      </div>
      <div>
        <strong>{{ year.courseCount }}</strong>
        <span>已建立课程</span>
      </div>
      <div>
        <strong>{{ year.passedCount }}</strong>
        <span>已通过</span>
      </div>
      <div>
        <strong>{{ percent }}%</strong>
        <span>完成度</span>
      </div>
    </div>

    <div class="yo-semesters">
      <section v-for="semester in year.semesters" :key="semester.id" class="yo-semester">
        <header>
          <h3>{{ semester.title }}</h3>
          <span>{{ semester.hours }} 学时</span>
        </header>
        <ul>
          <li v-for="course in semester.courses" :key="course.route">
            <a :href="withBase(course.route)">
              <span class="dot" :class="`tone-${course.tone}`"></span>
              <span class="course-label">{{ course.label }}</span>
              <span class="course-hours">{{ course.hours }}h</span>
              <span class="course-status">{{ course.status }}</span>
            </a>
          </li>
        </ul>
      </section>
    </div>

    <div v-if="year.plannedCourses.length" class="yo-planned">
      <h3>规划中的课程</h3>
      <div class="yo-chips">
        <span v-for="name in year.plannedCourses" :key="name">{{ name }}</span>
      </div>
    </div>

    <div v-if="year.extras.length" class="yo-extras">
      <a v-for="extra in year.extras" :key="extra.label" :href="withBase(extra.link || '/')">
        {{ extra.label }} →
      </a>
    </div>
  </div>
</template>

<style scoped>
.year-overview {
  margin: 26px 0 34px;
  padding: 22px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-lg);
}

.yo-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.yo-kicker {
  font-family: var(--cs-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--vp-c-text-3);
}

.yo-badge {
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: 999px;
}

.yo-badge.tone-active,
.yo-badge.tone-done {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-color: transparent;
}

.yo-badge.tone-planned {
  color: var(--cs-amber);
}

.yo-direction {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

.yo-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 18px 0 22px;
  padding: 14px 0;
  border-block: 1px solid var(--cs-border);
}

.yo-stats div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.yo-stats strong {
  font-family: var(--cs-mono);
  font-size: 18px;
  font-weight: 650;
  color: var(--vp-c-text-1);
}

.yo-stats span {
  font-size: 10.5px;
  color: var(--vp-c-text-3);
}

.yo-semesters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.yo-semester {
  padding: 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-md);
}

.yo-semester header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 10px;
  margin-bottom: 8px;
  border-bottom: 1px dashed var(--cs-border);
}

.yo-semester h3 {
  margin: 0;
  font-size: 13.5px;
  font-weight: 650;
  color: var(--vp-c-text-1);
}

.yo-semester header span {
  font-family: var(--cs-mono);
  font-size: 10.5px;
  color: var(--vp-c-text-3);
}

.yo-semester ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.yo-semester li {
  margin: 0;
}

.yo-semester li + li {
  border-top: 1px solid var(--cs-border);
}

.yo-semester a {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto auto;
  gap: 9px;
  align-items: center;
  padding: 8px 2px;
  font-size: 12.5px;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.yo-semester a:hover .course-label {
  color: var(--vp-c-brand-1);
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
}

.dot.tone-active {
  background: var(--cs-amber);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.16);
}

.dot.tone-done {
  background: var(--vp-c-brand-2);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.dot.tone-planned {
  background: var(--vp-c-divider);
}

.course-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-hours {
  font-family: var(--cs-mono);
  font-size: 10.5px;
  color: var(--vp-c-text-3);
}

.course-status {
  font-size: 10px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.yo-planned {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--cs-border);
}

.yo-planned h3 {
  margin: 0 0 10px;
  font-size: 12.5px;
  font-weight: 650;
  color: var(--vp-c-text-2);
}

.yo-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.yo-chips span {
  padding: 2px 8px;
  font-size: 10.5px;
  color: var(--vp-c-text-3);
  border: 1px dashed var(--cs-border-strong);
  border-radius: 5px;
}

.yo-extras {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 18px;
}

.yo-extras a {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

@media (max-width: 640px) {
  .year-overview {
    padding: 16px;
  }

  .yo-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
