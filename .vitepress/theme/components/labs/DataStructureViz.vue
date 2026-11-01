<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

interface TreeNode {
  value: number
  left: TreeNode | null
  right: TreeNode | null
}

type TraversalType = 'pre' | 'in' | 'post' | 'level'

const traversalLabels: Record<TraversalType, string> = {
  pre: '前序遍历',
  in: '中序遍历',
  post: '后序遍历',
  level: '层序遍历'
}

function insertNode(root: TreeNode | null, value: number): TreeNode {
  if (!root) return { value, left: null, right: null }
  if (value < root.value) root.left = insertNode(root.left, value)
  else if (value > root.value) root.right = insertNode(root.right, value)
  return root
}

function buildTree(values: number[]) {
  let root: TreeNode | null = null
  for (const value of values) root = insertNode(root, value)
  return root
}

const sample = [50, 30, 70, 20, 40, 60, 80]
const values = ref([...sample])
const inputValue = ref('55')
const traversal = ref<TraversalType>('in')
const visited = ref<number[]>([])
const active = ref<number | null>(null)
const playing = ref(false)
const feedback = ref('插入节点后会自动保持二叉搜索树性质。')
let traversalTimer: number | undefined
let flashTimer: number | undefined

const tree = computed(() => buildTree(values.value))

const layout = computed(() => {
  const nodes: { value: number; x: number; y: number; depth: number }[] = []
  let order = 0
  let maxDepth = 0

  const assign = (node: TreeNode | null, depth: number) => {
    if (!node) return
    assign(node.left, depth + 1)
    nodes.push({ value: node.value, x: 44 + order * 62, y: 44 + depth * 74, depth })
    order += 1
    maxDepth = Math.max(maxDepth, depth)
    assign(node.right, depth + 1)
  }

  assign(tree.value, 0)

  const positions = new Map(nodes.map((node) => [node.value, node]))
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = []

  const link = (node: TreeNode | null) => {
    if (!node) return
    for (const child of [node.left, node.right]) {
      if (!child) continue
      const parent = positions.get(node.value)
      const childPosition = positions.get(child.value)
      if (parent && childPosition) {
        edges.push({
          x1: parent.x,
          y1: parent.y,
          x2: childPosition.x,
          y2: childPosition.y
        })
      }
      link(child)
    }
  }

  link(tree.value)

  return {
    nodes,
    edges,
    width: Math.max(nodes.length * 62 + 32, 320),
    height: Math.max((maxDepth + 1) * 74 + 24, 180),
    maxDepth
  }
})

const height = computed(() => (values.value.length ? layout.value.maxDepth + 1 : 0))

const traversalOrder = computed(() => {
  const result: number[] = []

  const pre = (node: TreeNode | null) => {
    if (!node) return
    result.push(node.value)
    pre(node.left)
    pre(node.right)
  }
  const inOrder = (node: TreeNode | null) => {
    if (!node) return
    inOrder(node.left)
    result.push(node.value)
    inOrder(node.right)
  }
  const post = (node: TreeNode | null) => {
    if (!node) return
    post(node.left)
    post(node.right)
    result.push(node.value)
  }
  const level = (root: TreeNode | null) => {
    if (!root) return
    const queue = [root]
    while (queue.length) {
      const node = queue.shift()!
      result.push(node.value)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
  }

  if (traversal.value === 'pre') pre(tree.value)
  else if (traversal.value === 'in') inOrder(tree.value)
  else if (traversal.value === 'post') post(tree.value)
  else level(tree.value)

  return result
})

function stopTraversal() {
  playing.value = false
  if (traversalTimer !== undefined) {
    window.clearInterval(traversalTimer)
    traversalTimer = undefined
  }
}

function resetTraversal() {
  stopTraversal()
  visited.value = []
  active.value = null
}

function playTraversal() {
  resetTraversal()
  if (!traversalOrder.value.length) return

  playing.value = true
  let position = 0
  traversalTimer = window.setInterval(() => {
    if (position >= traversalOrder.value.length) {
      stopTraversal()
      active.value = null
      return
    }
    const value = traversalOrder.value[position]
    position += 1
    visited.value = [...visited.value, value]
    active.value = value
  }, 520)
}

function insert() {
  const value = Number(inputValue.value)
  if (!Number.isInteger(value) || value < 1 || value > 999) {
    feedback.value = '请输入 1 ～ 999 之间的整数。'
    return
  }
  if (values.value.includes(value)) {
    feedback.value = `节点 ${value} 已存在，二叉搜索树中不重复插入相同的值。`
    return
  }

  values.value = [...values.value, value]
  resetTraversal()
  active.value = value
  feedback.value = `已插入 ${value}。`

  if (flashTimer !== undefined) window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => {
    if (active.value === value) active.value = null
  }, 900)
}

function randomInsert() {
  if (values.value.length >= 20) {
    feedback.value = '节点较多，先清空或恢复示例再插入。'
    return
  }
  let candidate = 0
  do {
    candidate = 1 + Math.floor(Math.random() * 99)
  } while (values.value.includes(candidate))
  inputValue.value = String(candidate)
  insert()
}

function clearTree() {
  values.value = []
  resetTraversal()
  feedback.value = '已清空。输入一个数字并插入，观察根节点如何产生。'
}

