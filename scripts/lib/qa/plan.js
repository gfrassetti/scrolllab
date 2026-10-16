/**
 * Las decisiones del barrido de QA (scripts/qa-sweep.mjs), sin I/O: qué
 * modelos probar según lo que cambió, el id estable de un hallazgo y cómo pasa
 * de un estado a otro. Las prueba scripts/lib/qa/__tests__/plan.test.js.
 * Arquitectura y porqué: docs/adr/0007-pruebas-continuas-de-secciones.md.
 */
import { createHash } from 'node:crypto'

/**
 * Archivos que, si cambian, afectan a cualquier sección: todos los modelos
 * pasan por los pasos rápidos; los completos quedan para los que cambiaron y el
 * de la rotación. El motor de animación, el embed, el empaquetador, los estilos
 * compartidos y las propias herramientas de prueba.
 */
const SHARED = [
  /^embed\//,
  /^server\/packaging\.js$/,
  /^server\/sections\.js$/,
  /^src\/lib\/(motion|gsap|beat|webgl|responsiveImage|themeVars|modelWrappers|sectionRegistry)/,
  /^src\/styles\//,
  /^src\/index\.css$/,
  /^src\/domain\/sections\.js$/,
  /^src\/domain\/sectionFields\/(helpers|sanitize|types)\.js$/,
  /^scripts\/(check-|screen-lab|lib\/)/,
]

/**
 * Modelos a probar a partir de los archivos que cambiaron. `all`: cambió algo
 * compartido; `models`: los que cambiaron directamente (su sección, campos,
 * página o public/), haya o no algo compartido.
 * @param {string[]} files rutas relativas al repo (con `/`)
 * @param {string[]} models los modelos que existen
 * @returns {{ all: boolean, models: string[] }}
 */
