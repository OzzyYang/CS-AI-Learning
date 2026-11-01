<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import type { CurriculumData } from '../../data/types'

const { theme } = useData()
const data = computed(() => (theme.value as { curriculum?: CurriculumData }).curriculum)

const years = computed(() => data.value?.years ?? [])
const topics = computed(() => data.value?.topics ?? [])
const labs = computed(() => data.value?.labs ?? [])
const recent = computed(() => data.value?.recent ?? [])
const totals = computed(
  () =>
    data.value?.totals ?? {
      plannedHours: 0,
      passedHours: 0,
      learningHours: 0,
      courseCount: 0,
      passedCount: 0,
      learningCount: 0,
      planningCourseCount: 0,
      topicCount: 0,
      labCount: 0
    }
)

const percent = computed(() =>
  totals.value.plannedHours
    ? Math.round((totals.value.passedHours / totals.value.plannedHours) * 100)
    : 0
)

const stats = computed(() => [
  { label: '学年', value: String(years.value.length || 4) },
  { label: '计划学时', value: (totals.value.plannedHours || 1280).toLocaleString('en-US') },
  { label: '已建立课程', value: String(totals.value.courseCount || 9) },
  { label: '知识专题', value: String(totals.value.topicCount || 5) },
  { label: '交互实验', value: String(totals.value.labCount || 5) }
])

const yearViews = computed(() =>
  years.value.map((year, index) => {
    const detailed = year.courses.length > 0
    const source = detailed ? year.courses.map((course) => course.label) : year.plannedCourses
    const chips = source.slice(0, 5).map((label, chipIndex) => ({
      label,
      route: detailed ? year.courses[chipIndex]?.route ?? '' : '',
      planned: !detailed
    }))

    return {
      ...year,
      index: index + 1,
      chips,
      more: Math.max(0, source.length - chips.length),
      percent: year.plannedHours
        ? Math.round((year.passedHours / year.plannedHours) * 100)
        : 0,
      badge: year.tone === 'planned' ? '规划中' : year.status,
      courseText: detailed
        ? `${year.courseCount} 门课程已建立`
        : `${year.plannedCourses.length} 门课程待建立`
    }
  })
)

const monograms: Record<string, string> = {
  计算机网络: 'NET',
  操作系统: 'OS',
  计算机组成原理: 'CO',
  数据结构与算法: 'DS',
  人工智能: 'AI'
}

const topicViews = computed(() =>
  topics.value.map((topic, index) => ({
    ...topic,
    index: index + 1,
    monogram: monograms[topic.title] ?? topic.title.slice(0, 2)
  }))
)

const labViews = computed(() =>
  labs.value.map((lab, index) => ({
    ...lab,
    index: String(index + 1).padStart(2, '0')
  }))
)