function restore() {
  values.value = [...sample]
  resetTraversal()
  feedback.value = '已恢复示例树。'
}

function nodeClass(value: number) {
  return {
    'is-visited': visited.value.includes(value),
    'is-active': active.value === value
  }
}

onUnmounted(() => {
  stopTraversal()
  if (flashTimer !== undefined) window.clearTimeout(flashTimer)
})
</script>

<template>
  <div class="lab tree-lab">
    <div class="lab-head">
      <div>
        <span class="lab-kicker">Interactive · Data Structure</span>
        <p class="lab-title">二叉搜索树可视化</p>
      </div>
      <span class="tree-badge">BST</span>
    </div>

    <div class="lab-controls">
      <label class="lab-field">
        <span>节点值</span>
        <input v-model="inputValue" type="number" min="1" max="999" @keyup.enter="insert" />
      </label>
      <button class="lab-btn primary" type="button" @click="insert">插入节点</button>
      <button class="lab-btn" type="button" @click="randomInsert">随机插入</button>
      <button class="lab-btn ghost" type="button" @click="restore">恢复示例</button>
      <button class="lab-btn ghost" type="button" @click="clearTree">清空</button>

      <label class="lab-field">
        <span>遍历方式</span>
        <select v-model="traversal" @change="resetTraversal">
          <option v-for="(label, key) in traversalLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </label>
      <button class="lab-btn" type="button" @click="playTraversal">播放遍历</button>
    </div>

    <p class="feedback" aria-live="polite">{{ feedback }}</p>

    <div class="lab-stats">
      <div class="lab-stat">
        <span class="lab-stat-label">节点数</span>
        <span class="lab-stat-value">{{ values.length }}</span>
      </div>
      <div class="lab-stat">
        <span class="lab-stat-label">树高</span>
        <span class="lab-stat-value">{{ height }}</span>
      </div>
      <div class="lab-stat">
        <span class="lab-stat-label">遍历</span>
        <span class="lab-stat-value">{{ traversalLabels[traversal] }}</span>
      </div>
    </div>

    <div class="tree-canvas">
      <svg
        v-if="layout.nodes.length"
        class="tree-svg"
        :viewBox="`0 0 ${layout.width} ${layout.height}`"
        role="img"
        aria-label="二叉搜索树结构图"
      >
        <g class="edges">
          <line
            v-for="(edge, edgeIndex) in layout.edges"
            :key="edgeIndex"
            :x1="edge.x1"
            :y1="edge.y1"
            :x2="edge.x2"
            :y2="edge.y2"
          />
        </g>
        <g class="nodes">
          <g
            v-for="node in layout.nodes"
            :key="node.value"
            class="node"
            :class="nodeClass(node.value)"
            :transform="`translate(${node.x}, ${node.y})`"
          >
            <circle r="18" />
            <text text-anchor="middle" dominant-baseline="central">{{ node.value }}</text>
          </g>
        </g>
      </svg>
      <p v-else class="tree-empty">树为空。插入一个节点开始。</p>
    </div>

    <div class="order-line">
      <span class="order-label">{{ traversalLabels[traversal] }}</span>
      <div class="order-chips">
        <span
          v-for="(value, orderIndex) in traversalOrder"
          :key="`${value}-${orderIndex}`"
          class="order-chip"
          :class="{ visited: visited.includes(value) }"
        >
          {{ value }}
        </span>
        <span v-if="!traversalOrder.length" class="order-empty">暂无节点</span>
      </div>
    </div>

    <p class="lab-note">
      左子树所有值小于根，右子树所有值大于根。中序遍历会得到升序序列，这也是二叉搜索树最重要的性质之一。
    </p>
  </div>
</template>

<style scoped>
.tree-badge {
  padding: 4px 10px;
  font-family: var(--cs-mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 999px;
}

.feedback {
  min-height: 1.4em;
  margin: 0 0 8px;
  font-size: 11.5px;
  color: var(--vp-c-text-3);
}

.tree-canvas {
  display: flex;
  justify-content: center;
  padding: 10px;
  margin-bottom: 14px;
  overflow-x: auto;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-md);
}

.tree-svg {
  width: 100%;
  max-height: 420px;
}

.edges line {
  stroke: var(--cs-border-strong);
  stroke-width: 1.4;
}

.node circle {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-text-3);
  stroke-width: 1.2;
  transition: fill 0.2s ease, stroke 0.2s ease;
}

.node text {
  font-family: var(--cs-mono);
  font-size: 11px;
  font-weight: 600;
  fill: var(--vp-c-text-1);
}

.node.is-visited circle {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-2);
}

.node.is-active circle {
  fill: var(--vp-c-brand-2);
  stroke: var(--vp-c-brand-2);
}

.node.is-active text {
  fill: #ffffff;
}

.dark .node.is-active text {
  fill: #04201e;
}

.tree-empty {
  margin: 26px 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.order-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.order-label {
  font-size: 10.5px;
  color: var(--vp-c-text-3);
}

.order-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.order-chip {
  min-width: 26px;
  padding: 2px 6px;
  font-family: var(--cs-mono);
  font-size: 10.5px;
  text-align: center;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: 4px;
  transition: color 0.15s ease, background 0.15s ease;
}

.order-chip.visited {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-color: transparent;
}

.order-empty {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
</style>
