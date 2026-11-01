<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

const MEMORY_SIZE = 32

const opcodes: Record<string, number> = {
  LOAD: 1,
  STORE: 2,
  ADD: 3,
  SUB: 4,
  JMP: 5,
  JZ: 6,
  HLT: 7
}

type Cell = number | string

interface Preset {
  name: string
  description: string
  cells: Record<number, Cell>
}

const presets: Record<string, Preset> = {
  sum: {
    name: '累加 1…N',
    description: '用循环把 1 到 N 累加到地址 15，N 初始为 5。',
    cells: {
      0: 'LOAD 12',
      1: 'STORE 13',
      2: 'LOAD 14',
      3: 'STORE 15',
      4: 'LOAD 13',
      5: 'JZ 17',
      6: 'ADD 15',
      7: 'STORE 15',
      8: 'LOAD 13',
      9: 'SUB 16',
      10: 'STORE 13',
      11: 'JMP 4',
      12: 5,
      13: 0,
      14: 0,
      15: 0,
      16: 1,
      17: 'HLT'
    }
  },
  countdown: {
    name: '倒数循环',
    description: '从 5 开始逐次减 1，减到 0 时跳转到停机指令。',
    cells: {
      0: 'LOAD 12',
      1: 'STORE 13',
      2: 'LOAD 13',
      3: 'JZ 7',
      4: 'SUB 14',
      5: 'STORE 13',
      6: 'JMP 2',
      7: 'HLT',
      12: 5,
      13: 0,
      14: 1
    }
  },
  add: {
    name: '两数相加',
    description: '读取地址 12 与 13 的两个数，结果写回地址 14。',
    cells: {
      0: 'LOAD 12',
      1: 'ADD 13',
      2: 'STORE 14',
      3: 'HLT',
      12: 7,
      13: 8,
      14: 0
    }
  }
}

interface LogEntry {
  pc: number
  instruction: string
  acc: number
  note: string
}

function encode(instruction: string) {
  const [name, argument] = instruction.trim().split(/\s+/)
  if (name === 'HLT') return opcodes.HLT * 1000
  return (opcodes[name] ?? 0) * 1000 + Number(argument ?? 0)
}

function decode(cell: number) {
  const op = Math.floor(cell / 1000)
  const argument = cell % 1000
  const name = Object.keys(opcodes).find((item) => opcodes[item] === op)
  if (!name) return null
  return {
    op,
    name,
    argument,
    text: name === 'HLT' ? 'HLT' : `${name} ${argument}`
  }
}

function buildMemory(preset: Preset) {
  return Array.from({ length: MEMORY_SIZE }, (_, address) => {
    const cell = preset.cells[address]
    if (typeof cell === 'number') return cell
    if (typeof cell === 'string') return encode(cell)
    return 0
  })
}

const presetKey = ref<keyof typeof presets>('sum')
const memory = ref<number[]>(buildMemory(presets.sum))
const pc = ref(0)
const acc = ref(0)
const ir = ref(0)
const halted = ref(false)
const running = ref(false)
const lastAction = ref('点击「单步执行」开始取指、译码与执行。')
const log = ref<LogEntry[]>([])

let timer: number | undefined

function stopTimer() {
  running.value = false
  if (timer !== undefined) {
    window.clearInterval(timer)
    timer = undefined
  }
}

function loadPreset(key: keyof typeof presets) {
  stopTimer()
  presetKey.value = key
  memory.value = buildMemory(presets[key])
  pc.value = 0
  acc.value = 0
  ir.value = 0
  halted.value = false
  log.value = []
  lastAction.value = `已载入「${presets[key].name}」，PC = 0。`
}

