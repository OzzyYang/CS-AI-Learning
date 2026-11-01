/**
 * 极简 ZIP 读取器（零依赖）。
 *
 * 只支持 store(0) 与 deflate(8) 两种压缩方式，足够读取 MIT OCW 的课程打包文件。
 * 不解压到磁盘，调用方按名字挑选需要的条目，避免把整包（含 HTML/JS）写入仓库。
 */

import zlib from 'node:zlib'

const EOCD_SIG = 0x06054b50
const CENTRAL_SIG = 0x02014b50
const LOCAL_SIG = 0x04034b50

function findEndOfCentralDirectory(buffer) {
  const maxComment = 0xffff
  const start = Math.max(0, buffer.length - maxComment - 22)
  for (let offset = buffer.length - 22; offset >= start; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIG) return offset
  }
  throw new Error('不是有效的 ZIP 文件：未找到中央目录结束标记')
}

/**
 * @param {Buffer} buffer
 * @returns {Map<string, {name: string, method: number, compressedSize: number, size: number, offset: number}>}
 */
export function listZipEntries(buffer) {
  const eocd = findEndOfCentralDirectory(buffer)
  const count = buffer.readUInt16LE(eocd + 10)
  const directoryOffset = buffer.readUInt32LE(eocd + 16)

  if (directoryOffset === 0xffffffff) {
    throw new Error('暂不支持 ZIP64 格式的课程包')
  }

  const entries = new Map()
  let pointer = directoryOffset

  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(pointer) !== CENTRAL_SIG) {
      throw new Error(`ZIP 中央目录损坏：第 ${index + 1} 条记录签名不正确`)
    }

    const method = buffer.readUInt16LE(pointer + 10)
    const compressedSize = buffer.readUInt32LE(pointer + 20)
    const size = buffer.readUInt32LE(pointer + 24)
    const nameLength = buffer.readUInt16LE(pointer + 28)
    const extraLength = buffer.readUInt16LE(pointer + 30)
    const commentLength = buffer.readUInt16LE(pointer + 32)
    const offset = buffer.readUInt32LE(pointer + 42)
    const name = buffer.toString('utf8', pointer + 46, pointer + 46 + nameLength)

    entries.set(name, { name, method, compressedSize, size, offset })
    pointer += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

/**
 * 读取单个条目的内容，返回未压缩的 Buffer。
 */
export function readZipEntry(buffer, entry) {
  if (buffer.readUInt32LE(entry.offset) !== LOCAL_SIG) {
    throw new Error(`ZIP 条目损坏：${entry.name}`)
  }

  const nameLength = buffer.readUInt16LE(entry.offset + 26)
  const extraLength = buffer.readUInt16LE(entry.offset + 28)
  const dataStart = entry.offset + 30 + nameLength + extraLength
  const raw = buffer.subarray(dataStart, dataStart + entry.compressedSize)

  if (entry.method === 0) return raw
  if (entry.method === 8) return zlib.inflateRawSync(raw)
  throw new Error(`不支持的压缩方式 ${entry.method}：${entry.name}`)
}
