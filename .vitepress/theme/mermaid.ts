const lightTheme = {
  background: '#ffffff',
  primaryColor: '#e6f7f5',
  primaryTextColor: '#0f172a',
  primaryBorderColor: '#0f766e',
  lineColor: '#64748b',
  secondaryColor: '#eef2ff',
  secondaryTextColor: '#1e1b4b',
  secondaryBorderColor: '#6366f1',
  tertiaryColor: '#fff7ed',
  tertiaryTextColor: '#7c2d12',
  tertiaryBorderColor: '#f59e0b',
  mainBkg: '#ffffff',
  nodeBorder: '#0f766e',
  clusterBkg: '#f8fafc',
  clusterBorder: '#cbd5e1',
  titleColor: '#0f172a',
  edgeLabelBackground: '#ffffff',
  fontSize: '14px',
  actorBkg: '#e6f7f5',
  actorBorder: '#0f766e',
  actorTextColor: '#0f172a',
  signalColor: '#334155',
  signalTextColor: '#0f172a',
  labelBoxBkgColor: '#e6f7f5',
  labelBoxBorderColor: '#0f766e',
  labelTextColor: '#0f172a',
  noteBkgColor: '#fff7ed',
  noteBorderColor: '#f59e0b',
  noteTextColor: '#7c2d12'
}

const darkTheme = {
  background: '#0b1220',
  primaryColor: '#113c3a',
  primaryTextColor: '#e2e8f0',
  primaryBorderColor: '#2dd4bf',
  lineColor: '#94a3b8',
  secondaryColor: '#1e1b4b',
  secondaryTextColor: '#e0e7ff',
  secondaryBorderColor: '#818cf8',
  tertiaryColor: '#3b2f1e',
  tertiaryTextColor: '#fde68a',
  tertiaryBorderColor: '#f59e0b',
  mainBkg: '#101a2e',
  nodeBorder: '#2dd4bf',
  clusterBkg: '#0b1220',
  clusterBorder: '#334155',
  titleColor: '#f1f5f9',
  edgeLabelBackground: '#0b1220',
  fontSize: '14px',
  actorBkg: '#113c3a',
  actorBorder: '#2dd4bf',
  actorTextColor: '#e2e8f0',
  signalColor: '#94a3b8',
  signalTextColor: '#e2e8f0',
  labelBoxBkgColor: '#113c3a',
  labelBoxBorderColor: '#2dd4bf',
  labelTextColor: '#e2e8f0',
  noteBkgColor: '#3b2f1e',
  noteBorderColor: '#f59e0b',
  noteTextColor: '#fde68a'
}

const fontFamily =
  '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif'

type MermaidModule = typeof import('mermaid').default

let mermaidModule: MermaidModule | null = null
let loading: Promise<MermaidModule> | null = null

async function loadMermaid() {
  if (mermaidModule) return mermaidModule
  if (!loading) {
    loading = import('mermaid').then((module) => module.default)
  }
  mermaidModule = await loading
  return mermaidModule
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

/**
 * 渲染当前页面所有 Mermaid 图表。切换路由或深浅色时重复调用即可。
 */
export async function renderMermaidDiagrams() {
  if (typeof window === 'undefined') return

  const containers = Array.from(
    document.querySelectorAll<HTMLElement>('.mermaid-diagram[data-mermaid]')
  )
  if (!containers.length) return

  const mermaid = await loadMermaid()
  const dark = isDarkMode()

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily,
    themeVariables: dark ? darkTheme : lightTheme,
    flowchart: { curve: 'basis', htmlLabels: true, padding: 14 },
    sequence: { useMaxWidth: true, mirrorActors: false, showSequenceNumbers: false },
    class: { useMaxWidth: true },
    state: { useMaxWidth: true },
    gantt: { useMaxWidth: true }
  })

  let counter = 0

  for (const container of containers) {
    const canvas = container.querySelector<HTMLElement>('.mermaid-canvas')
    const source = container.querySelector('.mermaid-source code')?.textContent?.trim()
    if (!canvas || !source) continue

    try {
      const id = `mermaid-${Date.now()}-${counter++}`
      const { svg } = await mermaid.render(id, source)
      canvas.innerHTML = svg
      container.classList.add('is-rendered')
      container.classList.remove('has-error')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      canvas.innerHTML = ''
      const note = document.createElement('p')
      note.className = 'mermaid-error'
      note.textContent = `图表渲染失败：${message}`
      canvas.appendChild(note)
      container.classList.remove('is-rendered')
      container.classList.add('has-error')
    }
  }
}
