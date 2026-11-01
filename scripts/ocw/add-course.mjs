#!/usr/bin/env node
/**
 * 把一个 MIT OCW 课程镜像进本站。
 *
 * 用法：
 *   node scripts/ocw/add-course.mjs <course-url|slug> [--dir=MIT-6.100L] [--force] [--from-manifest]
 *
 * 流程：
 *   1. 读取课程 data.json 元数据；
 *   2. 下载官方「Download Course」打包 zip（默认缓存到 .tmp/ocw/）；
 *   3. 只从 zip 里取出资源文件（PDF / 代码 / 习题等）写入 public/ocw/<short-id>/；
 *   4. 生成 scripts/ocw/data/<short-id>.json 清单，再由清单生成 Markdown 页面。
 *
 * 设计原则：Markdown 是站点唯一知识源，本脚本只负责「把官方资源翻译成 Markdown」，
 * 重复执行是幂等的；已下载且大小一致的文件不会重新写入。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { listZipEntries, readZipEntry } from './zip.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CACHE_DIR = path.join(ROOT, '.tmp/ocw')
const PUBLIC_BASE = path.join(ROOT, 'public/ocw')
const DATA_DIR = path.join(ROOT, 'scripts/ocw/data')
const CONTENT_DIR = path.join(ROOT, '公开课')

const SECTION = '公开课'
const USER_AGENT = 'CS-AI-Learning/1.0 (personal study mirror; +https://ocw.mit.edu)'

/* ------------------------------------------------------------------ 工具函数 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function log(message) {
  process.stdout.write(`${message}\n`)
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

async function request(url, init = {}) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'user-agent': USER_AGENT, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(180_000)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
      return res
    } catch (error) {
      lastError = error
      if (attempt < 3) await sleep(800 * attempt)
    }
  }
  throw lastError
}

async function fetchJson(url) {
  return (await request(url)).json()
}

async function fetchText(url) {
  return (await request(url)).text()
}

async function downloadTo(url, file, force) {
  if (!force && fs.existsSync(file) && fs.statSync(file).size > 0) {
    log(`· 复用缓存 ${path.relative(ROOT, file)}`)
    return
  }
  ensureDir(path.dirname(file))
  log(`· 下载 ${url}`)
  const res = await request(url)
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(file))
  const size = fs.statSync(file).size
  log(`· 已保存 ${path.relative(ROOT, file)}（${formatBytes(size)}）`)
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function cell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pad(number, width = 2) {
  return String(number).padStart(width, '0')
}

function toSlug(input) {
  const fromUrl = /courses\/([^/?#]+)/.exec(input)
  if (fromUrl) return fromUrl[1]
  return input.replace(/\/+$/, '').split('/').pop()
}

function extname(file) {
  const matched = /\.[a-z0-9]+$/i.exec(file ?? '')
  return matched ? matched[0].toLowerCase() : ''
}

const TEXT_ASSET = new Set(['.pdf', '.py', '.zip', '.txt', '.md', '.ipynb', '.csv', '.json', '.vtt'])

function safeFilename(value) {
  return value.replace(/[^\w.\-]+/g, '-').replace(/^-+|-+$/g, '')
}

const LIST_LABELS = {
  'lecture-notes': '讲义（Lecture Notes）',
  'lecture-code': '课堂代码（Lecture Code）',
  'problem-sets': '习题（Problem Sets）',
  recitations: '复习课（Recitations）',
  readings: '阅读材料（Readings）',
  assignments: '作业（Assignments）',
  exams: '考试（Exams）'
}

const LECTURE_PATTERN = /lecture[\s_-]*0?(\d{1,3})/i
const LECTURE_PATTERN_FILE = /lec[t]?[\s_-]*0?(\d{1,3})/i

function lectureNumberOf(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue
    const byTitle = LECTURE_PATTERN.exec(candidate)
    if (byTitle) return Number(byTitle[1])
    const byFile = LECTURE_PATTERN_FILE.exec(candidate)
    if (byFile) return Number(byFile[1])
  }
  return null
}

function stripLecturePrefix(title) {
  return title.replace(/^lecture\s+\d+\s*[:：-]\s*/i, '').trim() || title
}

/* -------------------------------------------------------------- 参数与入口 */

