<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { withBase } from 'vitepress'

interface Cue {
  start: number
  end: number
  text: string
}

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

const props = defineProps<{
  /** YouTube 视频 id，例如 xAcTmDO6NTI */
  id: string
  title?: string
  /** 本站托管的 WebVTT 字幕文件路径，用于悬浮字幕与逐句字幕 */
  captions?: string
}>()

const POS_KEY = 'ocw-subtitle-position'
const DEFAULT_POS = { x: 50, y: 86 }

const poster = computed(() => `https://img.youtube.com/vi/${props.id}/hqdefault.jpg`)
const watchUrl = computed(() => `https://www.youtube.com/watch?v=${props.id}`)
/** 部署到子路径（GitHub Pages 的 /CS-AI-Learning/）时，字幕文件也要跟着加 base */
const captionSrc = computed(() => (props.captions ? withBase(props.captions) : ''))

const state = ref<'idle' | 'loading' | 'playing' | 'error'>('idle')
const theater = ref(false)
const showSubtitles = ref(true)
const subtitleScale = ref(1)
const currentCue = ref('')
const activeIndex = ref(-1)
const panelOpen = ref(false)
const follow = ref(true)
const cues = shallowRef<Cue[]>([])
const playerHost = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)

/* 悬浮字幕：位置用相对视频框的百分比，可拖动、可记住 */
const subPos = ref({ ...DEFAULT_POS })
const dragging = ref(false)

let dragOffset = { x: 0, y: 0 }
let player: any = null
let ticker: number | null = null
let apiPromise: Promise<any> | null = null
let pendingSeek: number | null = null

const rootClass = computed(() => ({
  'ocw-video--theater': theater.value,
  'ocw-video--playing': state.value === 'playing',
  'ocw-video--dragging': dragging.value
}))
const rootStyle = computed(() => ({
  '--ocw-sub-scale': String(subtitleScale.value)
}))
/** 悬浮字幕是 Teleport 到 body 的页面级浮层，位置按视口百分比计算 */
const subStyle = computed(() => ({
  left: `${subPos.value.x}%`,
  top: `${subPos.value.y}%`,
  '--ocw-sub-scale': String(subtitleScale.value)
}))
const subtitleVisible = computed(
  () => state.value === 'playing' && showSubtitles.value && Boolean(currentCue.value)
)
const hasSubtitles = computed(() => cues.value.length > 0)
const panelVisible = computed(() => panelOpen.value || theater.value)
const durationLabel = computed(() => {
  const last = cues.value[cues.value.length - 1]
  return last ? formatTime(last.end) : ''
})

/* -------------------------------------------------------------- 播放器初始化 */

function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previous?.()
        resolve(window.YT)
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    })
  }
  return apiPromise
}

async function activate() {
  if (state.value === 'loading' || state.value === 'playing') return
  state.value = 'loading'
  try {
    const YT = await loadYouTubeApi()
    await mountPlayer(YT)
  } catch {
    state.value = 'error'
  }
}

function mountPlayer(YT: any) {
  return new Promise<void>((resolve, reject) => {
    if (!playerHost.value) {
      reject(new Error('player host missing'))
      return
    }
    player = new YT.Player(playerHost.value, {
      videoId: props.id,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        cc_load_policy: 0,
        origin: window.location.origin
      },
      events: {
        onReady: () => {
          state.value = 'playing'
          try {
            player?.playVideo?.()
          } catch {
            /* 自动播放被拦截时保留播放器原生控件 */
          }
          hideNativeCaptions()
          if (pendingSeek !== null) {
            const target = pendingSeek
            pendingSeek = null
            try {
              player?.seekTo?.(target, true)
              player?.playVideo?.()
            } catch {
              /* 忽略 */
            }
          }
          startTicker()
          resolve()
        },
        onStateChange: (event: { data: number }) => {
          // 1 = playing：YouTube 可能按用户偏好重新打开内置字幕，这里持续关掉，避免与悬浮字幕重叠
          if (event?.data === 1) hideNativeCaptions()
        },
        onError: () => {
          state.value = 'error'
          reject(new Error('youtube player error'))
        }
      }
    })
  })
}

/* ------------------------------------------------------------------ 字幕同步 */

/** 关掉 YouTube 自带字幕，避免与本站悬浮字幕重复 */
function hideNativeCaptions() {
  try {
    player?.unloadModule?.('captions')
  } catch {
    /* 播放器可能尚未就绪 */
  }
  try {
    player?.setOption?.('captions', 'track', {})
  } catch {
    /* 同上 */
  }
}

function toSeconds(value: string) {
  const matched = /(\d+):(\d{2}):(\d{2})(?:[.,](\d{1,3}))?/.exec(value)
  if (!matched) return null
  const ms = matched[4] ? Number(matched[4].padEnd(3, '0')) : 0
  return Number(matched[1]) * 3600 + Number(matched[2]) * 60 + Number(matched[3]) + ms / 1000
}