const recentViews = computed(() => recent.value.slice(0, 6))
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">PERSONAL DIGITAL CAMPUS · 2026—2030</p>
          <h1 class="hero-title">
            <span class="title-main">CS-AI-Learning</span>
            <span class="title-sub">计算机科学与人工智能 · 四年学习平台</span>
          </h1>
          <p class="lede">
            从编程基础到 Transformer 与智能体工程：用 Markdown 编写，由 VitePress
            构建，让课程、专题与实验在四年里持续积累、相互引用。
          </p>

          <div class="hero-actions">
            <a class="btn btn-primary" :href="withBase('/00-培养方案/四年培养总纲.html')">
              开始学习路线
            </a>
            <a class="btn btn-ghost" :href="withBase('/知识专题/')">浏览知识专题</a>
          </div>

          <ul class="stat-strip" aria-label="平台概况">
            <li v-for="stat in stats" :key="stat.label">
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.label }}</span>
            </li>
          </ul>

          <p class="hero-footnote">
            Markdown-first · 无数据库 · 无后端 · 构建产物可直接静态部署
          </p>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="orb">
            <span class="orb-ring ring-a"></span>
            <span class="orb-ring ring-b"></span>
            <span class="orb-ring ring-c"></span>
            <span class="orb-core"><em>CS</em><i>×</i><b>AI</b></span>
            <span class="orb-node node-a"></span>
            <span class="orb-node node-b"></span>
            <span class="orb-node node-c"></span>
            <span class="orb-node node-d"></span>
          </div>
          <div class="orb-caption">
            <span>数学基础</span>
            <span>计算机系统</span>
            <span>机器学习</span>
            <span>智能体工程</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="roadmap-title">
      <header class="section-head">
        <p class="section-kicker">01 / 学习路线</p>
        <h2 id="roadmap-title">四年课程地图</h2>
        <p class="section-desc">
          以四年培养方案为骨架：大一打基础，大二进入系统与传统 AI，大三深入机器学习，大四完成生成式
          AI 与智能体工程。
        </p>
      </header>

      <div class="year-grid">
        <article
          v-for="year in yearViews"
          :key="year.id"
          class="year-card"
          :class="`tone-${year.tone}`"
        >
          <div class="year-top">
            <span class="year-index">{{ String(year.index).padStart(2, '0') }}</span>
            <span class="year-badge">{{ year.badge }}</span>
          </div>
          <h3>{{ year.name }}</h3>
          <p class="year-period">{{ year.period }}</p>
          <p class="year-direction">{{ year.direction }}</p>

          <div class="year-progress" :title="`已通过 ${year.percent}%`">
            <span :style="{ width: `${year.percent}%` }"></span>
          </div>
          <p class="year-meta">
            {{ year.plannedHours }} 学时 · {{ year.courseText }}
          </p>

          <div class="year-chips">
            <template v-for="chip in year.chips" :key="chip.label">
              <a v-if="chip.route" class="chip" :href="withBase(chip.route)">{{ chip.label }}</a>
              <span v-else class="chip chip-planned">{{ chip.label }}</span>
            </template>
            <span v-if="year.more" class="chip chip-more">+{{ year.more }}</span>
          </div>

          <a class="year-link" :href="withBase(year.route)">进入{{ year.name }} →</a>
        </article>
      </div>
    </section>

    <section class="section surface" aria-labelledby="progress-title">
      <header class="section-head">
        <p class="section-kicker">02 / 学习进度</p>
        <h2 id="progress-title">当前学习进度</h2>
        <p class="section-desc">进度不是打卡数字，而是由课程笔记中的「状态」自动汇总的掌握情况。</p>
      </header>

      <div class="progress-grid">
        <div
          class="progress-ring"
          :class="{ 'is-zero': percent === 0 }"
          :style="{ '--p': percent }"
        >
          <div class="ring-inner">
            <strong>{{ percent }}%</strong>
            <span>总进度</span>
          </div>
        </div>

        <div class="progress-detail">
          <div class="progress-line">
            <span>已通过课程</span>
            <strong>{{ totals.passedCount }} / {{ totals.courseCount }} 门</strong>
          </div>
          <div class="progress-line">
            <span>已完成学时</span>
            <strong>
              {{ totals.passedHours.toLocaleString('en-US') }} /
              {{ totals.plannedHours.toLocaleString('en-US') }} 小时
            </strong>
          </div>
          <div class="progress-line">
            <span>进行中课程</span>
            <strong>{{ totals.learningCount }} 门</strong>
          </div>
          <div class="progress-line">
            <span>后续规划课程</span>
            <strong>{{ totals.planningCourseCount }} 门</strong>
          </div>
          <p class="progress-note">
            数据来源：每门课程 <code>README.md</code> 中的「状态」与「学时预算」。修改后重新启动开发服务或重新构建即可刷新。
          </p>
          <a class="text-link" :href="withBase('/00-培养方案/大一课程表.html')">查看大一课程表 →</a>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="topics-title">
      <header class="section-head">
        <p class="section-kicker">03 / 知识专题</p>
        <h2 id="topics-title">跨课程的知识地图</h2>
        <p class="section-desc">
          同一个知识点可能出现在不同课程中。专题页作为唯一入口，课程只保留引用，避免重复维护。
        </p>
      </header>

      <div class="topic-grid">
        <a
          v-for="topic in topicViews"
          :key="topic.route"
          class="topic-card"
          :class="`accent-${((topic.index - 1) % 5) + 1}`"
          :href="withBase(topic.href)"
        >
          <div class="topic-top">
            <span class="topic-mono">{{ topic.monogram }}</span>
            <span class="topic-tag">{{ topic.tag }}</span>
          </div>
          <h3>{{ topic.title }}</h3>
          <p>{{ topic.description }}</p>
          <span class="card-foot">
            {{ topic.courses.length }} 个课程关联 · {{ topic.labs.length }} 个实验
            <em>进入专题 →</em>
          </span>
        </a>
      </div>
    </section>

    <section class="section surface" aria-labelledby="labs-title">
      <header class="section-head">
        <p class="section-kicker">04 / 交互实验</p>
        <h2 id="labs-title">动手理解抽象概念</h2>
        <p class="section-desc">
          只有真正需要交互的内容才使用 Vue 组件：二进制、排序、CPU、TCP 与数据结构可视化。
        </p>
      </header>

      <div class="lab-grid">
        <a
          v-for="lab in labViews"
          :key="lab.route"
          class="lab-card"
          :href="withBase(lab.href)"
        >
          <span class="lab-number">{{ lab.index }}</span>
          <h3>{{ lab.title }}</h3>
          <p>{{ lab.description }}</p>
          <span class="lab-meta">{{ lab.difficulty }} · 约 {{ lab.minutes }} 分钟</span>
        </a>
      </div>
    </section>

    <section class="section" aria-labelledby="recent-title">
      <header class="section-head section-head-row">
        <div>
          <p class="section-kicker">05 / 最近更新</p>
          <h2 id="recent-title">知识库动态</h2>
        </div>
        <a class="text-link" :href="withBase('/00-培养方案/四年培养总纲.html')">查看培养总纲 →</a>
      </header>

      <ol class="recent-list">
        <li v-for="item in recentViews" :key="item.route">
          <time>{{ item.date }}</time>
          <a :href="withBase(item.href)">{{ item.title }}</a>
          <span class="recent-kind">{{ item.kind }}</span>
        </li>
      </ol>
    </section>

    <section class="section workflow" aria-labelledby="workflow-title">
      <div class="workflow-copy">
        <p class="section-kicker">06 / 维护方式</p>
        <h2 id="workflow-title">Markdown 是唯一知识源</h2>
        <p class="section-desc">
          课程、专题、实验说明全部保存在 Markdown 中；VitePress 负责生成导航、搜索索引与静态页面。
          AI Agent 只需维护 Markdown 与必要的 Vue 组件，不修改生成后的 HTML。
        </p>
        <ul class="workflow-points">
          <li><strong>单一来源</strong>：笔记即页面，避免 Markdown 与 HTML 双份维护。</li>
          <li><strong>按需交互</strong>：普通知识保持纯 Markdown，复杂演示拆成 Vue 组件。</li>
          <li><strong>静态部署</strong>：构建结果不依赖数据库与后端，可放到 NAS 或任意静态服务器。</li>
        </ul>
      </div>

      <div class="code-card">
        <div class="code-head">
          <span></span><span></span><span></span>
          <em>terminal</em>
        </div>
        <pre><code># 安装依赖
