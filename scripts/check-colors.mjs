/**
 * check:colors — ¿todo lo que se ve en cada sección del builder sigue a sus
 * campos de color?
 *
 * `check:editable` mira que exista un campo de color y que llegue al HTML; no
 * ve el resto de la sección: un `text-foam/60` de la paleta del tema, un
 * `#ff3ea5` fijo en un style, el fondo de un botón. Acá cada sección se pinta
 * con colores TESTIGO en todos sus campos de color (sueltos y de listas) y, en
 * Chromium, se recorre cada elemento visible: color del texto, fondo (y los
 * colores de un degradé), bordes, relleno y trazo de SVG. Un color que no es
 * un testigo —ni un tono de un testigo: con transparencia, o mezclado con
 * blanco, negro u otro testigo— es un color fijo que el comprador no puede
 * cambiar.
 *
 * No ve lo que se dibuja en canvas / WebGL (eso va a mano) ni las sombras.
 * Velos y sombras neutros (negro o blanco con transparencia) se aceptan.
 *
 * Uso:
 *   npm run check:colors                  todas; falla si alguna tiene colores fijos
 *   npm run check:colors -- fizz          un modelo (o una sección: fizz/HeroBubbles)
 *   npm run check:colors -- --all         lista también las que están al día
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

import { SECTION_FIELDS } from '../src/domain/sectionFields/fields.js'
import { BUILDER_HIDDEN_SKUS } from '../src/domain/catalog.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STORAGE_KEY = 'builder-composition-v1'
const args = process.argv.slice(2)
const showAll = args.includes('--all')
const only = args.find((a) => !a.startsWith('--'))

/**
 * Fijo a propósito, por sección: [selector CSS o texto, motivo]. Corto: cada
 * entrada es un color que el comprador ve y no puede cambiar.
 */
const ACCEPTED = {}

// Testigos (ColorBrewer Dark2 + Paired): bien distintos entre sí y de los
// colores de las demos.
const SENTINELS = [
  '#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02',
  '#a6761d', '#1f78b4', '#b2df8a', '#fb9a99', '#cab2d6', '#6a3d9a',
  '#33a02c', '#ff7f00', '#b15928', '#8dd3c7',
]

/** Colores testigo para cada campo de color de la sección (y de sus listas). */
function sentinelProps(sectionId) {
  const fields = SECTION_FIELDS[sectionId] || []
  const props = {}
  let k = 0
  const next = () => SENTINELS[k++ % SENTINELS.length]
  for (const field of fields) {
    if (field.type === 'color') props[field.key] = next()
    if (field.type === 'list' && (field.item || []).some((s) => s.type === 'color')) {
      const colors = Object.fromEntries((field.item || []).filter((s) => s.type === 'color').map((s) => [s.key, next()]))
      // Tres filas con los mismos testigos: se ve la lista entera pintada.
      props[field.key] = [0, 1, 2].map(() => ({ ...colors }))
    }
  }
  return { props, used: SENTINELS.slice(0, Math.max(k, 0)) }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

function startVite(port) {
  const bin = path.join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')
  const proc = spawn(process.execPath, [bin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: REPO,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('vite no arrancó: timeout'))
    }, 60000)
    proc.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('ready in')) {
        clearTimeout(timer)
        resolve(proc)
      }
    })
    proc.on('error', reject)
  })
}