function parseArgs(argv) {
  const options = { dir: '', force: false, fromManifest: false, slug: '' }
  for (const arg of argv) {
    if (arg === '--force') options.force = true
    else if (arg === '--from-manifest') options.fromManifest = true
    else if (arg.startsWith('--dir=')) options.dir = arg.slice('--dir='.length)
    else if (!arg.startsWith('--')) options.slug = arg
  }
  return options
}

const options = parseArgs(process.argv.slice(2))

if (!options.slug && !options.fromManifest) {
  log('用法：node scripts/ocw/add-course.mjs <course-url|slug> [--dir=MIT-6.100L] [--force] [--from-manifest]')
  process.exit(1)
}

/* ------------------------------------------------------------ 构建课程模型 */

async function findZipUrl(base, shortId) {
  const html = await fetchText(`${base}download/`)
  const candidates = [...html.matchAll(/href="([^"]+\.zip)"/g)]
    .map((match) => match[1])
    .map((href) => (href.startsWith('http') ? href : new URL(href, base).href))
    .filter((href) => !href.includes('/static_resources/'))

  const preferred =
    candidates.find((href) => href.endsWith(`/${shortId}.zip`)) ??
    candidates.find((href) => !href.includes('/resources/')) ??
    candidates[0]

  return preferred ?? `${base}${shortId}.zip`
}

