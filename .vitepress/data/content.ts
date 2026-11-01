import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  CourseEntry,
  CurriculumData,
  LabEntry,
  OcwEntry,
  RecentEntry,
  RelatedGroups,
  RelatedItem,
  SemesterGroup,
  Tone,
  TopicEntry,
  YearEntry
} from './types'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const PLAN_DIR = '00-培养方案'
const TOPIC_DIR = '知识专题'
const LAB_DIR = '交互实验'
const OCW_DIR = '公开课'

interface Doc {
  file: string
  body: string
  data: Record<string, string | string[]>
  h1: string
  mtime: number
}

function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, 'zh-Hans-CN', { numeric: true })
}

function unquote(value: string) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/**
 * 只解析站点用到的简单 frontmatter：`key: value`、`key:` + `- item`、`key: [a, b]`。
 * 不引入额外依赖，复杂需求请改用独立数据文件。
 */
function parseFrontmatter(src: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(src)
  if (!match) return { data: {} as Record<string, string | string[]>, body: src }

  const data: Record<string, string | string[]> = {}
  let key = ''

  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const listItem = /^-\s+(.+)$/.exec(line)
    if (listItem) {
      if (!key) continue
      const current = Array.isArray(data[key]) ? (data[key] as string[]) : []
      current.push(unquote(listItem[1]))
      data[key] = current
      continue
    }

    const kv = /^([\w-]+):\s*(.*)$/.exec(line)
    if (!kv) continue
    key = kv[1]
    const raw = kv[2].trim()

    if (!raw) {
      data[key] = []
    } else if (raw.startsWith('[') && raw.endsWith(']')) {
      data[key] = raw
        .slice(1, -1)
        .split(',')
        .map((item) => unquote(item))
        .filter(Boolean)
    } else {
      data[key] = unquote(raw)
    }
  }

  return { data, body: src.slice(match[0].length) }
}

function readDoc(file: string): Doc {
  const src = fs.readFileSync(file, 'utf8')
  const { data, body } = parseFrontmatter(src)
  const h1 = /^#\s+(.+?)\s*$/m.exec(body)?.[1]?.trim() ?? ''
  return { file, body, data, h1, mtime: fs.statSync(file).mtimeMs }
}

function text(value: string | string[] | undefined, fallback = '') {
  if (Array.isArray(value)) return value[0] ?? fallback
  return value ?? fallback
}

function textList(value: string | string[] | undefined) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function cleanHeading(heading: string) {
  return heading.replace(/^\d{1,2}\s*[｜|]\s*/, '').trim()
}

function statusTone(status: string): Tone {
  if (status.includes('已通过')) return 'done'
  if (status.includes('进行中')) return 'active'
  if (status.includes('待复习')) return 'review'
  if (status.includes('重修') || status.includes('补强')) return 'risk'
  if (status.includes('规划')) return 'planned'
  return 'todo'
}

function findStatus(body: string) {
  return /^[-*]\s*状态[：:]\s*(.+?)\s*$/m.exec(body)?.[1] ?? ''
}

function findHours(body: string) {
  const matched = /^[-*]\s*(?:学时预算|计划学时)[：:]\s*(\d+)/m.exec(body)
  return matched ? Number(matched[1]) : 0
}

