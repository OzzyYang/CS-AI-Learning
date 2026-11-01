<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

interface Packet {
  dir: 'c2s' | 's2c'
  flags: string
  seq: string
  ack?: string
}

interface Step {
  title: string
  client: string
  server: string
  message?: Packet
  detail: string
  tip: string
}

const clientIsn = 1000
const serverIsn = 2000

const steps: Step[] = [
  {
    title: '初始状态',
    client: 'CLOSED',
    server: 'LISTEN',
    detail: '客户端尚未建立连接；服务端监听目标端口，等待 SYN 报文。',
    tip: '三次握手的起点：客户端 CLOSED，服务端 LISTEN。'
  },
  {
    title: '第一次握手：SYN',
    client: 'SYN_SENT',
    server: 'LISTEN',
    message: { dir: 'c2s', flags: 'SYN=1', seq: `seq=${clientIsn}` },
    detail: '客户端选择初始序号 c，发送 SYN 报文，进入 SYN_SENT 状态。',
    tip: 'SYN 会消耗一个序号：服务端确认时应返回 ack = c + 1。'
  },
  {
    title: '第二次握手：SYN + ACK',
    client: 'SYN_SENT',
    server: 'SYN_RCVD',
    message: {
      dir: 's2c',
      flags: 'SYN=1, ACK=1',
      seq: `seq=${serverIsn}`,
      ack: `ack=${clientIsn + 1}`
    },
    detail: '服务端分配自己的初始序号 s，回送 SYN + ACK，进入 SYN_RCVD 状态。',
    tip: '一个报文同时完成「确认客户端 SYN」与「发起自己的 SYN」两件事。'
  },
  {
    title: '第三次握手：ACK',
    client: 'ESTABLISHED',
    server: 'SYN_RCVD',
    message: {
      dir: 'c2s',
      flags: 'ACK=1',
      seq: `seq=${clientIsn + 1}`,
      ack: `ack=${serverIsn + 1}`
    },
    detail: '客户端确认服务端的 SYN，发送 ACK，自身进入 ESTABLISHED。',
    tip: '此时客户端认为连接已建立，但服务端仍需收到这个 ACK 才能确认。'
  },
  {
    title: '连接建立',
    client: 'ESTABLISHED',
    server: 'ESTABLISHED',
    detail: '服务端收到 ACK 后也进入 ESTABLISHED，双方可以开始传输数据。',
    tip: '三次握手的本质：双方各自确认「自己的发送能力」与「对方的接收能力」都正常。'
  }
]

const index = ref(0)
const playing = ref(false)
let timer: number | undefined

const current = computed(() => steps[index.value])
const visiblePackets = computed(() =>
  steps
    .slice(1, index.value + 1)
    .map((step) => step.message)
    .filter((packet): packet is Packet => Boolean(packet))
)

function stop() {
  playing.value = false
  if (timer !== undefined) {
    window.clearInterval(timer)
    timer = undefined
  }
}

function go(nextIndex: number) {
  stop()
  index.value = Math.min(Math.max(nextIndex, 0), steps.length - 1)
}

function next() {
  go(index.value + 1)
}

function previous() {
  go(index.value - 1)
}

function reset() {
  go(0)
}

function togglePlay() {
  if (playing.value) {
    stop()
    return
  }
  if (index.value >= steps.length - 1) index.value = 0
  playing.value = true
  timer = window.setInterval(() => {
    if (index.value >= steps.length - 1) {
      stop()
      return
    }
    index.value += 1
  }, 1100)
}

function stateClass(state: string) {
  if (state === 'ESTABLISHED') return 'state-ok'
  if (state === 'LISTEN') return 'state-idle'
  if (state === 'CLOSED') return 'state-off'
  return 'state-wait'
}

onUnmounted(stop)
</script>

<template>
  <div class="lab tcp-lab">
    <div class="lab-head">
      <div>
        <span class="lab-kicker">Interactive · TCP</span>
        <p class="lab-title">TCP 三次握手模拟</p>
      </div>
      <span class="tcp-seq">ISN c={{ clientIsn }} · s={{ serverIsn }}</span>
    </div>

    <div class="net">
      <div class="peer">
        <span class="peer-role">CLIENT</span>
        <p class="peer-name">客户端</p>
        <span class="state" :class="stateClass(current.client)">{{ current.client }}</span>
        <p class="peer-note">初始序号 c = {{ clientIsn }}</p>
      </div>

      <div class="wire">
        <div v-if="!visiblePackets.length" class="wire-idle">等待第一次握手…</div>
        <div
          v-for="(packet, packetIndex) in visiblePackets"
          :key="packetIndex"
          class="packet"
          :class="packet.dir"
        >
          <span class="packet-arrow">{{ packet.dir === 'c2s' ? '→' : '←' }}</span>
          <div class="packet-body">
            <strong>{{ packet.flags }}</strong>
            <span>{{ packet.seq }}</span>
            <span v-if="packet.ack">{{ packet.ack }}</span>
          </div>
        </div>
      </div>

      <div class="peer">
        <span class="peer-role">SERVER</span>
        <p class="peer-name">服务端</p>
        <span class="state" :class="stateClass(current.server)">{{ current.server }}</span>
        <p class="peer-note">初始序号 s = {{ serverIsn }}</p>
      </div>
    </div>

    <div class="step-panel">
      <div class="step-top">
        <span class="step-count">{{ index + 1 }} / {{ steps.length }}</span>
        <h4>{{ current.title }}</h4>
      </div>
      <p class="step-detail">{{ current.detail }}</p>
      <p class="step-tip">{{ current.tip }}</p>
    </div>

    <div class="lab-controls">
      <button class="lab-btn primary" type="button" @click="togglePlay">
        {{ playing ? '暂停' : '自动演示' }}
      </button>
      <button class="lab-btn" type="button" :disabled="index <= 0" @click="previous">上一步</button>
      <button class="lab-btn" type="button" :disabled="index >= steps.length - 1" @click="next">
        下一步
      </button>
      <button class="lab-btn ghost" type="button" @click="reset">重置</button>
    </div>

    <ol class="stepper">
      <li
        v-for="(step, stepIndex) in steps"
        :key="step.title"
        :class="{ active: stepIndex === index, done: stepIndex < index }"
      >
        <button type="button" @click="go(stepIndex)">
          <span class="stepper-dot">{{ stepIndex + 1 }}</span>
          <span class="stepper-label">{{ step.title }}</span>
        </button>
      </li>
    </ol>

    <p class="lab-note">
      序号与确认号是相对值：真实连接中 ISN 由随机数生成。观察每个状态下「谁在等谁的确认」，就能理解为什么两次握手无法让双方都确认接收能力。
    </p>
  </div>
