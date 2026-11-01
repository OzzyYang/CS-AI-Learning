<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

type AlgorithmKey = 'bubble' | 'selection' | 'insertion' | 'quick'

interface Step {
  array: number[]
  comparing: number[]
  sorted: number[]
  note: string
  comparisons: number
  swaps: number
}

const algorithms: Record<
  AlgorithmKey,
  { label: string; complexity: string; stable: string; idea: string }
> = {
  bubble: {
    label: '冒泡排序',
    complexity: 'O(n²)',
    stable: '稳定',
    idea: '相邻元素两两比较，逆序则交换；每一轮把当前最大值推到末尾。'
  },
  selection: {
    label: '选择排序',
    complexity: 'O(n²)',
    stable: '不稳定',
    idea: '每一轮从未排序区间选出最小值，放到已排序区间的末尾。'
  },
  insertion: {
    label: '插入排序',
    complexity: 'O(n²)',
    stable: '稳定',
    idea: '维护一个有序前缀，把当前元素向左移动直到插入正确位置。'
  },
  quick: {
    label: '快速排序',
    complexity: '平均 O(n log n)',
    stable: '不稳定',
    idea: '选基准值分区，使左侧都小于基准、右侧都大于基准，再递归处理两侧。'
  }
}

const key = ref<AlgorithmKey>('bubble')
const base = ref([42, 17, 68, 23, 91, 8, 56, 34, 77, 12, 63, 29, 85, 5])
const steps = ref<Step[]>([])
const index = ref(0)
const playing = ref(false)
const speed = ref(160)
let timer: number | undefined

function buildSteps(input: number[], algorithm: AlgorithmKey): Step[] {
  const array = [...input]
  const result: Step[] = []
  let comparisons = 0
  let swaps = 0

  const snapshot = (comparing: number[], sorted: number[], note: string) => {
    result.push({
      array: [...array],
      comparing: [...comparing],
      sorted: [...sorted],
      note,
      comparisons,
      swaps
    })
  }

  snapshot([], [], '初始数组，准备开始')

  if (algorithm === 'bubble') {
    const sorted: number[] = []
    for (let i = 0; i < array.length - 1; i += 1) {
      for (let j = 0; j < array.length - 1 - i; j += 1) {
        comparisons += 1
        snapshot([j, j + 1], sorted, `比较 a[${j}]=${array[j]} 与 a[${j + 1}]=${array[j + 1]}`)
        if (array[j] > array[j + 1]) {
          ;[array[j], array[j + 1]] = [array[j + 1], array[j]]
          swaps += 1
          snapshot([j, j + 1], sorted, '逆序，交换两个元素')
        }
      }
      sorted.push(array.length - 1 - i)
      snapshot([], sorted, `第 ${i + 1} 轮结束，最大值就位`)
    }
  }

  if (algorithm === 'selection') {
    const sorted: number[] = []
    for (let i = 0; i < array.length - 1; i += 1) {
      let min = i
      for (let j = i + 1; j < array.length; j += 1) {
        comparisons += 1
        snapshot([min, j], sorted, `在未排序区间寻找最小值：比较 a[${min}] 与 a[${j}]`)
        if (array[j] < array[min]) min = j
      }
      if (min !== i) {
        ;[array[i], array[min]] = [array[min], array[i]]
        swaps += 1
        snapshot([i, min], sorted, `把最小值 ${array[i]} 交换到位置 ${i}`)
      }
      sorted.push(i)
      snapshot([], sorted, `已排序区间扩展到 ${i + 1} 个元素`)
    }
    sorted.push(array.length - 1)
  }

  if (algorithm === 'insertion') {
    for (let i = 1; i < array.length; i += 1) {
      const current = array[i]
      let j = i - 1
      while (j >= 0) {
        comparisons += 1
        snapshot([j, i], Array.from({ length: i }, (_, k) => k), `比较待插入值 ${current} 与 a[${j}]=${array[j]}`)
        if (array[j] <= current) break
        array[j + 1] = array[j]
        swaps += 1
        j -= 1
        snapshot([j + 1, i], Array.from({ length: i }, (_, k) => k), '较大的元素右移一位')
      }
      array[j + 1] = current
      snapshot([], Array.from({ length: i + 1 }, (_, k) => k), `把 ${current} 插入到位置 ${j + 1}`)
    }
  }

  if (algorithm === 'quick') {
    const sorted = new Set<number>()

    const sort = (lo: number, hi: number) => {
      if (lo > hi) return
      if (lo === hi) {
        sorted.add(lo)
        snapshot([], [...sorted], `子区间只剩一个元素 ${array[lo]}，自然有序`)
        return
      }

      const pivot = array[hi]
      let i = lo
      snapshot([hi], [...sorted], `选择末尾元素 ${pivot} 作为基准`)

      for (let j = lo; j < hi; j += 1) {
        comparisons += 1
        snapshot([j, hi], [...sorted], `比较 a[${j}]=${array[j]} 与基准 ${pivot}`)
        if (array[j] < pivot) {
          if (i !== j) {
            ;[array[i], array[j]] = [array[j], array[i]]
            swaps += 1
            snapshot([i, j], [...sorted], '小于基准，交换到左分区')
          }
          i += 1
        }
      }

      ;[array[i], array[hi]] = [array[hi], array[i]]
      swaps += 1
      sorted.add(i)
      snapshot([i], [...sorted], `基准 ${pivot} 归位到下标 ${i}`)

      sort(lo, i - 1)
      sort(i + 1, hi)
    }

    sort(0, array.length - 1)
  }

  result.push({
    array: [...array],
    comparing: [],
    sorted: array.map((_, i) => i),
    note: '排序完成',
    comparisons,
    swaps
  })

  return result
}