npm install

# 本地开发（热更新）
npm run dev

# 构建静态站点到 dist/
npm run build</code></pre>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  width: 100%;
  overflow: hidden;
}

/* Hero ------------------------------------------------------------------ */

.hero {
  position: relative;
  padding: 92px 24px 64px;
  border-bottom: 1px solid var(--cs-border);
  background:
    radial-gradient(900px 420px at 78% -10%, rgba(79, 70, 229, 0.14), transparent 65%),
    radial-gradient(720px 380px at 8% 8%, rgba(13, 148, 136, 0.14), transparent 62%),
    var(--vp-c-bg);
}

.hero::before {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background-image: linear-gradient(var(--cs-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--cs-border) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.36;
  mask-image: radial-gradient(720px 420px at 50% 20%, #000 10%, transparent 78%);
}

.hero-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: 48px;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.eyebrow {
  margin: 0 0 18px;
  font-family: var(--cs-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--vp-c-brand-1);
}

.hero-title {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  line-height: 1.1;
}

.title-main {
  font-size: clamp(2.6rem, 5.6vw, 4.3rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  color: var(--vp-c-text-1);
}

.title-main::after {
  display: block;
  width: 76px;
  height: 4px;
  margin-top: 22px;
  content: '';
  border-radius: 999px;
  background: linear-gradient(90deg, var(--vp-c-brand-2), var(--cs-accent));
}

.title-sub {
  font-size: clamp(1rem, 1.6vw, 1.2rem);
  font-weight: 550;
  letter-spacing: 0.01em;
  color: var(--vp-c-text-2);
}

.lede {
  max-width: 640px;
  margin: 26px 0 0;
  font-size: 15.5px;
  line-height: 1.9;
  color: var(--vp-c-text-2);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 22px;
  font-size: 14px;
  font-weight: 650;
  text-decoration: none !important;
  border-radius: 10px;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-primary {
  color: #fff !important;
  background: linear-gradient(135deg, #0f766e, #0d9488);
  box-shadow: 0 10px 24px -12px rgba(13, 148, 136, 0.8);
}

.dark .btn-primary {
  color: #04201e !important;
  background: linear-gradient(135deg, #2dd4bf, #5eead4);
}

.btn-ghost {
  color: var(--vp-c-text-1) !important;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border-strong);
}

.btn-ghost:hover {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-bg-soft);
}

.stat-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 28px;
  margin: 42px 0 0;
  padding: 0;
  list-style: none;
}

.stat-strip li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
}

.stat-strip strong {
  font-family: var(--cs-mono);
  font-size: 19px;
  font-weight: 650;
  color: var(--vp-c-text-1);
}

.stat-strip span {
  font-size: 11.5px;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}

.hero-footnote {
  margin: 30px 0 0;
  font-family: var(--cs-mono);
  font-size: 11px;
  letter-spacing: 0.03em;
  color: var(--vp-c-text-3);
}

/* Hero orb -------------------------------------------------------------- */

.hero-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.orb {
  position: relative;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 45%, rgba(13, 148, 136, 0.2), transparent 62%);
}

.orb::before {
  position: absolute;
  inset: 84px;
  content: '';
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #5eead4, #0f766e 55%, #4f46e5);
  box-shadow: 0 24px 60px -18px rgba(13, 148, 136, 0.7);
  opacity: 0.92;
}

.orb-ring {
  position: absolute;
  border: 1px solid var(--cs-border-strong);
  border-radius: 50%;
}

.ring-a {
  inset: 12px;
  border-style: dashed;
  opacity: 0.7;
  animation: orb-spin 44s linear infinite;
}

.ring-b {
  inset: 46px;
  border-color: rgba(79, 70, 229, 0.35);
  animation: orb-spin 30s linear infinite reverse;
}

.ring-c {
  inset: 74px;
  border-color: rgba(13, 148, 136, 0.4);
}

.orb-core {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-family: var(--cs-mono);
  font-size: 21px;
  font-weight: 700;
  color: #f0fdfa;
  text-shadow: 0 1px 12px rgba(4, 32, 30, 0.4);
}

.orb-core i {
  font-style: normal;
  font-size: 13px;
  opacity: 0.75;
}

.orb-node {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-bg);
  border: 2px solid var(--vp-c-brand-2);
  box-shadow: 0 0 0 5px var(--vp-c-brand-soft);
}