</template>

<style scoped>
.tcp-seq {
  padding: 4px 10px;
  font-family: var(--cs-mono);
  font-size: 10.5px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--cs-border);
  border-radius: 999px;
  white-space: nowrap;
}

.net {
  display: grid;
  grid-template-columns: minmax(120px, 0.8fr) minmax(0, 2fr) minmax(120px, 0.8fr);
  gap: 12px;
  align-items: stretch;
  margin-bottom: 16px;
}

.peer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 14px 10px;
  text-align: center;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: var(--cs-radius-md);
}

.peer-role {
  font-family: var(--cs-mono);
  font-size: 8.5px;
  letter-spacing: 0.14em;
  color: var(--vp-c-text-3);
}

.peer-name {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 650;
  color: var(--vp-c-text-1);
}

.state {
  padding: 2px 8px;
  font-family: var(--cs-mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.state-ok {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.state-wait {
  color: #b45309;
  background: rgba(245, 158, 11, 0.14);
}

.state-idle {
  color: var(--cs-accent);
  background: var(--cs-accent-soft);
}

.state-off {
  color: var(--vp-c-text-3);
}

.peer-note {
  margin: 8px 0 0;
  font-family: var(--cs-mono);
  font-size: 8.5px;
  color: var(--vp-c-text-3);
}

.wire {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-height: 120px;
  padding: 10px;
  background: var(--vp-c-bg-soft);
  border: 1px dashed var(--cs-border-strong);
  border-radius: var(--cs-radius-md);
}

.wire-idle {
  margin: 0;
  font-size: 10.5px;
  text-align: center;
  color: var(--vp-c-text-3);
}

.packet {
  display: flex;
  gap: 8px;
  align-items: center;
  animation: packet-in 0.28s ease both;
}

.packet.s2c {
  flex-direction: row-reverse;
}

.packet-arrow {
  font-family: var(--cs-mono);
  font-size: 13px;
  color: var(--vp-c-brand-1);
}

.packet-body {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding: 6px 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-radius: 7px;
}

.packet-body strong {
  font-family: var(--cs-mono);
  font-size: 9.5px;
  letter-spacing: 0.02em;
  color: var(--cs-accent);
}

.packet-body span {
  font-family: var(--cs-mono);
  font-size: 9.5px;
  color: var(--vp-c-text-2);
}

@keyframes packet-in {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-panel {
  padding: 14px 16px;
  margin-bottom: 14px;
  background: var(--vp-c-bg);
  border: 1px solid var(--cs-border);
  border-left: 3px solid var(--vp-c-brand-2);
  border-radius: 0 var(--cs-radius-md) var(--cs-radius-md) 0;
}

.step-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
}

.step-count {
  font-family: var(--cs-mono);
  font-size: 9.5px;
  color: var(--vp-c-text-3);
}

.step-top h4 {
  margin: 0;
  font-size: 13.5px;
  font-weight: 650;
  color: var(--vp-c-text-1);
}

.step-detail {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--vp-c-text-2);
}

.step-tip {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--vp-c-text-3);
}

.stepper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 6px;
  padding: 0;
  list-style: none;
}

.stepper button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 10.5px;
  color: var(--vp-c-text-3);
  background: transparent;
  border: 1px solid var(--cs-border);
  border-radius: 999px;
  cursor: pointer;
}

.stepper li.active button {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-color: transparent;
}

.stepper li.done button {
  color: var(--vp-c-text-2);
}

.stepper-dot {
  display: inline-grid;
  width: 15px;
  height: 15px;
  place-items: center;
  font-family: var(--cs-mono);
  font-size: 8px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
}

.stepper li.active .stepper-dot {
  color: #fff;
  background: var(--vp-c-brand-2);
}

.dark .stepper li.active .stepper-dot {
  color: #04201e;
}

@media (max-width: 760px) {
  .net {
    grid-template-columns: 1fr;
  }

  .wire {
    order: 2;
    min-height: 90px;
  }

  .peer:first-child {
    order: 1;
  }

  .peer:last-child {
    order: 3;
  }

  .stepper-label {
    display: none;
  }
}
</style>