function parsePlannedCourses(body: string) {
  const lines = body.split(/\r?\n/)
  const result: string[] = []
  let active = false

  for (const line of lines) {
    if (/^##\s*待建立的课程目录/.test(line)) {
      active = true
      continue
    }
    if (active && /^##\s+/.test(line)) break
    if (!active) continue

    const item = /^[-*]\s+(.+?)\s*$/.exec(line)
    if (item) result.push(item[1])
  }

  return result
}

function parseYearTable(body: string) {
  const meta = new Map<string, { period: string; direction: string; hours: number }>()
  for (const line of body.split(/\r?\n/)) {
    const row = /^\|\s*(大[一二三四])\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|$/.exec(
      line.trim()
    )
    if (!row) continue
    meta.set(row[1], {
      period: row[2].trim(),
      direction: row[3].trim(),
      hours: Number(row[4])
    })
  }
  return meta
}

function keyOf(route: string) {
  return route.replace(/^\//, '')
}

function normalizeTitle(value: string) {
  return value.replace(/\s+/g, '').toLowerCase()
}

function shortDate(mtime: number) {
  const date = new Date(mtime)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function readCoursesOfSemester(yearId: string, yearName: string, semesterDir: string) {
  const semesterPath = path.join(ROOT, yearId, semesterDir)
  const courses: CourseEntry[] = []

  for (const entry of fs.readdirSync(semesterPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const readme = path.join(semesterPath, entry.name, 'README.md')
    if (!fs.existsSync(readme)) continue

    const doc = readDoc(readme)
    const code = /^(\d{1,2})/.exec(entry.name)?.[1] ?? ''
    const label = cleanHeading(doc.h1) || entry.name

    courses.push({
      title: doc.h1 || entry.name,
      label,
      code,
      year: yearName,
      yearId,
      semester: semesterDir.replace(/^S\d-/, ''),
      semesterId: semesterDir,
      hours: findHours(doc.body),
      status: findStatus(doc.body) || '未开始',
      tone: statusTone(findStatus(doc.body)),
      route: `/${yearId}/${semesterDir}/${entry.name}/`
    })
  }

  return courses.sort((a, b) => naturalCompare(a.code, b.code))
}

function readYears() {
  const outline = readDoc(path.join(ROOT, PLAN_DIR, '四年培养总纲.md'))
  const yearMeta = parseYearTable(outline.body)

  const yearDirs = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^0[1-4]-/.test(entry.name))
    .map((entry) => entry.name)
    .sort(naturalCompare)

  const years: YearEntry[] = []

  for (const dir of yearDirs) {
    const name = dir.replace(/^0\d-/, '')
    const meta = yearMeta.get(name)
    const dirPath = path.join(ROOT, dir)
    const readmePath = path.join(dirPath, 'README.md')
    const hasReadme = fs.existsSync(readmePath)
    const hasIndex = fs.existsSync(path.join(dirPath, 'index.md'))
    const readme = hasReadme ? readDoc(readmePath) : null

    const semesters: SemesterGroup[] = []
    const extras: RelatedItem[] = []

    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) =>
      naturalCompare(a.name, b.name)
    )) {
      if (!entry.isDirectory()) continue

      if (/^S\d-/.test(entry.name)) {
        const courses = readCoursesOfSemester(dir, name, entry.name)
        if (!courses.length) continue
        semesters.push({
          id: entry.name,
          title: entry.name.replace(/^S\d-/, ''),
          hours: courses.reduce((sum, course) => sum + course.hours, 0),
          courses
        })
        continue
      }

      const subReadme = path.join(dirPath, entry.name, 'README.md')
      if (fs.existsSync(subReadme)) {
        const doc = readDoc(subReadme)
        extras.push({
          label: cleanHeading(doc.h1) || entry.name,
          link: `/${dir}/${entry.name}/`,
          meta: '考核'
        })
      }
    }

    const courses = semesters.flatMap((semester) => semester.courses)
    const passedHours = courses
      .filter((course) => course.tone === 'done')
      .reduce((sum, course) => sum + course.hours, 0)
    const learningHours = courses
      .filter((course) => course.tone === 'active' || course.tone === 'review')
      .reduce((sum, course) => sum + course.hours, 0)
    const plannedCourses = readme ? parsePlannedCourses(readme.body) : []
    const plannedHours =
      Math.max(meta?.hours ?? 0, courses.reduce((sum, course) => sum + course.hours, 0)) || 0

    let status = readme ? findStatus(readme.body) : ''
    if (!status) {
      if (!courses.length) status = '规划中'
      else if (courses.every((course) => course.tone === 'done')) status = '已通过'
      else if (courses.some((course) => ['done', 'active', 'review'].includes(course.tone)))
        status = '进行中'
      else status = '未开始'
    }

    years.push({
      id: dir,
      name,
      period: meta?.period ?? '',
      direction: meta?.direction ?? text(readme?.data.description),
      status,
      tone: statusTone(status),
      plannedHours,
      passedHours,
      learningHours,
      courseCount: courses.length,
      passedCount: courses.filter((course) => course.tone === 'done').length,
      route: `/${dir}/`,
      hasOverview: hasIndex || hasReadme,
      semesters,
      courses,
      plannedCourses,
      extras
    })
  }

  return years
}

function readTopics() {
  const dir = path.join(ROOT, TOPIC_DIR)
  if (!fs.existsSync(dir)) return [] as TopicEntry[]

  const topics: TopicEntry[] = []
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.md') && file !== 'index.md')
    .sort(naturalCompare)

  files.forEach((file, index) => {
    const doc = readDoc(path.join(dir, file))
    const title = text(doc.data.title) || doc.h1 || file.replace(/\.md$/, '')
    const relatedCourses = textList(doc.data.relatedCourses)
    topics.push({
      title,
      tag: text(doc.data.tag, '专题'),
      description: text(doc.data.description),
      route: `/${TOPIC_DIR}/${file.replace(/\.md$/, '')}`,
      href: `/${TOPIC_DIR}/${file.replace(/\.md$/, '')}.html`,
      order: Number(text(doc.data.order, String(index + 1))),
      level: text(doc.data.level, '核心'),
      relatedCourses,
      courses: [],
      labs: []
    })
  })

  return topics.sort((a, b) => a.order - b.order)
}