async function buildModel(input) {
  const slug = toSlug(input)
  const base = `https://ocw.mit.edu/courses/${slug}/`
  log(`→ 读取课程元数据 ${base}`)
  const meta = await fetchJson(`${base}data.json`)
  const shortId = meta.site_short_id || slug
  const sourceUrl = `https://ocw.mit.edu/courses/${slug}/`

  const zipUrl = await findZipUrl(base, shortId)
  const zipPath = path.join(CACHE_DIR, `${shortId}.zip`)
  await downloadTo(zipUrl, zipPath, options.force)

  const buffer = fs.readFileSync(zipPath)
  const entries = listZipEntries(buffer)
  log(`· 课程包 ${entries.size} 个条目（${formatBytes(buffer.length)}）`)

  const jsonCache = new Map()
  const readJson = (entry) => {
    if (!jsonCache.has(entry.name)) {
      jsonCache.set(entry.name, JSON.parse(readZipEntry(buffer, entry).toString('utf8')))
    }
    return jsonCache.get(entry.name)
  }

  const contentMap = readJson(entries.get('content_map.json'))

  const resources = new Map()
  for (const entry of entries.values()) {
    const matched = /^resources\/([^/]+)\/data\.json$/.exec(entry.name)
    if (!matched) continue
    resources.set(matched[1], { ...readJson(entry), slug: matched[1] })
  }

  function resolveUid(uid) {
    const target = contentMap?.[uid]
    if (!target) return null
    const matched = /^\/resources\/([^/]+)\//.exec(target)
    return matched ? (resources.get(matched[1]) ?? null) : null
  }

  function toItem(record) {
    if (!record) return null
    const file = record.file ?? ''
    const name = file.split('/').filter(Boolean).pop() ?? ''
    if (!name || !TEXT_ASSET.has(extname(name))) return null
    return {
      title: record.title ?? name,
      name,
      file,
      size: Number(record.file_size ?? 0),
      type: extname(name).replace('.', ''),
      external: /^https?:/i.test(file)
    }
  }

  const lists = []
  for (const entry of entries.values()) {
    const matched = /^lists\/([^/]+)\/data\.json$/.exec(entry.name)
    if (!matched) continue
    const data = readJson(entry)
    const uids = Array.isArray(data.resources?.content) ? data.resources.content : []
    const items = uids.map((uid) => toItem(resolveUid(uid))).filter(Boolean)
    if (items.length) lists.push({ slug: matched[1], title: data.title || matched[1], items })
  }
  lists.sort((a, b) => b.items.length - a.items.length)

  const videoGallery = [...entries.values()]
    .map((entry) => ({ entry, matched: /^video_galleries\/([^/]+)\/data\.json$/.exec(entry.name) }))
    .filter((item) => item.matched)
    .map((item) => readJson(item.entry))
    .sort((a, b) => (b.videos?.length ?? 0) - (a.videos?.length ?? 0))[0]

  const videos = (videoGallery?.videos ?? []).map((video, index) => {
    const files = video.video_files ?? {}
    const transcript = (files.video_transcript_resources ?? [])[0]?.file ?? ''
    const captions = (files.video_captions_resources ?? [])[0]?.file ?? ''
    return {
      number: lectureNumberOf(video.title) ?? index + 1,
      title: video.title ?? `Lecture ${index + 1}`,
      youtubeId: video.video_metadata?.youtube_id ?? '',
      mp4: (video.file ?? '').startsWith('/') ? `https://ocw.mit.edu${video.file}` : (video.file ?? ''),
      size: Number(video.file_size ?? 0),
      transcript: transcript.split('/').filter(Boolean).pop() ?? '',
      captions: captions.split('/').filter(Boolean).pop() ?? ''
    }
  })

  const pages = new Map()
  for (const entry of entries.values()) {
    const matched = /^pages\/([^/]+)\/data\.json$/.exec(entry.name)
    if (!matched) continue
    const data = readJson(entry)
    const number = lectureNumberOf(data.title)
    if (number) pages.set(number, { slug: matched[1], title: data.title })
  }

  // 组装讲次：以「视频 / 讲义页 / 资源文件名」里出现的讲次编号为准。
  const lectureMap = new Map()
  const ensureLecture = (number) => {
    if (!lectureMap.has(number)) {
      lectureMap.set(number, {
        number,
        title: '',
        topic: '',
        pageSlug: '',
        video: null,
        items: []
      })
    }
    return lectureMap.get(number)
  }

  for (const [number, page] of pages) {
    const lecture = ensureLecture(number)
    lecture.title = page.title
    lecture.topic = stripLecturePrefix(page.title)
    lecture.pageSlug = page.slug
  }

  for (const video of videos) {
    const lecture = ensureLecture(video.number)
    lecture.video = video
    if (!lecture.title) lecture.title = video.title
    if (!lecture.topic) lecture.topic = stripLecturePrefix(video.title)
  }

  for (const list of lists) {
    for (const item of list.items) {
      const number = lectureNumberOf(item.title, item.name)
      if (number === null) continue
      const lecture = ensureLecture(number)
      lecture.items.push({ ...item, listSlug: list.slug, listTitle: list.title })
    }
  }

  const lectures = [...lectureMap.values()].sort((a, b) => a.number - b.number)
  for (const lecture of lectures) {
    if (!lecture.title) lecture.title = `Lecture ${lecture.number}`
    if (!lecture.topic) lecture.topic = stripLecturePrefix(lecture.title)
  }

  const entrySize = (name) => (entries.get(`static_resources/${name}`) ?? entries.get(name))?.size ?? 0

  // 字幕与讲稿跟随讲次展示；把 YouTube 哈希文件名改成可读的 lecNN-transcript.pdf
  for (const lecture of lectures) {
    const video = lecture.video
    if (!video) continue
    video.transcriptSource = video.transcript
    video.captionsSource = video.captions
    if (video.transcript) video.transcript = `lec${pad(video.number)}-transcript.pdf`
    if (video.captions) video.captions = `lec${pad(video.number)}-captions.vtt`

    if (video.transcript) {
      lecture.items.push({
        title: '英文字幕稿',
        name: video.transcript,
        source: video.transcriptSource,
        size: entrySize(video.transcriptSource),
        type: 'pdf',
        listSlug: 'media',
        listTitle: '字幕与讲稿'
      })
    }
    if (video.captions) {
      lecture.items.push({
        title: '英文字幕（VTT）',
        name: video.captions,
        source: video.captionsSource,
        size: entrySize(video.captionsSource),
        type: 'vtt',
        listSlug: 'media',
        listTitle: '字幕与讲稿'
      })
    }
  }

  // 需要落地的文件集合
  const files = new Map()
  const addFile = (name, size, source) => {
    const resolved = size || entrySize(source ?? name)
    const existing = files.get(name)
    if (existing) {
      existing.size = existing.size || resolved
      return
    }
    files.set(name, { name, size: resolved, source: source ?? '' })
  }

  for (const list of lists) {
    for (const item of list.items) {
      if (item.external) continue
      addFile(item.name, item.size)
    }
  }
  for (const lecture of lectures) {
    for (const item of lecture.items) addFile(item.name, item.size, item.source)
  }

  const dir = options.dir || `MIT-${meta.primary_course_number || shortId}`.replace(/[^\w.\-]/g, '-')

  ensureDir(DATA_DIR)
  const manifestPath = path.join(DATA_DIR, `${shortId}.json`)
  const previousOrder = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).order
    : undefined
  const order =
    previousOrder ??
    fs.readdirSync(DATA_DIR).filter((file) => file.endsWith('.json') && file !== `${shortId}.json`)
      .length +
      1

  const model = {
    slug,
    shortId,
    dir,
    order,
    sourceUrl,
    assetBase: `/ocw/${shortId}/`,
    meta: {
      title: meta.course_title ?? shortId,
      number: meta.primary_course_number ?? '',
      term: meta.term ?? '',
      year: meta.year ?? '',
      instructors: (meta.instructors ?? []).map((person) => person.title || `${person.first_name} ${person.last_name}`.trim()),
      level: meta.level ?? [],
      resourceTypes: meta.learning_resource_types ?? [],
      description: meta.course_description ?? '',
      license: meta.license ?? 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      topics: (meta.topics ?? []).map((group) => (Array.isArray(group) ? group.join(' / ') : String(group)))
    },
    files: [...files.values()].sort((a, b) => a.name.localeCompare(b.name)),
    lectures: lectures.map((lecture) => ({
      number: lecture.number,
      title: lecture.title,
      topic: lecture.topic,
      pageSlug: lecture.pageSlug ?? '',
      video: lecture.video,
      items: lecture.items
    })),
    lists: lists.map((list) => ({ slug: list.slug, title: list.title, items: list.items })),
    zipUrl
  }

  return { model, buffer, entries }
}