function parseVtt(raw: string): Cue[] {
  const result: Cue[] = []
  for (const block of raw.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n').filter((line) => line.trim())
    const timeIndex = lines.findIndex((line) => line.includes('-->'))
    if (timeIndex < 0) continue
    const [from, to] = lines[timeIndex].split('-->')
    const start = toSeconds(from.trim())
    const end = toSeconds((to ?? '').trim().split(/\s+/)[0] ?? '')
    if (start === null || end === null) continue
    const text = lines
      .slice(timeIndex + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) result.push({ start, end, text })
  }
  return result.sort((a, b) => a.start - b.start)
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function startTicker() {
  stopTicker()
  ticker = window.setInterval(updateCue, 250)
  updateCue()
}

function stopTicker() {
  if (ticker !== null) {
    window.clearInterval(ticker)
    ticker = null
  }
}

function updateCue() {
  if (!cues.value.length || typeof player?.getCurrentTime !== 'function') return
  const time = player.getCurrentTime()
  if (typeof time !== 'number' || Number.isNaN(time)) return
  const index = cues.value.findIndex((item) => time >= item.start - 0.2 && time <= item.end + 0.5)
  activeIndex.value = index
  currentCue.value = index >= 0 ? cues.value[index].text : ''
}

/** 把高亮行滚动到面板垂直中央（OCW 原站不居中，这里显式对齐） */
function centerActiveRow(behavior: ScrollBehavior = 'smooth') {
  const panel = panelEl.value
  if (!panel || activeIndex.value < 0) return
  const row = panel.querySelector<HTMLElement>(`[data-index="${activeIndex.value}"]`)
  if (!row) return
  const panelRect = panel.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const offset = rowRect.top - panelRect.top - panel.clientHeight / 2 + rowRect.height / 2
  panel.scrollTo({ top: Math.max(0, panel.scrollTop + offset), behavior })
}

watch(activeIndex, () => {
  if (!panelVisible.value || !follow.value) return
  void nextTick(() => centerActiveRow())
})

function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) {
    follow.value = true
    void nextTick(() => centerActiveRow('auto'))
  }
}

function seekTo(cue: Cue) {
  follow.value = true
  if (!player?.seekTo) {
    pendingSeek = cue.start
    void activate()
    return
  }
  try {
    player.seekTo(cue.start, true)
    player?.playVideo?.()
  } catch {
    /* 播放器未就绪时忽略 */
  }
}

/* ------------------------------------------------------------ 悬浮字幕拖动 */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function onSubPointerDown(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return
  target.setPointerCapture?.(event.pointerId)
  dragging.value = true
  const centerX = (window.innerWidth * subPos.value.x) / 100
  const centerY = (window.innerHeight * subPos.value.y) / 100
  dragOffset = { x: event.clientX - centerX, y: event.clientY - centerY }
}

function onSubPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  const x = ((event.clientX - dragOffset.x) / window.innerWidth) * 100
  const y = ((event.clientY - dragOffset.y) / window.innerHeight) * 100
  subPos.value = { x: clamp(x, 8, 92), y: clamp(y, 6, 94) }
}

function onSubPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(subPos.value))
  } catch {
    /* 隐私模式下写入失败可忽略 */
  }
}

function resetSubPos() {
  subPos.value = { ...DEFAULT_POS }
  try {
    localStorage.removeItem(POS_KEY)
  } catch {
    /* 忽略 */
  }
}

/* ------------------------------------------------------------ 网页全屏与快捷键 */

function toggleTheater() {
  theater.value = !theater.value
}

/** 网页全屏时点击黑边即可退出 */
function onBackdropClick() {
  if (theater.value) theater.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && theater.value) theater.value = false
}

watch(theater, (on) => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('ocw-theater-open', on)
  if (on) follow.value = true
  void nextTick(() => centerActiveRow('auto'))
})

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  try {
    const saved = localStorage.getItem(POS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as { x?: number; y?: number }
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        subPos.value = { x: clamp(parsed.x, 10, 90), y: clamp(parsed.y, 8, 94) }
      }
    }
  } catch {
    /* 忽略损坏的本地记录 */
  }
  if (!captionSrc.value) return
  try {
    const response = await fetch(captionSrc.value)
    if (!response.ok) return
    cues.value = parseVtt(await response.text())
  } catch {
    cues.value = []
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') document.body.classList.remove('ocw-theater-open')
  stopTicker()
  try {
    player?.destroy?.()
  } catch {
    /* 播放器可能尚未创建 */
  }
  player = null
})
</script>

