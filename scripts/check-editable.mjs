/**
 * check:editable — ¿qué se ve en cada sección del builder que el usuario NO
 * puede cambiar desde el panel?
 *
 * Renderiza cada sección en el servidor (Vite SSR, sin efectos: ni GSAP ni
 * scroll) con valores marcados en TODOS sus campos de src/lib/sectionFields.js
 * (textos «ZQ…», imágenes https://zq.test/…, links #zq…, color #123456) y
 * lista lo que queda en el HTML que no salió de un campo:
 *
 *   texto    palabras visibles fijas en el JSX (aria-label/alt incluidos)
 *   imagen   <img>/<video>/<source>/url(...) que no es la del campo
 *   link     <a href> fijo
 *   color    la sección no tiene campo de color, o el color no llega al HTML
 *
 * El objetivo es el mismo listón que LAB: cada texto, imagen, link y color de
 * una sección se edita. Lo que es fijo a propósito (una marca de diseño, un
 * glifo) va en ACCEPTED con el motivo. Animaciones y layout no son campos.
 *
 * Uso:
 *   npm run check:editable                 todas; falla en las fases cerradas
 *   npm run check:editable -- --all        lista también las pendientes
 *   npm run check:editable -- chapters/NavMinimal   una sola, con detalle
 *
 * Fases: `STRICT_KINDS` son los tipos ya llevados a paridad (fallan si algo
 * vuelve a quedar fijo); el resto se informa como pendiente.
 */
import { spawnSync } from 'node:child_process'
import { createServer } from 'vite'

const major = Number(process.versions.node.split('.')[0])
if (major < 22 && !process.execArgv.includes('--experimental-detect-module')) {
  const rerun = spawnSync(process.execPath, ['--experimental-detect-module', ...process.argv.slice(1)], {
    stdio: 'inherit',
  })
  process.exit(rerun.status ?? 1)
}

/** Tipos de sección que ya tienen que estar 100% editables. */
const STRICT_KINDS = ['nav', 'hero', 'footer']

/**
 * Fijo a propósito, por sección: `texto` exacto (o RegExp) con el motivo.
 * Mantener corto: cada entrada es algo que el usuario ve y no puede cambiar.
 */
const ACCEPTED = {
  // '*' vale para todas: piezas de UI que no son contenido.
  '*': [
    // aria-label de un <nav>: nombra el landmark para el lector de pantalla,
    // no es copy de la página.
    [/^(primary|main|primary navigation|main navigation|links)$/i, 'nombre del landmark <nav>'],
  ],
  'meridian/Hero': [
    [/^(language|es|en)$/i, 'selector de idioma del template: los idiomas son los del diccionario (lang.jsx)'],
    [/^\/meridian\/hero\/seq\//, 'película del hero: 120 frames, se reemplaza la carpeta en el código'],
  ],
}

const args = process.argv.slice(2)
const showAll = args.includes('--all')
const only = args.find((a) => a.includes('/'))

// Lo mínimo del navegador para módulos que lo tocan al cargarse.
const noop = () => {}
globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop }
globalThis.document = {
  documentElement: {
    classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    style: {},
    dataset: {},
    setAttribute: noop,
    lang: '',
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
}

// ——— valores marcados ————————————————————————————————————————————————
const NUMERIC_KEYS = /^(x|y|slide|value|count|year|price|n|index|number|percent)$/i
let seq = 0
const mark = () => `ZQ${(++seq).toString(36)}`

function sentinelFor(field) {
  switch (field.type) {
    case 'color':
      return '#123456'
    case 'image':
    case 'url':
      return `https://zq.test/${mark()}.webp`
    case 'href':
      return `#zq${(++seq).toString(36)}`
    case 'price':
      return '123'
    case 'select':
      return field.options?.[0]?.value ?? ''
    case 'textarea':
      // Listas en texto («Texto | #ancla», uno por línea).
      if (/\|/.test(field.label || '') || /links|items|steps|pasos/i.test(field.key)) {
        const a = mark()
        const b = mark()
        return `${a} | #${a.toLowerCase()}\n${b} | #${b.toLowerCase()}`
      }
      return `${mark()} ${mark()}`
    case 'list': {
      const rows = Math.min(field.max || 3, 3)
      return Array.from({ length: rows }, (_, i) =>
        Object.fromEntries(
          (field.item || []).map((sub) => {
            if (NUMERIC_KEYS.test(sub.key)) return [sub.key, sub.key === 'slide' ? '1' : String(20 + i * 20)]
            return [sub.key, sentinelFor(sub)]
          }),
        ),
      )
    }
    default:
      if (NUMERIC_KEYS.test(field.key)) return '42'
      return mark()
  }
}

// ——— HTML → piezas visibles ————————————————————————————————————————————
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;|&#160;/g, ' ')
}