/* -------------------------------------------------------------- 落地资源文件 */

function materialize(model, buffer, entries) {
  const targetDir = path.join(PUBLIC_BASE, model.shortId)
  ensureDir(targetDir)

  const wanted = new Set(model.files.map((file) => file.name))
  let written = 0
  let skipped = 0

  for (const file of model.files) {
    const sourceName = file.source || file.name
    const entry =
      entries.get(`static_resources/${sourceName}`) ?? entries.get(sourceName) ?? null
    if (!entry) {
      log(`! 课程包中缺少 ${sourceName}`)
      continue
    }

    const target = path.join(targetDir, file.name)
    if (!file.size && entry.size) file.size = entry.size
    if (!options.force && fs.existsSync(target) && fs.statSync(target).size === entry.size) {
      skipped += 1
      continue
    }

    fs.writeFileSync(target, readZipEntry(buffer, entry))
    written += 1
  }

  if (options.force) {
    for (const name of fs.readdirSync(targetDir)) {
      if (!wanted.has(name)) fs.rmSync(path.join(targetDir, name), { force: true })
    }
  }

  const total = model.files.reduce((sum, file) => sum + (file.size || 0), 0)
  log(`· 资源文件 ${model.files.length} 个：写入 ${written}，复用 ${skipped}，合计 ${formatBytes(total)}`)
  return path.relative(ROOT, targetDir)
}

/* ------------------------------------------------------------------ Markdown */

function assetHref(model, name) {
  return `${model.assetBase}${encodeURI(name).replace(/#/g, '%23')}`
}

function lectureRoute(model, number) {
  return `/${SECTION}/${model.dir}/lecture-${pad(number)}`
}

function licenseBlock(model) {
  const { meta, sourceUrl } = model
  return [
    '## 署名与许可',
    '',
    `本页资源镜像自 MIT OpenCourseWare 课程 **${meta.number} ${meta.title}**（${meta.term} ${meta.year}），` +
      `原始页面：<${sourceUrl}>。`,
    '',
    `- 原始作者：MIT OpenCourseWare${meta.instructors.length ? `，授课教师 ${meta.instructors.join('、')}` : ''}`,
    '- 许可证：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)',
    '- 本站用途：个人非商业学习；内容版权归原作者与 MIT 所有。',
    '- 若资源有更新，以原始页面为准；如需引用请注明 MIT OpenCourseWare 出处。',
    ''
  ].join('\n')
}