.node-a {
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.node-b {
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
}

.node-c {
  bottom: 16px;
  left: 18%;
}

.node-d {
  top: 28%;
  left: 2%;
}

.orb-caption {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 6px 18px;
  font-family: var(--cs-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
}

@keyframes orb-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ring-a,
  .ring-b {
    animation: none;
  }
}

/* Sections -------------------------------------------------------------- */

.section {
  padding: 72px 24px;
}

.surface {
  background: var(--vp-c-bg-alt);
  border-block: 1px solid var(--cs-border);
}

.section-head {
  max-width: 760px;
  margin: 0 auto 38px;
  text-align: center;
}

.section-head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  max-width: 1120px;
  text-align: left;
}

.section-kicker {
  margin: 0 0 10px;
  font-family: var(--cs-mono);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.section-head h2,
.workflow h2 {
  margin: 0;
  font-size: clamp(1.5rem, 2.6vw, 2rem);
  font-weight: 760;
  letter-spacing: -0.03em;
  color: var(--vp-c-text-1);
}

.section-desc {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.85;
  color: var(--vp-c-text-2);
}

.text-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  white-space: nowrap;
}

.text-link:hover {
  color: var(--vp-c-brand-2);
}

/* Year cards ------------------------------------------------------------ */

.year-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.year-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 18px;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-lg);
  box-shadow: var(--cs-card-shadow);
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.year-card::before {
  position: absolute;
  top: 0;
  right: 18px;
  left: 18px;
  height: 2px;
  content: '';
  border-radius: 999px;
  background: linear-gradient(90deg, var(--vp-c-brand-2), var(--cs-accent));
  opacity: 0.7;
}