function readLabs(topics: TopicEntry[]) {
  const dir = path.join(ROOT, LAB_DIR)
  if (!fs.existsSync(dir)) return [] as LabEntry[]

  const labs: LabEntry[] = []
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.md') && file !== 'index.md')
    .sort(naturalCompare)

  files.forEach((file, index) => {
    const doc = readDoc(path.join(dir, file))
    const title = text(doc.data.title) || doc.h1 || file.replace(/\.md$/, '')
    const relatedTopics = textList(doc.data.relatedTopics)
    labs.push({
      title,
      description: text(doc.data.description),
      route: `/${LAB_DIR}/${file.replace(/\.md$/, '')}`,
      href: `/${LAB_DIR}/${file.replace(/\.md$/, '')}.html`,
      order: Number(text(doc.data.order, String(index + 1))),
      difficulty: text(doc.data.difficulty, '入门'),
      minutes: Number(text(doc.data.minutes, '10')),
      relatedTopics,
      topics: relatedTopics
        .map((name) => {
          const topic = topics.find((item) => normalizeTitle(item.title) === normalizeTitle(name))
          return topic
            ? { label: topic.title, link: topic.href, meta: topic.tag }
            : { label: name, meta: '专题' }
        })
    })
  })

  return labs.sort((a, b) => a.order - b.order)
}

/**
 * 公开课镜像：`公开课/<课程目录>/README.md` 是课程主页，
 * `lecture-NN.md` 是讲次页面。两者都由 `scripts/ocw/add-course.mjs` 生成。
 */
function readOcw() {
  const dir = path.join(ROOT, OCW_DIR)
  if (!fs.existsSync(dir)) return [] as OcwEntry[]

  const courses: OcwEntry[] = []
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => naturalCompare(a.name, b.name))

  for (const entry of entries) {
    const coursePath = path.join(dir, entry.name)
    const readme = path.join(coursePath, 'README.md')
    if (!fs.existsSync(readme)) continue

    const doc = readDoc(readme)
    const lectures = fs
      .readdirSync(coursePath)
      .filter((file) => /^lecture-\d+\.md$/.test(file))
      .sort(naturalCompare)
      .map((file) => {
        const lecture = readDoc(path.join(coursePath, file))
        return {
          label: text(lecture.data.title) || lecture.h1 || file.replace(/\.md$/, ''),
          link: `/${OCW_DIR}/${entry.name}/${file.replace(/\.md$/, '')}.html`
        }
      })

    courses.push({
      title: text(doc.data.title) || doc.h1 || entry.name,
      dir: entry.name,
      route: `/${OCW_DIR}/${entry.name}/`,
      href: `/${OCW_DIR}/${entry.name}/`,
      order: Number(text(doc.data.order, '99')),
      description: text(doc.data.description),
      source: text(doc.data.source),
      lectureCount: lectures.length,
      lectures
    })
  }

  return courses.sort((a, b) => a.order - b.order || naturalCompare(a.title, b.title))
}

