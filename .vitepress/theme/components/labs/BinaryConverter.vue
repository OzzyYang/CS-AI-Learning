<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const width = ref(8)
const signed = ref(false)
const raw = ref(42n)
const decimalInput = ref('42')
const error = ref('')

const mask = computed(() => (1n << BigInt(width.value)) - 1n)
const unsignedMax = computed(() => mask.value)
const signedMax = computed(() => (1n << BigInt(width.value - 1)) - 1n)
const signedMin = computed(() => -(1n << BigInt(width.value - 1)))

const displayValue = computed(() => {
  const signBit = 1n << BigInt(width.value - 1)
  return signed.value && (raw.value & signBit) !== 0n
    ? raw.value - (1n << BigInt(width.value))
    : raw.value
})

const bits = computed(() =>
  Array.from({ length: width.value }, (_, index) =>
    Number((raw.value >> BigInt(width.value - 1 - index)) & 1n)
  )
)

const binary = computed(() => raw.value.toString(2).padStart(width.value, '0'))
const groupedBinary = computed(() => binary.value.replace(/(.{4})(?=.)/g, '$1 '))
const hex = computed(() =>
  raw.value.toString(16).toUpperCase().padStart(Math.ceil(width.value / 4), '0')
)
const octal = computed(() =>
  raw.value.toString(8).padStart(Math.ceil(width.value / 3), '0')
)

function sync() {
  error.value = ''
  decimalInput.value = displayValue.value.toString()
}

function setRaw(next: bigint) {
  raw.value = next & mask.value
  sync()
}

function applyDecimal() {
  const text = decimalInput.value.trim()
  if (!/^[+-]?\d+$/.test(text)) {
    error.value = '请输入十进制整数，例如 42 或 -1。'
    return
  }

  const parsed = BigInt(text)
  if (signed.value) {
    if (parsed < signedMin.value || parsed > signedMax.value) {
      error.value = `${width.value} 位有符号整数的范围是 ${signedMin.value} ～ ${signedMax.value}。`
      return
    }
  } else if (parsed < 0n || parsed > unsignedMax.value) {
    error.value = `${width.value} 位无符号整数的范围是 0 ～ ${unsignedMax.value}。`
    return
  }

  if (parsed < 0n) setRaw((1n << BigInt(width.value)) + parsed)
  else setRaw(parsed)
}

function toggleBit(index: number) {
  const position = BigInt(width.value - 1 - index)
  setRaw(raw.value ^ (1n << position))
}

function preset(value: number) {
  const target = BigInt(value)
  if (target < 0n) {
    signed.value = true
    setRaw((1n << BigInt(width.value)) + target)
    return
  }
  signed.value = false
  setRaw(target)
}

function presetMax() {
  signed.value = false
  setRaw(unsignedMax.value)
}

watch(width, () => {
  raw.value = raw.value & mask.value
  sync()
})

watch(signed, sync)
</script>

<template>
  <div class="lab binary-lab">
    <div class="lab-head">
      <div>
        <span class="lab-kicker">Interactive · Base Converter</span>
        <p class="lab-title">二进制 / 补码转换器</p>
      </div>
      <span class="bit-width-badge">{{ width }} bit</span>
    </div>

    <div class="lab-controls">
      <label class="lab-field">
        <span>位宽</span>
        <select v-model.number="width">
          <option :value="4">4 位</option>
          <option :value="8">8 位</option>
          <option :value="16">16 位</option>
          <option :value="32">32 位</option>
        </select>
      </label>

      <label class="lab-check">
        <input v-model="signed" type="checkbox" />
        有符号（补码）
      </label>

      <label class="lab-field">
        <span>十进制输入</span>
        <input v-model="decimalInput" type="text" inputmode="numeric" @keyup.enter="applyDecimal" />
      </label>

      <button class="lab-btn primary" type="button" @click="applyDecimal">转换</button>

      <button class="lab-btn ghost" type="button" @click="preset(42)">42</button>
      <button class="lab-btn ghost" type="button" @click="preset(-1)">-1</button>
      <button class="lab-btn ghost" type="button" @click="presetMax">MAX</button>
    </div>

    <p v-if="error" class="lab-error">{{ error }}</p>

    <div class="bit-grid" :data-width="width">
      <button
        v-for="(bit, index) in bits"
        :key="index"
        type="button"
        class="bit"
        :class="{ on: bit === 1 }"
        :aria-pressed="bit === 1"
        :title="`翻转第 ${width - index} 位（权重 2^${width - 1 - index}）`"
        @click="toggleBit(index)"
      >
        <span class="bit-value">{{ bit }}</span>
        <span class="bit-weight">2<sup>{{ width - 1 - index }}</sup></span>
      </button>
    </div>

    <div class="result-grid">
      <div class="result">
        <span>二进制</span>
        <code>{{ groupedBinary }}</code>
      </div>
      <div class="result">
        <span>十六进制</span>
        <code>0x{{ hex }}</code>
      </div>
      <div class="result">
        <span>八进制</span>
        <code>0o{{ octal }}</code>
      </div>
      <div class="result">
        <span>当前解释值</span>
        <code>{{ displayValue.toString() }}</code>
      </div>
    </div>

    <p class="lab-note">
      点击任意位可以翻转比特。无符号范围 <code>0 ～ {{ unsignedMax }}</code>；有符号补码范围
      <code>{{ signedMin }} ～ {{ signedMax }}</code
      >。同一个位模式在不同解释下可能对应不同的十进制值。
    </p>
  </div>
</template>

<style scoped>
.bit-width-badge {
  padding: 4px 10px;
  font-family: var(--cs-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 999px;
}

.bit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
  gap: 6px;
  margin: 18px 0;
}

.bit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 8px 4px 6px;
  font-family: var(--cs-mono);
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border-strong);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, transform 0.1s ease;
}

.bit:hover {
  border-color: var(--vp-c-brand-2);
}

.bit:active {
  transform: translateY(1px);
}

.bit-value {
  font-size: 16px;
  font-weight: 650;
  line-height: 1.2;
  color: var(--vp-c-text-3);
}

.bit-weight {
  font-size: 8.5px;
  color: var(--vp-c-text-3);
  opacity: 0.75;
}

.bit.on {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.bit.on .bit-value {
  color: #ffffff;
}

.bit.on .bit-weight {
  color: rgba(255, 255, 255, 0.78);
}

.dark .bit.on .bit-value {
  color: #04201e;
}

.dark .bit.on .bit-weight {
  color: rgba(4, 32, 30, 0.7);
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.result {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: 9px;
}

.result > span {
  font-size: 10.5px;
  color: var(--vp-c-text-3);
}

.result code {
  font-family: var(--cs-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .bit-grid {
    grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
    gap: 4px;
  }

  .bit {
    padding: 6px 2px 4px;
  }

  .bit-value {
    font-size: 14px;
  }
}
</style>