.year-card:hover {
  transform: translateY(-3px);
  border-color: var(--cs-border-strong);
}

.year-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.year-index {
  font-family: var(--cs-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--vp-c-text-3);
}

.year-badge {
  padding: 2px 8px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--cs-border);
  border-radius: 999px;
  white-space: nowrap;
}

.tone-done .year-badge,
.tone-active .year-badge {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-color: transparent;
}

.tone-planned .year-badge {
  color: var(--cs-amber);
}

.year-card h3 {
  margin: 14px 0 2px;
  font-size: 1.35rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

.year-period {
  margin: 0;
  font-family: var(--cs-mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}

.year-direction {
  min-height: 3.6em;
  margin: 12px 0 14px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.year-progress {
  height: 4px;
  overflow: hidden;
  background: var(--vp-c-divider);
  border-radius: 999px;
}

.year-progress span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--vp-c-brand-2), var(--cs-accent));
  border-radius: inherit;
}

.year-meta {
  margin: 8px 0 12px;
  font-size: 11.5px;
  color: var(--vp-c-text-3);
}

.year-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 16px;
}

.chip {
  padding: 2px 7px;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  text-decoration: none !important;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--cs-border);
  border-radius: 5px;
}

a.chip:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-2);
}

.chip-planned {
  color: var(--vp-c-text-3);
  border-style: dashed;
  background: transparent;
}

.chip-more {
  color: var(--vp-c-text-3);
  background: transparent;
}

.year-link {
  margin-top: auto;
  font-size: 12.5px;
  font-weight: 650;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.year-link:hover {
  color: var(--vp-c-brand-2);
}

/* Progress -------------------------------------------------------------- */

.progress-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 48px;
  max-width: 880px;
  margin: 0 auto;
}

.progress-ring {
  --p: 0;
  position: relative;
  display: grid;
  flex: 0 0 auto;
  width: 176px;
  height: 176px;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(
    var(--vp-c-brand-2) calc(var(--p) * 1%),
    var(--vp-c-divider) 0
  );
}

.progress-ring.is-zero {
  background: var(--vp-c-divider);
}

.progress-ring::before {
  position: absolute;
  inset: 13px;
  content: '';
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: 50%;
}

.ring-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
}

.ring-inner strong {
  font-family: var(--cs-mono);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--vp-c-text-1);
}

.ring-inner span {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--vp-c-text-3);
}

.progress-detail {
  flex: 1 1 320px;
  max-width: 440px;
}

.progress-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  border-bottom: 1px dashed var(--cs-border);
}

.progress-line strong {
  font-family: var(--cs-mono);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.progress-note {
  margin: 16px 0 12px;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--vp-c-text-3);
}

.progress-note code {
  font-family: var(--cs-mono);
  font-size: 11px;
  color: var(--vp-c-text-2);
}

/* Topics ---------------------------------------------------------------- */

.topic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.topic-card {
  display: flex;
  flex-direction: column;
  padding: 22px;
  text-decoration: none !important;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-lg);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.topic-card:hover {
  transform: translateY(-3px);
  border-color: var(--cs-border-strong);
  box-shadow: var(--cs-card-shadow);
}