function rebuild() {
  pause()
  steps.value = buildSteps(base.value, key.value)
  index.value = 0
}

function pause() {
  playing.value = false
  if (timer !== undefined) {
    window.clearInterval(timer)
    timer = undefined
  }
}

function play() {
  if (steps.value.length < 2) return
  if (index.value >= steps.value.length - 1) index.value = 0
  playing.value = true
  pauseTimer()
  timer = window.setInterval(() => {
    if (index.value >= steps.value.length - 1) {
      pause()
      return
    }
    index.value += 1
  }, speed.value)
}

function pauseTimer() {
  if (timer !== undefined) {
    window.clearInterval(timer)
    timer = undefined
  }
}

function togglePlay() {
  if (playing.value) pause()
  else play()
}

function next() {
  pause()
  index.value = Math.min(index.value + 1, steps.value.length - 1)
}

function previous() {
  pause()
  index.value = Math.max(index.value - 1, 0)
}

function shuffle() {
  base.value = Array.from({ length: 14 }, () => 5 + Math.floor(Math.random() * 94))
  rebuild()
}

function reset() {
  rebuild()
}

const current = computed<Step>(
  () =>
    steps.value[index.value] ?? {
      array: base.value,
      comparing: [],
      sorted: [],
      note: '准备就绪',
      comparisons: 0,
      swaps: 0
    }
)

const maxValue = computed(() => Math.max(...current.value.array, 1))
const info = computed(() => algorithms[key.value])

function barHeight(value: number) {
  return `${12 + (value / maxValue.value) * 88}%`
}

function barClass(position: number) {
  return {
    'is-compare': current.value.comparing.includes(position),
    'is-sorted': current.value.sorted.includes(position)
  }
}

watch(key, rebuild)
watch(speed, () => {
  if (playing.value) play()
})

onUnmounted(pauseTimer)

rebuild()
</script>

