import zlib from 'node:zlib'

/**
 * Lector mínimo de ZIP para los tests: archiver solo sabe escribir y no
 * queremos una dependencia más para poder abrir lo que le vendemos al cliente.
 *
 * Lee el directorio central (que siempre trae los tamaños reales, a diferencia
 * del header local cuando archiver escribe en streaming) y descomprime cada
 * entrada.
 */

const EOCD_SIG = 0x06054b50
const CEN_SIG = 0x02014b50

function findEocd(buf) {
  // El comentario final puede medir hasta 64 kB; se busca la firma hacia atrás.
  const min = Math.max(0, buf.length - 0xffff - 22)
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i
  }
  throw new Error('ZIP inválido: no se encontró el End of Central Directory')
}

/** @returns {Map<string, Buffer>} ruta dentro del ZIP → contenido */
export function readZip(buf) {
  const eocd = findEocd(buf)
  const total = buf.readUInt16LE(eocd + 10)
  let offset = buf.readUInt32LE(eocd + 16)

  const files = new Map()
  for (let i = 0; i < total; i += 1) {
    if (buf.readUInt32LE(offset) !== CEN_SIG) {
      throw new Error(`ZIP inválido: entrada ${i} sin firma de directorio central`)
    }
    const method = buf.readUInt16LE(offset + 10)
    const compressedSize = buf.readUInt32LE(offset + 20)
    const nameLen = buf.readUInt16LE(offset + 28)
    const extraLen = buf.readUInt16LE(offset + 30)
    const commentLen = buf.readUInt16LE(offset + 32)
    const localOffset = buf.readUInt32LE(offset + 42)
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen)

    const localNameLen = buf.readUInt16LE(localOffset + 26)
    const localExtraLen = buf.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    const raw = buf.subarray(dataStart, dataStart + compressedSize)

    if (!name.endsWith('/')) {
      files.set(name, method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw))
    }
    offset += 46 + nameLen + extraLen + commentLen
  }
  return files
}

const EXTS = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx']

/** Resuelve `spec` relativo a `from` contra las rutas presentes en el ZIP. */
export function resolveInZip(files, from, spec) {
  const parts = from.split('/').slice(0, -1)
  for (const segment of spec.split('/')) {
    if (segment === '.' || segment === '') continue
    if (segment === '..') parts.pop()
    else parts.push(segment)
  }
  const base = parts.join('/')
  return EXTS.some((ext) => files.has(base + ext))
}

/** Todos los imports relativos de un archivo fuente. */
export function relativeImports(source) {
  return [
    ...source.matchAll(/from\s+'(\.[^']+)'/g),
    ...source.matchAll(/import\s*\(\s*'(\.[^']+)'\s*\)/g),
  ].map((m) => m[1])
}

/** Rutas de un ZIP cuyos imports relativos no resuelven dentro del mismo ZIP. */
export function brokenImports(files) {
  const broken = []
  for (const [name, content] of files) {
    if (!/\.(jsx?|tsx?)$/.test(name)) continue
    for (const spec of relativeImports(content.toString('utf8'))) {
      if (!resolveInZip(files, name, spec)) broken.push(`${name} → ${spec}`)
    }
  }
  return broken
}