function attrsOf(tag) {
  const out = {}
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?/g)) out[m[1].toLowerCase()] = decode(m[2] ?? '')
  return out
}

/** Texto visible + atributos que lee una persona o un lector de pantalla. */
function scan(html) {
  const texts = []
  const images = []
  const links = []
  const stack = []
  let hidden = 0 // dentro de <script>/<style>/<svg><text> no cuenta como copy… salvo SVG text
  const re = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/)?>|([^<]+)/g
  for (const m of html.matchAll(re)) {
    if (m[5] !== undefined) {
      if (hidden) continue
      const text = decode(m[5]).replace(/\s+/g, ' ').trim()
      if (text) texts.push(text)
      continue
    }
    const closing = !!m[1]
    const tag = m[2].toLowerCase()
    if (closing) {
      if (tag === 'script' || tag === 'style') hidden = Math.max(0, hidden - 1)
      stack.pop()
      continue
    }
    const a = attrsOf(m[3] || '')
    if (tag === 'script' || tag === 'style') hidden += 1
    for (const k of ['aria-label', 'alt', 'title', 'placeholder']) if (a[k]) texts.push(a[k].trim())
    if (tag === 'img' || tag === 'source' || tag === 'video' || tag === 'image') {
      for (const k of ['src', 'poster', 'href', 'xlink:href']) if (a[k]) images.push(a[k])
      if (a.srcset) images.push(a.srcset.split(',')[0].trim().split(/\s+/)[0])
    }
    if (tag === 'a' && a.href !== undefined) links.push(a.href)
    if (a.style) for (const u of a.style.matchAll(/url\(([^)]+)\)/g)) images.push(u[1].replace(/['"]/g, ''))
    if (!VOID.has(tag) && !m[4]) stack.push(tag)
  }
  return { texts, images, links }
}

const isSentinel = (s) => /zq/i.test(s)
const hasWords = (s) => /[A-Za-zÀ-ÿ]{2,}/.test(s.replace(/zq[0-9a-z]+/gi, ''))

function accepted(sectionId, text) {
  const rules = [...(ACCEPTED['*'] || []), ...(ACCEPTED[sectionId] || [])]
  return rules.some(([r]) => (r instanceof RegExp ? r.test(text) : r === text))
}

// ——— render ————————————————————————————————————————————————————————————
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
let failed = false
try {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { MemoryRouter } = await import('react-router-dom')
  const { I18nProvider } = await vite.ssrLoadModule('/src/i18n/index.jsx')
  const { getSection } = await vite.ssrLoadModule('/src/lib/sectionRegistry.jsx')
  const { SECTION_FIELDS, SECTIONS_WITHOUT_COLOR } = await vite.ssrLoadModule('/src/lib/sectionFields.js')
  const { SECTION_IDS, sectionKindOf, sectionModelOf } = await vite.ssrLoadModule('/src/domain/sections.js')
  const { BUILDER_HIDDEN_SKUS } = await vite.ssrLoadModule('/src/domain/catalog.js')
  const h = React.createElement

  const ids = SECTION_IDS.filter((id) => !BUILDER_HIDDEN_SKUS.includes(sectionModelOf(id))).filter(
    (id) => !only || id === only,
  )
  const render = (Comp, props) =>
    renderToStaticMarkup(h(I18nProvider, null, h(MemoryRouter, null, h(Comp, props))))

  const rows = []
  for (const id of ids) {
    const sec = getSection(id)
    if (!sec?.component) continue
    const fields = SECTION_FIELDS[id] || []
    const props = Object.fromEntries(fields.map((f) => [f.key, sentinelFor(f)]))
    let html
    try {
      html = render(sec.component, props)
    } catch (err) {
      rows.push({ id, kind: sectionKindOf(id), error: String(err.message || err).slice(0, 160) })
      continue
    }
    const { texts, images, links } = scan(html)
    const text = [...new Set(texts.filter((t) => hasWords(t) && !isSentinel(t) && !accepted(id, t)))]
    // Texto que mezcla marca + palabra fija («ZQ1 — Read more»): la parte fija.
    for (const t of texts) {
      if (!isSentinel(t) || !hasWords(t)) continue
      const rest = t.replace(/zq[0-9a-z]+/gi, ' ').replace(/[^A-Za-zÀ-ÿ ]+/g, ' ').replace(/\s+/g, ' ').trim()
      if (rest.length > 2 && !accepted(id, rest)) text.push(`… ${rest}`)
    }
    const image = [
      ...new Set(images.filter((u) => u && !isSentinel(u) && !u.startsWith('data:') && !accepted(id, u))),
    ]
    // tel: sale del campo de teléfono (el link se queda con los dígitos).
    const link = [
      ...new Set(links.filter((u) => u && !isSentinel(u) && u !== '#' && u !== '#top' && !u.startsWith('tel:'))),
    ]
    const colorFields = fields.filter((f) => f.type === 'color')
    const color = !colorFields.length
      ? SECTIONS_WITHOUT_COLOR[id]
        ? []
        : ['sin campo de color']
      : /#123456|rgb\(18,\s*52,\s*86\)/i.test(html)
        ? []
        : ['el color del campo no llega al HTML']
    const issues = text.length + image.length + link.length + color.length
    // Aviso (no falla): campos cuyo valor no aparece en el HTML inicial. Puede
    // ser un estado que el SSR no dibuja (menú abierto, otro slide) o un campo
    // muerto que la sección ignora: vale mirarlo a mano.
    const lower = html.toLowerCase()
    const unseen = fields
      .filter((f) => ['text', 'textarea', 'href', 'image', 'url', 'list'].includes(f.type))
      .filter((f) => {
        const values = (Array.isArray(props[f.key]) ? props[f.key].flatMap((r) => Object.values(r)) : [props[f.key]])
          .filter((v) => typeof v === 'string' && /zq/i.test(v))
          .map((v) => v.toLowerCase().split(/[\n|]/)[0].trim())
        return values.length && !values.some((v) => lower.includes(v))
      })
      .map((f) => f.key)
    rows.push({ id, kind: sectionKindOf(id), fields: fields.length, text, image, link, color, issues, unseen })
  }

  const strict = rows.filter((r) => STRICT_KINDS.includes(r.kind))
  const pending = rows.filter((r) => !STRICT_KINDS.includes(r.kind))
  const line = (r) =>
    r.error
      ? `  ✖ ${r.id}: no renderiza (${r.error})`
      : `  ${r.issues ? '✖' : '✓'} ${r.id.padEnd(30)} ${String(r.fields).padStart(2)} campos · ${r.text.length} textos · ${r.image.length} imágenes · ${r.link.length} links fijos${r.color.length ? ' · ' + r.color[0] : ''}`
  const detail = (r) => {
    for (const t of r.text || []) console.log(`      texto   «${t.slice(0, 90)}»`)
    for (const u of r.image || []) console.log(`      imagen  ${u.slice(0, 90)}`)
    for (const u of r.link || []) console.log(`      link    ${u.slice(0, 90)}`)
  }
  const unseenLine = (r) =>
    r.unseen?.length ? `      (aviso) no se ve al cargar: ${r.unseen.join(', ')}` : null

  console.log(`\nFases cerradas (${STRICT_KINDS.join(', ')}): tienen que estar 100% editables`)
  for (const r of strict) {
    console.log(line(r))
    if (r.issues || r.error) {
      failed = true
      detail(r)
    }
    const warn = unseenLine(r)
    if (warn) console.log(warn)
  }
  const pendingBad = pending.filter((r) => r.issues || r.error)
  console.log(`\nPendientes (resto): ${pending.length - pendingBad.length}/${pending.length} al día`)
  if (showAll || only) {
    for (const r of pending) {
      console.log(line(r))
      if (r.issues) detail(r)
    }
  }
  const okStrict = strict.filter((r) => !r.issues && !r.error).length
  console.log(`\n${failed ? '✖' : '✓'} ${okStrict}/${strict.length} navs/heroes/footers 100% editables`)
} finally {
  await vite.close()
}
process.exit(failed ? 1 : 0)