function step() {
  if (halted.value) return

  const address = pc.value
  const cell = memory.value[address]
  const instruction = decode(cell)
  ir.value = cell

  if (!instruction) {
    halted.value = true
    lastAction.value = `地址 ${address} 的内容 ${cell} 不是有效指令，停止执行。`
    return
  }

  pc.value = (address + 1) % MEMORY_SIZE
  let note = ''

  switch (instruction.op) {
    case opcodes.LOAD:
      acc.value = memory.value[instruction.argument] ?? 0
      note = `LOAD：ACC ← mem[${instruction.argument}] = ${acc.value}`
      break
    case opcodes.STORE:
      memory.value[instruction.argument] = acc.value
      note = `STORE：mem[${instruction.argument}] ← ACC = ${acc.value}`
      break
    case opcodes.ADD:
      acc.value += memory.value[instruction.argument] ?? 0
      note = `ADD：ACC ← ACC + mem[${instruction.argument}] = ${acc.value}`
      break
    case opcodes.SUB:
      acc.value -= memory.value[instruction.argument] ?? 0
      note = `SUB：ACC ← ACC - mem[${instruction.argument}] = ${acc.value}`
      break
    case opcodes.JMP:
      pc.value = instruction.argument
      note = `JMP：PC ← ${instruction.argument}`
      break
    case opcodes.JZ:
      if (acc.value === 0) {
        pc.value = instruction.argument
        note = `JZ：ACC = 0，PC ← ${instruction.argument}`
      } else {
        note = 'JZ：ACC ≠ 0，顺序执行下一条'
      }
      break
    case opcodes.HLT:
      halted.value = true
      note = 'HLT：停机'
      break
    default:
      halted.value = true
      note = '未知指令，停机'
  }

  lastAction.value = note
  log.value.unshift({ pc: address, instruction: instruction.text, acc: acc.value, note })
  if (log.value.length > 14) log.value = log.value.slice(0, 14)
  if (halted.value) stopTimer()
}

function toggleRun() {
  if (running.value) {
    stopTimer()
    return
  }
  if (halted.value) loadPreset(presetKey.value)
  running.value = true
  timer = window.setInterval(() => {
    if (halted.value) {
      stopTimer()
      return
    }
    step()
  }, 620)
}

function onPresetChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  loadPreset(value)
}

function reset() {
  loadPreset(presetKey.value)
}

const nextInstruction = computed(() => decode(memory.value[pc.value] ?? 0))
const maxAddress = computed(() => {
  for (let address = MEMORY_SIZE - 1; address >= 0; address -= 1) {
    if (memory.value[address] !== 0) return address
  }
  return 0
})
const programRows = computed(() =>
  Array.from({ length: Math.min(MEMORY_SIZE, Math.max(maxAddress.value + 1, 18)) }, (_, address) => {
    const cell = memory.value[address]
    return {
      address,
      cell,
      instruction: decode(cell),
      isCurrent: address === pc.value && !halted.value,
      isData: decode(cell) === null && cell !== 0
    }
  })
)

const activePreset = computed(() => presets[presetKey.value])

onUnmounted(stopTimer)
</script>

<template>
  <div class="lab cpu-lab">
    <div class="lab-head">
      <div>
        <span class="lab-kicker">Interactive · CPU</span>
        <p class="lab-title">CPU 取指—译码—执行模拟器</p>
      </div>
      <span class="cpu-status" :class="{ halted }">{{ halted ? 'HALTED' : 'RUNNING' }}</span>
    </div>

    <div class="lab-controls">
      <label class="lab-field">
        <span>示例程序</span>
        <select :value="presetKey" @change="onPresetChange">
          <option v-for="(preset, key) in presets" :key="key" :value="key">
            {{ preset.name }}
          </option>
        </select>
      </label>
      <button class="lab-btn primary" type="button" @click="toggleRun">
        {{ running ? '暂停' : '自动运行' }}
      </button>
      <button class="lab-btn" type="button" :disabled="halted" @click="step">单步执行</button>
      <button class="lab-btn ghost" type="button" @click="reset">重置程序</button>
    </div>

    <p class="preset-desc">{{ activePreset.description }}</p>

    <div class="cpu-grid">
      <div class="cpu-panel">
        <p class="panel-label">寄存器</p>
        <div class="register-grid">
          <div class="register">
            <span>PC</span>
            <strong>{{ pc }}</strong>
          </div>
          <div class="register">
            <span>IR</span>
            <strong>{{ ir }}</strong>
          </div>
          <div class="register">
            <span>ACC</span>
            <strong>{{ acc }}</strong>
          </div>
          <div class="register">
            <span>状态</span>
            <strong>{{ halted ? '停机' : '运行' }}</strong>
          </div>
        </div>

        <p class="panel-label">程序与数据（地址 0 起）</p>
        <div class="program-table">
          <div
            v-for="row in programRows"
            :key="row.address"
            class="program-row"
            :class="{ current: row.isCurrent, data: row.isData }"
          >
            <span class="cell-address">{{ String(row.address).padStart(2, '0') }}</span>
            <span class="cell-raw">{{ row.cell }}</span>
            <span class="cell-text">
              {{ row.instruction ? row.instruction.text : row.cell === 0 ? '—' : '数据' }}
            </span>
          </div>
        </div>
      </div>

      <div class="cpu-panel">
        <p class="panel-label">内存（32 × 16 bit 概念模型）</p>
        <div class="memory-grid">
          <div
            v-for="(cell, address) in memory"
            :key="address"
            class="memory-cell"
            :class="{ current: address === pc, data: decode(cell) === null && cell !== 0 }"
          >
            <span class="memory-address">{{ address }}</span>
            <span class="memory-value">{{ cell }}</span>
          </div>
        </div>

        <div class="action-panel">
          <p class="panel-label">当前动作</p>
          <p class="action-text">{{ lastAction }}</p>
          <p v-if="!halted" class="action-next">
            下一条：<code>{{ nextInstruction ? nextInstruction.text : '—' }}</code>
          </p>
        </div>

        <div class="log-panel">
          <p class="panel-label">执行轨迹</p>
          <ol class="trace">
            <li v-for="(entry, index) in log" :key="index">
              <span class="trace-pc">PC={{ entry.pc }}</span>
              <span class="trace-inst">{{ entry.instruction }}</span>
              <span class="trace-note">{{ entry.note }}</span>
            </li>
            <li v-if="!log.length" class="trace-empty">尚未执行指令。</li>
          </ol>
        </div>
      </div>
    </div>

    <p class="lab-note">
      指令以 <code>opcode × 1000 + 地址</code> 的形式存放在内存中，例如
      <code>1012</code> 表示 <code>LOAD 12</code>。这个模型省略了真实的时序、总线与流水线细节，用于理解
      「取指—译码—执行」的控制流。
    </p>
  </div>