.topic-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.topic-mono {
  display: inline-grid;
  width: 44px;
  height: 44px;
  place-items: center;
  font-family: var(--cs-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
  border-radius: 12px;
  background: linear-gradient(135deg, #0f766e, #0d9488);
}

.accent-2 .topic-mono {
  background: linear-gradient(135deg, #4338ca, #6366f1);
}

.accent-3 .topic-mono {
  background: linear-gradient(135deg, #b45309, #f59e0b);
}

.accent-4 .topic-mono {
  background: linear-gradient(135deg, #0e7490, #06b6d4);
}

.accent-5 .topic-mono {
  background: linear-gradient(135deg, #7e22ce, #a855f7);
}

.topic-tag {
  font-family: var(--cs-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--vp-c-text-3);
}

.topic-card h3 {
  margin: 16px 0 8px;
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--vp-c-text-1);
}

.topic-card p {
  flex: 1;
  margin: 0 0 18px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

.card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.card-foot em {
  font-style: normal;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

/* Labs ------------------------------------------------------------------ */

.lab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
  max-width: 1200px;
  margin: 0 auto;
}

.lab-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  text-decoration: none !important;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-md);
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.lab-card:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-2);
}

.lab-number {
  font-family: var(--cs-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--vp-c-brand-1);
}

.lab-card h3 {
  margin: 12px 0 8px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.lab-card p {
  flex: 1;
  margin: 0 0 16px;
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--vp-c-text-2);
}

.lab-meta {
  font-size: 10.5px;
  letter-spacing: 0.03em;
  color: var(--vp-c-text-3);
}

/* Recent ---------------------------------------------------------------- */

.recent-list {
  max-width: 880px;
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.recent-list li {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: baseline;
  padding: 14px 4px;
  border-bottom: 1px solid var(--cs-border);
}

.recent-list time {
  font-family: var(--cs-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-3);
}

.recent-list a {
  font-size: 13.5px;
  font-weight: 550;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.recent-list a:hover {
  color: var(--vp-c-brand-1);
}

.recent-kind {
  padding: 2px 8px;
  font-size: 10px;
  color: var(--vp-c-text-3);
  border: 1px solid var(--cs-border);
  border-radius: 999px;
  white-space: nowrap;
}

/* Workflow -------------------------------------------------------------- */

.workflow {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 48px;
  align-items: center;
  max-width: 1120px;
  margin: 0 auto;
}

.workflow-copy .section-desc {
  max-width: 560px;
}

.workflow-points {
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.workflow-points li {
  position: relative;
  margin: 0 0 12px;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

.workflow-points li::before {
  position: absolute;
  top: 0.7em;
  left: 0;
  width: 7px;
  height: 7px;
  content: '';
  border-radius: 2px;
  background: linear-gradient(135deg, var(--vp-c-brand-2), var(--cs-accent));
}

.workflow-points strong {
  color: var(--vp-c-text-1);
}

.code-card {
  overflow: hidden;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: var(--cs-radius-lg);
  box-shadow: 0 24px 50px -30px rgba(2, 6, 23, 0.8);
}

.code-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 11px 14px;
  background: rgba(148, 163, 184, 0.08);
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.code-head span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #f87171;
}

.code-head span:nth-child(2) {
  background: #fbbf24;
}

.code-head span:nth-child(3) {
  background: #34d399;
}

.code-head em {
  margin-left: auto;
  font-family: var(--cs-mono);
  font-size: 10px;
  font-style: normal;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.code-card pre {
  margin: 0;
  padding: 20px 22px;
  overflow-x: auto;
}

.code-card code {
  font-family: var(--cs-mono);
  font-size: 12.5px;
  line-height: 1.9;
  color: #e2e8f0;
  background: transparent;
}

/* Responsive ------------------------------------------------------------ */

@media (max-width: 1080px) {
  .year-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .hero {
    padding: 64px 20px 48px;
  }

  .hero-grid {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .hero-visual {
    display: none;
  }

  .orb {
    width: 200px;
    height: 200px;
  }

  .orb::before {
    inset: 56px;
  }

  .orb-core {
    font-size: 16px;
  }

  .orb-caption {
    display: none;
  }

  .workflow {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}

@media (max-width: 640px) {
  .section {
    padding: 52px 18px;
  }

  .year-grid {
    grid-template-columns: 1fr;
  }

  .year-direction {
    min-height: 0;
  }

  .progress-grid {
    gap: 28px;
  }

  .recent-list li {
    grid-template-columns: 82px minmax(0, 1fr);
  }

  .recent-kind {
    display: none;
  }

  .section-head {
    text-align: left;
  }

  .stat-strip {
    gap: 12px 22px;
  }
}
</style>


