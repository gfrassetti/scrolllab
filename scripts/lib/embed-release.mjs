/**
 * Lógica pura de «¿hay que publicar @scrolllab/embed?». Sin red ni disco: la
 * arman scripts/check-embed-release.mjs (que lee el paquete y el registro de
 * npm) y el workflow .github/workflows/embed-release.yml (que avisa).
 *
 * Una versión publicada en npm no se puede volver a subir con el mismo número,
 * así que hay dos casos distintos cuando el repo no coincide con npm:
 *  - la versión del repo todavía no está en npm        → `publish`
 *  - la versión ya está en npm pero el contenido cambió → `needs-bump`
 */
import crypto from 'node:crypto'
import zlib from 'node:zlib'

/** @param {string} v */
export function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(v).trim())
  if (!m) return null
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] || '' }
}

/**
 * -1, 0 o 1. Una versión con pre-release (0.3.0-beta.1) es menor que la
 * estable (0.3.0).
 * @param {string} a
 * @param {string} b
 */
export function compareVersions(a, b) {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (!pa || !pb) throw new Error(`Versión inválida: ${!pa ? a : b}`)
  for (const k of ['major', 'minor', 'patch']) {
    if (pa[k] !== pb[k]) return pa[k] < pb[k] ? -1 : 1
  }
  if (pa.pre === pb.pre) return 0
  if (!pa.pre) return 1
  if (!pb.pre) return -1
  return pa.pre < pb.pre ? -1 : 1
}

/** Mismo texto con LF: el paquete se publica desde Windows y se chequea en Linux. */
export function normalizeText(buf) {
  return Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
}

/** @param {Buffer} buf */
export function sha256(buf) {
  return crypto.createHash('sha256').update(normalizeText(buf)).digest('hex')
}

/**
 * El package.json que se compara: npm lo normaliza al publicar (saca `scripts`
 * vacío, agrega campos internos), así que solo cuentan los campos que cambian
 * lo que recibe quien instala.
 * @param {Record<string, any>} pkg
 */
export function comparablePackageJson(pkg) {
  const KEYS = [
    'name',
    'version',
    'type',
    'sideEffects',
    'main',
    'module',
    'types',
    'typesVersions',
    'exports',
    'files',
    'dependencies',
    'peerDependencies',
    'peerDependenciesMeta',
  ]
  const sortDeep = (v) =>
    Array.isArray(v)
      ? v.map(sortDeep)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep(v[k])]))
        : v
  return JSON.stringify(sortDeep(Object.fromEntries(KEYS.filter((k) => k in pkg).map((k) => [k, pkg[k]]))))
}

/**
 * Qué archivos difieren entre lo local y lo publicado.
 * @param {Map<string, string>} local  ruta → sha256
 * @param {Map<string, string>} remote ruta → sha256
 */
export function diffFiles(local, remote) {
  const changed = []
  const added = []
  const removed = []
  for (const [p, h] of local) {
    if (!remote.has(p)) added.push(p)
    else if (remote.get(p) !== h) changed.push(p)
  }
  for (const p of remote.keys()) if (!local.has(p)) removed.push(p)
  return { changed: changed.sort(), added: added.sort(), removed: removed.sort() }
}

/**
 * @param {{
 *   localVersion: string,
 *   publishedVersions: string[],
 *   latest: string | null,
 *   diff?: { changed: string[], added: string[], removed: string[] },
 * }} input
 * @returns {{ status: 'publish' | 'needs-bump' | 'up-to-date' | 'version-behind', reason: string }}
 */
export function classify({ localVersion, publishedVersions, latest, diff }) {
  if (!parseVersion(localVersion)) {
    throw new Error(`La versión del repo no es válida: ${localVersion}`)
  }
  if (!publishedVersions.includes(localVersion)) {
    if (latest && compareVersions(localVersion, latest) <= 0) {
      return {
        status: 'version-behind',
        reason: `La versión del repo (${localVersion}) no está en npm pero es menor o igual que la última publicada (${latest}).`,
      }
    }
    return {
      status: 'publish',
      reason: latest
        ? `La versión ${localVersion} del repo todavía no está en npm (la última publicada es ${latest}).`
        : `El paquete todavía no se publicó en npm.`,
    }
  }
  const d = diff || { changed: [], added: [], removed: [] }
  const n = d.changed.length + d.added.length + d.removed.length
  if (n > 0) {
    return {
      status: 'needs-bump',
      reason:
        `La versión ${localVersion} ya está en npm, pero el contenido del repo cambió (${n} archivo/s). ` +
        `npm no deja volver a subir el mismo número: hay que subir la versión.`,
    }
  }
  return { status: 'up-to-date', reason: `La versión ${localVersion} está publicada y coincide con el repo.` }
}

/**
 * Lee un .tgz de npm (gzip + tar) y devuelve ruta → contenido, sin el prefijo
 * `package/`. Sin dependencias: el tar de npm es el formato ustar simple.
 * @param {Buffer} tgz
 * @returns {Map<string, Buffer>}
 */
export function readTgz(tgz) {
  const tar = zlib.gunzipSync(tgz)
  const files = new Map()
  let off = 0
  let longName = null
  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512)
    if (header.every((b) => b === 0)) break
    const field = (start, len) => header.toString('utf8', start, start + len).replace(/\0.*$/s, '')
    let name = field(0, 100)
    const prefix = field(345, 155)
    if (prefix) name = `${prefix}/${name}`
    const size = parseInt(field(124, 12).trim() || '0', 8)
    const type = String.fromCharCode(header[156] || 48)
    off += 512
    const body = tar.subarray(off, off + size)
    off += Math.ceil(size / 512) * 512
    if (type === 'L') {
      longName = body.toString('utf8').replace(/\0.*$/s, '')
      continue
    }
    if (longName) {
      name = longName
      longName = null
    }
    if (type === '0' || type === '\0') {
      files.set(name.replace(/^package\//, ''), Buffer.from(body))
    }
  }
  return files
}