export function buildContent(): CurriculumData {
  const years = readYears()
  const topics = readTopics()
  const labs = readLabs(topics)
  const ocw = readOcw()

  const allCourses = years.flatMap((year) => year.courses)
  const courseIndex = new Map<string, CourseEntry>()
  for (const course of allCourses) {
    courseIndex.set(normalizeTitle(course.label), course)
    courseIndex.set(normalizeTitle(course.title), course)
  }

  const plannedIndex = new Map<string, string>()
  for (const year of years) {
    for (const name of year.plannedCourses) plannedIndex.set(normalizeTitle(name), year.name)
  }

  function resolveCourse(value: string): RelatedItem {
    const course = courseIndex.get(normalizeTitle(value))
    if (course) {
      return {
        label: course.label,
        link: course.route,
        meta: `${course.year} · ${course.hours} 学时`,
        tone: course.tone
      }
    }
    const plannedYear = plannedIndex.get(normalizeTitle(value))
    return {
      label: value,
      meta: plannedYear ? `${plannedYear} · 规划中` : '规划中',
      tone: 'planned'
    }
  }

  for (const topic of topics) {
    topic.courses = topic.relatedCourses.map(resolveCourse)
    topic.labs = labs
      .filter((lab) =>
        lab.relatedTopics.some((name) => normalizeTitle(name) === normalizeTitle(topic.title))
      )
      .map((lab) => ({ label: lab.title, link: lab.href, meta: lab.difficulty }))
  }

  const related: Record<string, RelatedGroups> = {}

  for (const year of years) {
    for (const course of year.courses) {
      const siblings: RelatedItem[] = year.courses
        .filter((item) => item !== course && item.semesterId === course.semesterId)
        .map((item) => ({
          label: item.label,
          link: item.route,
          meta: `${item.hours} 学时`,
          tone: item.tone
        }))
        .slice(0, 4)

      const matchedTopics: RelatedItem[] = topics
        .filter((topic) =>
          topic.relatedCourses.some((name) => {
            const normalized = normalizeTitle(name)
            return (
              normalized === normalizeTitle(course.label) ||
              normalized === normalizeTitle(course.title)
            )
          })
        )
        .map((topic) => ({ label: topic.title, link: topic.href, meta: topic.tag }))
        .slice(0, 4)

      related[keyOf(course.route)] = { courses: siblings, topics: matchedTopics }
    }
  }

  for (const topic of topics) {
    related[keyOf(topic.route)] = {
      courses: topic.courses,
      topics: topics
        .filter((item) => item !== topic)
        .slice(0, 3)
        .map((item) => ({ label: item.title, link: item.href, meta: item.tag })),
      labs: topic.labs
    }
  }

  for (const lab of labs) {
    related[keyOf(lab.route)] = {
      topics: lab.topics,
      labs: labs
        .filter((item) => item !== lab)
        .slice(0, 2)
        .map((item) => ({ label: item.title, link: item.href, meta: item.difficulty }))
    }
  }

  const totals = {
    plannedHours: years.reduce((sum, year) => sum + year.plannedHours, 0),
    passedHours: years.reduce((sum, year) => sum + year.passedHours, 0),
    learningHours: years.reduce((sum, year) => sum + year.learningHours, 0),
    courseCount: allCourses.length,
    passedCount: allCourses.filter((course) => course.tone === 'done').length,
    learningCount: allCourses.filter((course) => course.tone === 'active').length,
    planningCourseCount: years.reduce((sum, year) => sum + year.plannedCourses.length, 0),
    topicCount: topics.length,
    labCount: labs.length
  }

  const recent: RecentEntry[] = []
  const seen = new Set<string>()

  function addRecent(route: string, href: string, title: string, kind: string, file: string) {
    if (seen.has(route) || !fs.existsSync(file)) return
    seen.add(route)
    recent.push({
      title,
      route,
      href,
      kind,
      date: shortDate(fs.statSync(file).mtimeMs),
      mtime: fs.statSync(file).mtimeMs
    })
  }

  const planDocNames = ['四年培养总纲', '大一课程表', '课程资源核验清单']
  for (const name of planDocNames) {
    const file = path.join(ROOT, PLAN_DIR, `${name}.md`)
    if (!fs.existsSync(file)) continue
    const doc = readDoc(file)
    addRecent(
      `/${PLAN_DIR}/${name}`,
      `/${PLAN_DIR}/${name}.html`,
      doc.h1 || name,
      '培养方案',
      file
    )
  }

  for (const year of years) {
    for (const course of year.courses) {
      const file = path.join(ROOT, course.route.slice(1), 'README.md')
      addRecent(course.route, course.route, course.label, '课程', file)
    }
    for (const extra of year.extras) {
      if (!extra.link) continue
      const file = path.join(ROOT, extra.link.slice(1), 'README.md')
      addRecent(extra.link!, extra.link!, extra.label, '年度考核', file)
    }
    const overviewFile = fs.existsSync(path.join(ROOT, year.id, 'index.md'))
      ? path.join(ROOT, year.id, 'index.md')
      : path.join(ROOT, year.id, 'README.md')
    addRecent(year.route, year.route, `${year.name}总览`, '学年进度', overviewFile)
  }

  for (const topic of topics) {
    const file = path.join(ROOT, keyOf(topic.route) + '.md')
    addRecent(topic.route, topic.href, topic.title, '知识专题', file)
  }

  for (const lab of labs) {
    const file = path.join(ROOT, keyOf(lab.route) + '.md')
    addRecent(lab.route, lab.href, lab.title, '交互实验', file)
  }

  recent.sort((a, b) => b.mtime - a.mtime)

  return {
    years,
    totals,
    topics,
    labs,
    ocw,
    recent: recent.slice(0, 8),
    related
  }
}