function listLabel(list) {
  return LIST_LABELS[list.slug] ?? list.title
}

function renderCoursePage(model) {
  const { meta } = model
  const lectures = model.lectures
  const videoCount = lectures.filter((lecture) => lecture.video).length
  const notesList = model.lists.find((list) => /note/i.test(list.slug))
  const notesCount = notesList?.items.length ?? 0
  const totalBytes = model.files.reduce((sum, file) => sum + (file.size || 0), 0)

  const lines = []
  lines.push('---')
  lines.push(`title: MIT ${meta.number}｜${meta.title}`)
  lines.push(
    `description: MIT OCW ${meta.number} 全量资源本地镜像：${videoCount} 讲视频、${notesCount} 份讲义与课堂代码，可直接在站内打开。`
  )
  lines.push('tag: 公开课')
  lines.push(`order: ${model.order ?? 1}`)
  lines.push(`source: ${model.sourceUrl}`)
  lines.push('license: CC BY-NC-SA 4.0')
  lines.push('---')
  lines.push('')
  lines.push(`# MIT ${meta.number}｜${meta.title}`)
  lines.push('')
  lines.push('<dl class="ocw-facts">')
  lines.push(`  <dt>编号</dt><dd><strong>${escapeHtml(meta.number)}</strong></dd>`)
  lines.push(`  <dt>学期</dt><dd>${escapeHtml(`${meta.term} ${meta.year}`.trim())}</dd>`)
  if (meta.instructors.length) {
    lines.push(`  <dt>教师</dt><dd>${escapeHtml(meta.instructors.join('、'))}</dd>`)
  }
  if (meta.resourceTypes.length) {
    lines.push(`  <dt>类型</dt><dd>${escapeHtml(meta.resourceTypes.join('、'))}</dd>`)
  }
  lines.push(
    `  <dt>来源</dt><dd><a href="${model.sourceUrl}" target="_blank" rel="noreferrer">MIT OCW ${escapeHtml(meta.number)}</a></dd>`
  )
  if (model.zipUrl) {
    const zipName = model.zipUrl.split('/').filter(Boolean).pop()
    lines.push(
      `  <dt>整包</dt><dd><a href="${model.zipUrl}" target="_blank" rel="noreferrer">${escapeHtml(zipName)}</a></dd>`
    )
  }
  lines.push('</dl>')
  lines.push('')
  lines.push('::: tip 全部资源已镜像到本站')
  lines.push(
    `${videoCount} 讲视频可直接在站内播放；讲义、课堂代码、习题与字幕稿共 ${model.files.length} 个文件` +
      `（${formatBytes(totalBytes)}）已下载到本站，点击即可打开，无需跳转 MIT 站点。`
  )
  lines.push(':::')
  lines.push('')

  if (meta.description) {
    lines.push('## 课程简介')
    lines.push('')
    lines.push(meta.description)
    lines.push('')
  }

  if (lectures.length) {
    lines.push('## 讲义与视频')
    lines.push('')
    lines.push('| 讲次 | 主题 | 视频 | 讲义 | 代码 |')
    lines.push('| :---: | --- | :---: | :---: | :---: |')
    for (const lecture of lectures) {
      const notes = lecture.items.filter((item) => /note|slide/i.test(item.listSlug))
      const code = lecture.items.filter((item) => /code|example/i.test(item.listSlug))
      const video = lecture.video
        ? `[播放](${lectureRoute(model, lecture.number)})`
        : lecture.items.length
          ? `[资料](${lectureRoute(model, lecture.number)})`
          : '—'
      const notesCell = notes.length
        ? notes.map((item) => `[${item.type.toUpperCase()}](${assetHref(model, item.name)})`).join(' ')
        : '—'
      const codeCell = code.length
        ? code.map((item) => `[${item.type}](${assetHref(model, item.name)})`).join(' ')
        : '—'
      lines.push(
        `| ${lecture.number} | ${cell(lecture.topic)} | ${video} | ${notesCell} | ${codeCell} |`
      )
    }
    lines.push('')
  }

  const usedAsLecture = new Set(['lecture-notes', 'lecture-code'])
  for (const list of model.lists.filter((item) => !usedAsLecture.has(item.slug))) {
    lines.push(`## ${listLabel(list)}`)
    lines.push('')
    lines.push('| 资源 | 文件 | 大小 |')
    lines.push('| --- | --- | ---: |')
    for (const item of list.items) {
      lines.push(
        `| ${cell(item.title)} | [${item.name}](${assetHref(model, item.name)}) | ${formatBytes(item.size)} |`
      )
    }
    lines.push('')
  }

  const mediaCount = model.lectures.reduce(
    (sum, lecture) => sum + lecture.items.filter((item) => item.listSlug === 'media').length,
    0
  )
  if (mediaCount) {
    lines.push('## 字幕与讲稿')
    lines.push('')
    lines.push(
      `${mediaCount} 份英文字幕稿（PDF）与字幕文件（VTT）已随讲义一并下载，在对应讲次页面的「本讲资料」中打开。`
    )
    lines.push('')
  }

  lines.push(licenseBlock(model))

  return lines.join('\n')
}