/** Corre en la página: lista los colores visibles que no salen de un testigo. */
function scanInPage(sentinels) {
  const toRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const S = sentinels.map(toRgb)
  const WHITE = [255, 255, 255]
  const BLACK = [0, 0, 0]

  // getComputedStyle devuelve rgb(), color(srgb …) u oklab()/oklch() (color-mix).
  const lin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
  const oklabToRgb = (L, a, b) => {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    return [r, g, bb].map((v) => Math.round(Math.min(1, Math.max(0, lin(v))) * 255))
  }
  const parse = (str) => {
    if (!str || str === 'none' || str === 'transparent') return null
    let m = str.match(/rgba?\(([^)]+)\)/)
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
      return { rgb: p.slice(0, 3), a: p[3] ?? 1 }
    }
    m = str.match(/color\(srgb ([^)]+)\)/)
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number)
      return { rgb: p.slice(0, 3).map((v) => Math.round(v * 255)), a: p[3] ?? 1 }
    }
    m = str.match(/oklab\(([^)]+)\)/)
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat)
      return { rgb: oklabToRgb(p[0], p[1], p[2]), a: p[3] ?? 1 }
    }
    m = str.match(/oklch\(([^)]+)\)/)
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat)
      const h = (p[2] * Math.PI) / 180
      return { rgb: oklabToRgb(p[0], p[1] * Math.cos(h), p[1] * Math.sin(h)), a: p[3] ?? 1 }
    }
    return null
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  // ¿c está sobre el segmento a→b? (una mezcla de los dos)
  const onSegment = (c, a, b) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2
    if (!len2) return dist(c, a) < 8
    let t = ((c[0] - a[0]) * ab[0] + (c[1] - a[1]) * ab[1] + (c[2] - a[2]) * ab[2]) / len2
    t = Math.min(1, Math.max(0, t))
    return dist(c, [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t]) < 9
  }
  const follows = (color) => {
    const { rgb, a } = color
    if (a < 0.03) return true
    const neutral = rgb.every((v) => v < 6) || rgb.every((v) => v > 249)
    if (neutral && a < 0.6) return true // velos y sombras
    for (let i = 0; i < S.length; i += 1) {
      if (dist(rgb, S[i]) < 8) return true
      if (onSegment(rgb, S[i], WHITE) || onSegment(rgb, S[i], BLACK)) return true
      for (let j = i + 1; j < S.length; j += 1) if (onSegment(rgb, S[i], S[j])) return true
    }
    return false
  }
  const hex = ({ rgb, a }) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}${a < 1 ? ` /${a.toFixed(2)}` : ''}`

  const root = document.querySelector('#top > div')
  if (!root) return { error: 'no se encontró la sección' }
  const out = []
  const seen = new Set()
  const opacityOf = (el) => {
    let o = 1
    for (let n = el; n && n !== document.body; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
    return o
  }
  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') || ''
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)
    return `<${el.tagName.toLowerCase()}${cls ? ` .${cls.split(/\s+/).slice(0, 4).join('.')}` : ''}>${text ? ` «${text}»` : ''}`
  }
  const flag = (el, prop, raw) => {
    const c = parse(raw)
    if (!c || follows(c)) return
    const key = `${prop}|${hex(c)}|${el.tagName}|${el.className}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ prop, color: hex(c), el: describe(el) })
  }
  const SKIP = new Set(['CANVAS', 'IMG', 'VIDEO', 'PICTURE', 'SOURCE', 'SCRIPT', 'STYLE', 'BR', 'IFRAME', 'NOSCRIPT'])
  const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan'])
  for (const el of [root, ...root.querySelectorAll('*')]) {
    if (SKIP.has(el.tagName) || el.closest('defs, clipPath, mask')) continue
    const r = el.getBoundingClientRect()
    if (r.width * r.height < 4) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    if (opacityOf(el) < 0.05) continue
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (hasText) flag(el, 'texto', cs.color)
    if (el !== root) flag(el, 'fondo', cs.backgroundColor)
    for (const m of (cs.backgroundImage || '').matchAll(/(rgba?\([^)]+\)|oklab\([^)]+\)|oklch\([^)]+\)|color\(srgb[^)]+\))/g)) flag(el, 'degradé', m[1])
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none') flag(el, 'borde', cs[`border${side}Color`])
    }
    // Texto en contorno (las palabras gigantes «fantasma»).
    if (parseFloat(cs.webkitTextStrokeWidth) > 0) flag(el, 'contorno', cs.webkitTextStrokeColor)
    if (SHAPES.has(el.tagName.toLowerCase())) {
      if (cs.fill && !/^url/.test(cs.fill)) flag(el, 'relleno SVG', cs.fill)
      if (cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0) flag(el, 'trazo SVG', cs.stroke)
    }
  }
  const canvas = root.querySelectorAll('canvas').length
  return { found: out, canvas }
}

async function main() {
  const ids = Object.keys(SECTION_FIELDS).filter((id) => {
    if (BUILDER_HIDDEN_SKUS.includes(id.split('/')[0])) return false
    if (!only) return true
    return only.includes('/') ? id === only : id.startsWith(`${only}/`)
  })
  const port = await freePort()
  const vite = await startVite(port)
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
  const results = []
  try {
    for (const id of ids) {
      const { props, used } = sentinelProps(id)
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-AR', reducedMotion: 'reduce' })
      const page = await ctx.newPage()
      await page.addInitScript(
        ([k, v]) => {
          localStorage.setItem(k, v)
          // El market muestra todo con movimiento por defecto: acá se pide la
          // versión calma (texto plano, sin SplitText) a mano.
          localStorage.setItem('scrolllab-motion', 'calm')
        },
        [STORAGE_KEY, JSON.stringify([{ uid: 'c1', sectionId: id, props }])],
      )
      await page.goto(`http://127.0.0.1:${port}/preview`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2500)
      const res = used.length ? await page.evaluate(scanInPage, used) : { noFields: true }
      const accepted = ACCEPTED[id] || []
      const found = (res.found || []).filter((f) => !accepted.some(([needle]) => f.el.includes(needle)))
      results.push({ id, ...res, found, colorFields: used.length })
      await ctx.close()
    }
  } finally {
    await browser.close()
    vite.kill()
  }

  let bad = 0
  for (const r of results) {
    const problems = r.noFields ? ['la sección no tiene ningún campo de color'] : r.error ? [r.error] : r.found.map((f) => `${f.prop} ${f.color}  ${f.el}`)
    if (problems.length) bad += 1
    if (!problems.length && !showAll) continue
    console.log(`\n${problems.length ? '✖' : '✓'} ${r.id}${r.canvas ? `  (+${r.canvas} canvas: revisar a mano)` : ''}`)
    for (const p of problems.slice(0, 14)) console.log(`   ${p}`)
    if (problems.length > 14) console.log(`   … y ${problems.length - 14} más`)
  }
  console.log(`\n${results.length - bad}/${results.length} secciones: todo lo visible sigue a sus campos de color`)
  process.exit(bad ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