<template>
  <div class="lab sort-lab">
    <div class="lab-head">
      <div>
        <span class="lab-kicker">Interactive · Sorting</span>
        <p class="lab-title">排序算法逐步演示</p>
      </div>
      <span class="algo-badge">{{ info.complexity }}</span>
    </div>

    <div class="lab-controls">
      <label class="lab-field">
        <span>算法</span>
        <select v-model="key">
          <option v-for="(item, value) in algorithms" :key="value" :value="value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <button class="lab-btn primary" type="button" @click="togglePlay">
        {{ playing ? '暂停' : '播放' }}
      </button>
      <button class="lab-btn" type="button" :disabled="index <= 0" @click="previous">
        上一步
      </button>
      <button class="lab-btn" type="button" :disabled="index >= steps.length - 1" @click="next">
        下一步
      </button>
      <button class="lab-btn ghost" type="button" @click="reset">重置</button>
      <button class="lab-btn ghost" type="button" @click="shuffle">打乱数组</button>

      <label class="lab-field speed-field">
        <span>速度 {{ speed }}ms</span>
        <input v-model.number="speed" type="range" min="40" max="500" step="20" />
      </label>
    </div>

    <div class="lab-stats">
      <div class="lab-stat">
        <span class="lab-stat-label">比较次数</span>
        <span class="lab-stat-value">{{ current.comparisons }}</span>
      </div>
      <div class="lab-stat">
        <span class="lab-stat-label">交换/移动</span>
        <span class="lab-stat-value">{{ current.swaps }}</span>
      </div>
      <div class="lab-stat">
        <span class="lab-stat-label">步骤</span>
        <span class="lab-stat-value">{{ index }} / {{ Math.max(steps.length - 1, 0) }}</span>
      </div>
      <div class="lab-stat">
        <span class="lab-stat-label">稳定性</span>
        <span class="lab-stat-value">{{ info.stable }}</span>
      </div>
    </div>

    <div class="bars" role="img" aria-label="排序过程柱状图">
      <div
        v-for="(value, position) in current.array"
        :key="position"
        class="bar"
        :class="barClass(position)"
        :style="{ height: barHeight(value) }"
      >
        <span class="bar-value">{{ value }}</span>
      </div>
    </div>

    <p class="step-note">{{ current.note }}</p>

    <div class="lab-legend">
      <span><i class="is-compare"></i>正在比较</span>
      <span><i class="is-sorted"></i>已就位</span>
      <span><i></i>未处理</span>
    </div>

    <p class="lab-note">
      {{ info.idea }} 观察比较与交换次数如何随输入分布变化，再对照下方的复杂度表理解渐进分析。
    </p>
  </div>
</template>

<style scoped>
.algo-badge {
  padding: 4px 10px;
  font-family: var(--cs-mono);
  font-size: 11px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 999px;
  white-space: nowrap;
}

.speed-field {
  min-width: 150px;
}

.speed-field input[type='range'] {
  width: 100%;
  accent-color: var(--vp-c-brand-2);
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 240px;
  padding: 12px 10px 0;
  margin: 16px 0 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-md);
}

.bar {
  position: relative;
  flex: 1;
  min-width: 4px;
  background: linear-gradient(180deg, rgba(100, 116, 139, 0.55), rgba(100, 116, 139, 0.25));
  border-radius: 4px 4px 2px 2px;
  transition: height 0.12s ease, background 0.12s ease;
}

.bar-value {
  position: absolute;
  top: -16px;
  left: 50%;
  font-family: var(--cs-mono);
  font-size: 9px;
  color: var(--vp-c-text-3);
  transform: translateX(-50%);
}

.bar.is-compare {
  background: linear-gradient(180deg, #f59e0b, rgba(245, 158, 11, 0.55));
}

.bar.is-sorted {
  background: linear-gradient(180deg, var(--vp-c-brand-2), rgba(13, 148, 136, 0.45));
}

.step-note {
  margin: 6px 0 0;
  font-family: var(--cs-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-2);
  min-height: 1.6em;
}

@media (max-width: 640px) {
  .bars {
    height: 180px;
    gap: 3px;
  }

  .bar-value {
    display: none;
  }
}
</style>