function renderLecturePage(model, lecture, index) {
  const { meta } = model
  const lines = []
  const previous = model.lectures[index - 1]
  const next = model.lectures[index + 1]

  lines.push('---')
  lines.push(`title: 第 ${lecture.number} 讲｜${lecture.topic}`)
  lines.push(`description: MIT ${meta.number} 第 ${lecture.number} 讲：${lecture.topic}。含视频、讲义与课堂代码。`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${lecture.title}`)
  lines.push('')
  lines.push(`[← 返回课程主页](/${SECTION}/${model.dir}/)`)
  lines.push('')

  if (lecture.video?.youtubeId) {
    const captionHref = lecture.video.captions ? assetHref(model, lecture.video.captions) : ''
    const captionAttr = captionHref ? ` captions="${captionHref}"` : ''
    lines.push(
      `<OcwVideo id="${lecture.video.youtubeId}" title="${lecture.title.replace(/"/g, '&quot;')}"${captionAttr} />`
    )
    lines.push('')
    if (captionHref) {
      lines.push('::: tip 播放器用法')
      lines.push(
        '播放时会浮出一句可拖动的字幕（可拖到任意位置，双击复位，× 关闭）；' +
          '点「网页全屏」进入「左侧视频 + 右侧逐句字幕」的大屏布局（Esc 或点黑边退出）；' +
          '正文里的「逐句字幕」面板能按时间跳转，当前句自动高亮并保持在面板中央。'
      )
      lines.push(':::')
      lines.push('')
    }
  }

  if (lecture.items.length) {
    lines.push('## 本讲资料')
    lines.push('')
    lines.push('| 类型 | 文件 | 大小 |')
    lines.push('| --- | --- | ---: |')
    for (const item of lecture.items) {
      const label = LIST_LABELS[item.listSlug] ?? item.listTitle
      lines.push(`| ${cell(label)} | [${item.name}](${assetHref(model, item.name)}) | ${formatBytes(item.size)} |`)
    }
    lines.push('')
  }

  if (lecture.video) {
    lines.push('## 原站文件')
    lines.push('')
    if (lecture.video.mp4) {
      lines.push(`- [原始 MP4（${formatBytes(lecture.video.size)}）](${lecture.video.mp4})`)
    }
    if (lecture.pageSlug) {
      lines.push(`- [该讲原始页面](${model.sourceUrl}pages/${lecture.pageSlug}/)`)
    } else {
      lines.push(`- [MIT OCW 原始页面](${model.sourceUrl})`)
    }
    lines.push('')
  }

  lines.push('## 前后讲次')
  lines.push('')
  const nav = []
  if (previous) nav.push(`[← 第 ${previous.number} 讲：${previous.topic}](${lectureRoute(model, previous.number)})`)
  if (next) nav.push(`[第 ${next.number} 讲：${next.topic} →](${lectureRoute(model, next.number)})`)
  lines.push(nav.join(' · '))
  lines.push('')

  return lines.join('\n')
}

