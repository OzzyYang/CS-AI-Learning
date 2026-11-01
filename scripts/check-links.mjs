#!/usr/bin/env node
/**
 * 检查 dist/ 中所有 HTML 的内部链接与锚点。
 * 用法：npm run build && npm run check:links
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const candidates = [path.join(ROOT, 'dist'), path.join(ROOT, '.vitepress/dist')]
const DIST = candidates.find((candidate) => fs.existsSync(candidate))

if (!DIST) {
  console.error('未找到构建产物（dist/ 或 .vitepress/dist/），请先执行 npm run build。')
  process.exit(1)
}

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

function decode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function resolveTarget(pageDir, decoded) {
  const cleanPath = decoded.split('?')[0]
  const targetPath = cleanPath.startsWith('/')
    ? path.join(DIST, cleanPath)
    : path.resolve(pageDir, cleanPath)

  if (cleanPath.endsWith('/')) return path.join(targetPath, 'index.html')
  if (!path.extname(targetPath)) return `${targetPath}.html`
  return targetPath
}

const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'))
const attrPattern = /\b(?:href|src)="([^"]+)"/gi
const failures = []
let checked = 0

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8')
  const pageDir = path.dirname(file)
  const relativePage = path.relative(DIST, file)

  for (const match of html.matchAll(attrPattern)) {
    const raw = match[1]
    if (!raw) continue
    if (
      /^(?:https?:)?\/\//i.test(raw) ||
      /^(?:mailto:|tel:|javascript:|data:)/i.test(raw) ||
      raw.startsWith('#')
    ) {
      continue
    }

    const [pathPart, hashPart] = raw.split('#')
    if (!pathPart) continue

    const decoded = decode(pathPart)
    const target = resolveTarget(pageDir, decoded)
    checked += 1

    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      failures.push(`${relativePage} → ${raw}（目标不存在）`)
      continue
    }

    if (hashPart) {
      const fragment = decode(hashPart)
      const targetHtml = fs.readFileSync(target, 'utf8')
      const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const hasId = new RegExp(`\\sid=["']${escaped}["']`).test(targetHtml)
      if (!hasId) {
        failures.push(`${relativePage} → ${raw}（锚点不存在）`)
      }
    }
  }
}

if (failures.length) {
  console.error(`链接检查失败：${failures.length} 个问题（共检查 ${checked} 个链接）\n`)
  for (const failure of failures.slice(0, 50)) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`链接检查通过：${htmlFiles.length} 个页面，${checked} 个内部链接/资源。`)