export function modelsToCheck(files, models) {
  const known = new Set(models)
  const byLower = new Map(models.map((m) => [m.toLowerCase(), m]))
  const out = new Set()
  let all = false
  for (const raw of files) {
    const f = raw.replace(/\\/g, '/')
    if (SHARED.some((re) => re.test(f))) {
      all = true
      continue
    }
    const m =
      f.match(/^src\/components\/sections\/([^/]+)\//)?.[1] ||
      f.match(/^src\/domain\/sectionFields\/fields\/([^/.]+)\.js$/)?.[1] ||
      f.match(/^public\/([^/]+)\//)?.[1] ||
      byLower.get((f.match(/^src\/pages\/([A-Za-z]+)Page\.jsx$/)?.[1] || '').toLowerCase())
    if (m && known.has(m)) out.add(m)
  }
  return { all, models: models.filter((m) => out.has(m)) }
}

/** El siguiente modelo de la rotación: todo se prueba entero cada tanto aunque no cambie. */
export function nextInRotation(models, last) {
  if (!models.length) return null
  const i = models.indexOf(last)
  return models[(i + 1) % models.length]
}

/**
 * El detalle sin lo que cambia de corrida en corrida (números, medidas, tiempos,
 * hashes, puertos): la misma falla es el mismo hallazgo, no uno «nuevo» por noche.
 */
export function normalizeDetail(detail) {
  return String(detail)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, 'URL')
    .replace(/[0-9a-f]{8,}/g, 'H')
    .replace(/\d+(\.\d+)?/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
}

export function findingId(model, step, detail) {
  const key = `${model}|${step}|${normalizeDetail(detail)}`
  return createHash('sha1').update(key).digest('hex').slice(0, 12)
}

/**
 * Las líneas de error de la salida de un paso: las de los check-* empiezan con
 * ✗, ✖ o «- » (lista de problemas). Sin ninguna, el final de la salida.
 */
export function parseFailures(log) {
  const lines = String(log).split(/\r?\n/)
  // Sin los colores de la terminal (ESC[…m).
  const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
  // El «Call log:» de Playwright lista sus pasos con «- », y un aviso de Vite
  // («(!) Some chunks are larger…») sus sugerencias: no son hallazgos.
  let inCallLog = false
  let inViteWarning = false
  const hits = lines
    .map((l) => l.replace(ansi, '').trim())
    .filter((l) => {
      if (/Call log:/.test(l)) {
        inCallLog = true
        return false
      }
      if (/^\(!\)/.test(l)) {
        inViteWarning = true
        return false
      }
      if ((inCallLog || inViteWarning) && /^- /.test(l)) return false
      inCallLog = false
      inViteWarning = false
      // node --test (TAP): el motivo de cada prueba que falló, no el de la suite.
      if (/^error: '.+'$/.test(l)) return !/subtests? failed/.test(l)
      return /^(✗|✖|- )/.test(l) && !/^✖ (\d+ problema|fallaron|\d+ inconsistencia)/.test(l)
    })
    .map((l) => l.replace(/^(✗|✖|-)\s*/, '').replace(/^error: '(.+)'$/, '$1'))
  if (hits.length) return [...new Set(hits)].slice(0, 30)
  const tail = lines.filter((l) => l.trim()).slice(-6).join(' / ')
  return tail ? [`sin detalle; final de la salida: ${tail.slice(0, 300)}`] : ['falló sin salida']
}

/** Estados: open → fixed (deja de aparecer en una corrida que lo cubrió) · needs-person (2 intentos del fixer). */
export const MAX_FIX_ATTEMPTS = 2

/**
 * Junta lo de esta corrida con el registro.
 * @param {Record<string, object>} ledger id → hallazgo
 * @param {{ model: string, step: string, detail: string }[]} found
 * @param {{ model: string, step: string }[]} covered pasos que corrieron (pasaran o no)
 * @param {string} now ISO
 */
export function reconcile(ledger, found, covered, now) {
  const next = structuredClone(ledger)
  const seen = new Set()
  for (const f of found) {
    const id = findingId(f.model, f.step, f.detail)
    seen.add(id)
    const prev = next[id]
    if (!prev || prev.status === 'fixed') {
      next[id] = {
        id,
        model: f.model,
        step: f.step,
        detail: f.detail,
        status: 'open',
        firstSeen: prev?.firstSeen || now,
        lastSeen: now,
        timesSeen: (prev?.timesSeen || 0) + 1,
        attempts: 0,
        ...(prev?.status === 'fixed' ? { reopened: now } : {}),
      }
    } else {
      next[id] = { ...prev, detail: f.detail, lastSeen: now, timesSeen: (prev.timesSeen || 0) + 1 }
    }
  }
  const ran = new Set(covered.map((c) => `${c.model}|${c.step}`))
  for (const f of Object.values(next)) {
    if (f.status === 'fixed' || seen.has(f.id)) continue
    if (ran.has(`${f.model}|${f.step}`)) next[f.id] = { ...f, status: 'fixed', fixedAt: now }
  }
  return next
}

/** El fixer anota un intento; al segundo que no alcanza, pasa a una persona. */
export function recordAttempt(ledger, id, { ok, note, now }) {
  const f = ledger[id]
  if (!f) throw new Error(`hallazgo desconocido: ${id}`)
  if (ok) return { ...ledger, [id]: { ...f, status: 'fixed', fixedAt: now, note } }
  const attempts = (f.attempts || 0) + 1
  return {
    ...ledger,
    [id]: { ...f, attempts, note, status: attempts >= MAX_FIX_ATTEMPTS ? 'needs-person' : f.status },
  }
}

/** Lo que el fixer puede tomar esta noche: abiertos, de a modelo, con tope. */
export function fixQueue(ledger, limit = 5) {
  return Object.values(ledger)
    .filter((f) => f.status === 'open')
    .sort((a, b) => (b.timesSeen || 0) - (a.timesSeen || 0) || a.firstSeen.localeCompare(b.firstSeen))
    .slice(0, limit)
}