<template>
  <figure class="ocw-video" :class="rootClass" :style="rootStyle" @click.self="onBackdropClick">
    <div v-if="theater" class="ocw-video__theater-bar">
      <span class="ocw-video__theater-title">{{ title }}</span>
      <span class="ocw-video__theater-actions">
        <button
          v-if="hasSubtitles"
          type="button"
          class="ocw-video__btn"
          :aria-pressed="showSubtitles"
          @click="showSubtitles = !showSubtitles"
        >
          {{ showSubtitles ? '关闭字幕' : '显示字幕' }}
        </button>
        <a :href="watchUrl" target="_blank" rel="noreferrer">在 YouTube 打开</a>
        <button type="button" class="ocw-video__btn" @click="toggleTheater">退出网页全屏</button>
      </span>
    </div>

    <div class="ocw-video__frame">
      <div ref="playerHost" class="ocw-video__player" :class="{ 'is-idle': state === 'idle' }" />

      <button
        v-if="state === 'idle' || state === 'error'"
        type="button"
        class="ocw-video__poster"
        @click="activate"
      >
        <img :src="poster" :alt="title || 'MIT OCW lecture video'" loading="lazy" />
        <span class="ocw-video__play" aria-hidden="true">▶</span>
        <span class="ocw-video__label">{{ title }}</span>
      </button>

      <p v-if="state === 'loading'" class="ocw-video__status">正在加载播放器…</p>
      <p v-else-if="state === 'error'" class="ocw-video__status">
        播放器加载失败，请点「在 YouTube 打开」观看。
      </p>
    </div>

    <figcaption class="ocw-video__note">
      <span>视频来自 MIT OpenCourseWare 官方频道</span>
      <span class="ocw-video__actions">
        <template v-if="hasSubtitles">
          <button
            type="button"
            class="ocw-video__btn"
            :aria-pressed="showSubtitles"
            @click="showSubtitles = !showSubtitles"
          >
            {{ showSubtitles ? '关闭字幕' : '显示字幕' }}
          </button>
          <template v-if="showSubtitles">
            <button
              type="button"
              class="ocw-video__btn"
              aria-label="缩小字幕"
              @click="subtitleScale = Math.max(0.75, subtitleScale - 0.15)"
            >
              A−
            </button>
            <button
              type="button"
              class="ocw-video__btn"
              aria-label="放大字幕"
              @click="subtitleScale = Math.min(1.9, subtitleScale + 0.15)"
            >
              A+
            </button>
          </template>
        </template>
        <button type="button" class="ocw-video__btn" @click="toggleTheater">
          {{ theater ? '退出网页全屏' : '网页全屏' }}
        </button>
        <a :href="watchUrl" target="_blank" rel="noreferrer">在 YouTube 打开</a>
      </span>
    </figcaption>

    <section v-if="hasSubtitles" class="ocw-transcript" :class="{ 'is-theater': theater }">
      <button
        v-if="!theater"
        type="button"
        class="ocw-transcript__toggle"
        :aria-expanded="panelOpen"
        @click="togglePanel"
      >
        <span class="ocw-transcript__caret" aria-hidden="true">{{ panelOpen ? '▾' : '▸' }}</span>
        <span class="ocw-transcript__label">逐句字幕</span>
        <span class="ocw-transcript__meta">English · {{ cues.length }} 句 · {{ durationLabel }}</span>
        <span class="ocw-transcript__action">{{ panelOpen ? '收起' : '展开' }}</span>
      </button>
      <div v-else class="ocw-transcript__head">
        <span class="ocw-transcript__label">逐句字幕</span>
        <span class="ocw-transcript__meta">English · {{ cues.length }} 句 · {{ durationLabel }}</span>
      </div>

      <div
        v-if="panelVisible"
        ref="panelEl"
        class="ocw-transcript__panel"
        @wheel.passive="follow = false"
        @touchmove.passive="follow = false"
      >
        <div class="ocw-transcript__bar">
          <span class="ocw-transcript__hint">点击任一句可跳到对应时间</span>
          <button
            type="button"
            class="ocw-video__btn"
            :aria-pressed="follow"
            @click="follow = !follow"
          >
            {{ follow ? '跟随播放中' : '恢复跟随' }}
          </button>
        </div>
        <ol class="ocw-transcript__list">
          <li
            v-for="(cue, index) in cues"
            :key="index"
            :data-index="index"
            :class="{ 'is-active': index === activeIndex }"
          >
            <button type="button" @click="seekTo(cue)">
              <span class="ocw-transcript__time">{{ formatTime(cue.start) }}</span>
              <span class="ocw-transcript__text">{{ cue.text }}</span>
            </button>
          </li>
        </ol>
      </div>
    </section>
  </figure>

  <!-- 页面级悬浮字幕：挂到 body，脱离视频框，可拖到任意位置 -->
  <Teleport to="body">
    <div
      v-if="subtitleVisible"
      class="ocw-video__subs"
      :class="{ 'is-dragging': dragging }"
      :style="subStyle"
      title="按住可拖到任意位置，双击复位"
      @pointerdown.prevent="onSubPointerDown"
      @pointermove="onSubPointerMove"
      @pointerup="onSubPointerUp"
      @pointercancel="onSubPointerUp"
      @dblclick="resetSubPos"
    >
      <span class="ocw-video__subs-text">{{ currentCue }}</span>
      <button
        type="button"
        class="ocw-video__subs-close"
        aria-label="关闭悬浮字幕"
        title="关闭悬浮字幕"
        @pointerdown.stop
        @click.stop="showSubtitles = false"
      >
        ×
      </button>
    </div>
  </Teleport>
</template>