function renderSectionsIndex(manifests) {
  const lines = []
  lines.push('---')
  lines.push('title: 公开课镜像')
  lines.push('description: MIT OpenCourseWare 课程的本地镜像索引：视频、讲义、代码与习题均已下载，可直接访问。')
  lines.push('---')
  lines.push('')
  lines.push('# 公开课镜像')
  lines.push('')
  lines.push(
    '这里收录 MIT OpenCourseWare 等公开课的**本地镜像**：官方打包资源（讲义 PDF、课堂代码、习题与解答）' +
      '已下载到 `public/ocw/`，视频通过官方 YouTube 频道嵌入播放。'
  )
  lines.push('')
  lines.push('新增课程只需一条命令，具体约定见仓库根目录的 `AGENTS.md`：')
  lines.push('')
  lines.push('```bash')
  lines.push('npm run ocw:add -- https://ocw.mit.edu/courses/<课程 slug>/')
  lines.push('```')
  lines.push('')
  lines.push('## 已镜像课程')
  lines.push('')
  lines.push('| 课程 | 主题 | 视频 | 文件 |')
  lines.push('| --- | --- | :---: | ---: |')
  for (const manifest of manifests) {
    const href = `/${SECTION}/${manifest.dir}/`
    const videos = manifest.lectures.filter((lecture) => lecture.video).length
    const bytes = manifest.files.reduce((sum, file) => sum + (file.size || 0), 0)
    lines.push(
      `| [MIT ${manifest.meta.number}｜${cell(manifest.meta.title)}](${href}) | ${cell(manifest.meta.topics[0] ?? '')} | ${videos} | ${manifest.files.length} 个 / ${formatBytes(bytes)} |`
    )
  }
  lines.push('')
  lines.push('::: warning 版权与许可')
  lines.push(
    '所有课程内容版权归原作者与 MIT 所有，按 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) ' +
      '许可在**非商业**范围内镜像，仅供个人学习使用；转载或二次分发请保留署名并以相同方式共享。'
  )
  lines.push(':::')
  lines.push('')
  return lines.join('\n')
}

/* ---------------------------------------------------------------------- 主流程 */

async function main() {
  const manifestsDir = DATA_DIR
  ensureDir(manifestsDir)
  ensureDir(CONTENT_DIR)

  let model
  if (options.fromManifest) {
    const files = fs
      .readdirSync(manifestsDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => path.join(manifestsDir, file))
    if (!files.length) throw new Error('scripts/ocw/data/ 为空，请先执行一次在线抓取')

    const key = options.slug ? toSlug(options.slug) : ''
    const matched = files
      .map((file) => ({ file, data: JSON.parse(fs.readFileSync(file, 'utf8')) }))
      .find(
        (item) =>
          !key || item.data.slug === key || item.data.shortId === key || item.data.dir === key
      )
    const chosen = matched ?? { file: files[0], data: JSON.parse(fs.readFileSync(files[0], 'utf8')) }
    model = chosen.data
    log(`→ 从清单重建 Markdown：${path.relative(ROOT, chosen.file)}`)
  } else {
    const built = await buildModel(options.slug)
    model = built.model
    materialize(model, built.buffer, built.entries)
    ensureDir(manifestsDir)
    fs.writeFileSync(path.join(manifestsDir, `${model.shortId}.json`), `${JSON.stringify(model, null, 2)}\n`)
    log(`· 清单已写入 scripts/ocw/data/${model.shortId}.json`)
  }

  const courseDir = path.join(CONTENT_DIR, model.dir)
  ensureDir(courseDir)
  fs.writeFileSync(path.join(courseDir, 'README.md'), renderCoursePage(model), 'utf8')
  for (const [index, lecture] of model.lectures.entries()) {
    fs.writeFileSync(
      path.join(courseDir, `lecture-${pad(lecture.number)}.md`),
      renderLecturePage(model, lecture, index),
      'utf8'
    )
  }

  const manifests = fs
    .readdirSync(manifestsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(manifestsDir, file), 'utf8')))
    .sort((a, b) => a.meta.number.localeCompare(b.meta.number))

  fs.writeFileSync(path.join(CONTENT_DIR, 'README.md'), renderSectionsIndex(manifests), 'utf8')

  log(`✓ 生成 ${path.relative(ROOT, courseDir)}/README.md 与 ${model.lectures.length} 个讲次页面`)
  log(`✓ 更新 ${SECTION}/README.md（共 ${manifests.length} 门镜像课程）`)
}

main().catch((error) => {
  console.error(`✗ 失败：${error.message}`)
  process.exit(1)
})