</template>

<style scoped>
.cpu-status {
  padding: 4px 10px;
  font-family: var(--cs-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: #b45309;
  background: rgba(245, 158, 11, 0.14);
  border-radius: 999px;
}

.cpu-status.halted {
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
}

.preset-desc {
  margin: 0 0 14px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}

.cpu-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: 14px;
}

.cpu-panel {
  min-width: 0;
  padding: 14px;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-md);
}

.panel-label {
  margin: 0 0 8px;
  font-family: var(--cs-mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.register-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 16px;
}

.register {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--cs-border);
  border-radius: 7px;
}

.register span {
  font-family: var(--cs-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--vp-c-text-3);
}

.register strong {
  font-family: var(--cs-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.program-table {
  max-height: 322px;
  overflow-y: auto;
  border: 1px solid var(--cs-border);
  border-radius: 7px;
}

.program-row {
  display: grid;
  grid-template-columns: 30px 60px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 4px 8px;
  font-family: var(--cs-mono);
  font-size: 11px;
  border-bottom: 1px solid var(--cs-border);
}

.program-row:last-child {
  border-bottom: none;
}

.program-row.current {
  background: var(--vp-c-brand-soft);
}

.program-row.data .cell-text {
  color: var(--vp-c-text-3);
}

.cell-address {
  color: var(--vp-c-text-3);
}

.cell-raw {
  color: var(--cs-accent);
}

.cell-text {
  color: var(--vp-c-text-1);
}

.memory-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 3px;
  margin-bottom: 14px;
}

.memory-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 1px;
  background: var(--vp-c-bg-soft);
  border: 1px solid transparent;
  border-radius: 4px;
}

.memory-cell.current {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-soft);
}

.memory-cell.data {
  background: rgba(79, 70, 229, 0.08);
}

.memory-address {
  font-family: var(--cs-mono);
  font-size: 7.5px;
  color: var(--vp-c-text-3);
}

.memory-value {
  font-family: var(--cs-mono);
  font-size: 9.5px;
  color: var(--vp-c-text-1);
}

.action-panel {
  padding: 10px;
  margin-bottom: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--cs-border);
  border-radius: 8px;
}

.action-text {
  margin: 0;
  font-family: var(--cs-mono);
  font-size: 11px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
}

.action-next {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.action-next code {
  font-family: var(--cs-mono);
  color: var(--vp-c-brand-1);
}

.log-panel {
  min-height: 90px;
}

.trace {
  max-height: 150px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.trace li {
  display: grid;
  grid-template-columns: 52px 78px minmax(0, 1fr);
  gap: 6px;
  padding: 3px 0;
  font-family: var(--cs-mono);
  font-size: 9.5px;
  border-bottom: 1px dashed var(--cs-border);
}

.trace-pc {
  color: var(--vp-c-text-3);
}

.trace-inst {
  color: var(--cs-accent);
}

.trace-note {
  overflow: hidden;
  color: var(--vp-c-text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trace-empty {
  display: block;
  font-family: var(--vp-font-family-base);
  font-size: 11px;
  color: var(--vp-c-text-3);
}

@media (max-width: 900px) {
  .cpu-grid {
    grid-template-columns: 1fr;
  }

  .register-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

