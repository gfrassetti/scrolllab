/**
 * Paridad PC ↔ teléfono: ¿lo que se anima en PC también se anima en el teléfono?
 *
 * check:motion mide huecos, trabas y texto oculto *dentro* de un modo. No dice
 * si una animación que en PC recorre 400 px en el teléfono recorre 20, ni si una
 * sección que en PC tiene pin y scrub quedó quieta. Esto compara cada sección
 * de cada template entre PC (1440×900, mouse), teléfono (Pixel 7) y tablet
 * (iPad Mini), los tres con el movimiento completo.
 *
 * Por sección mide:
 *
 * - ScrollTriggers: cuántos, con pin, con scrub, y el recorrido en px.
 * - Tamaño del efecto: por cada ScrollTrigger con animación se lleva
 *   `animation.progress` a 0 y a 1 y se mide, en lo que anima, el desplazamiento
 *   (en fracción del viewport y en tamaños del propio elemento: una máscara que
 *   sube 1,2 alturas es el mismo gesto con una letra de 230 px que de 60 px), el
 *   cambio de escala, de opacidad y de blur. Es lo que se ve, no cuántos tweens
 *   hay. Cada dimensión tiene un umbral de «visible» (4 % del viewport, 0,15
 *   tamaños propios, 0,25 de opacidad, 10 % de escala, 6 px de blur).
 * - Animaciones CSS corriendo y loops de GSAP (`repeat: -1`).
 * - Canvas: ¿el cuadro cambia solo?
 * - Peso: blur animado sobre elementos de ≥ 25 % de la pantalla, mix-blend y
 *   backdrop-filter grandes — baratos en PC, caros en la GPU de un teléfono.
 * - Listeners de puntero: qué secciones escuchan mouse (`pointermove`,
 *   `mouseenter`…) y no escuchan nada táctil. Un dedo que scrollea cancela los
 *   eventos de puntero: esa escena queda apagada en el teléfono.
 *
 * Marcas (cada una es una decisión, no un error automático — ver ACCEPTED):
 *
 * - sin-trigger     PC tiene ScrollTriggers en la sección y el teléfono ninguno.
 * - quieta          lo que se ve en el teléfono (desplazamiento en tamaños propios,
 *                   opacidad, escala, blur) es < 35 % de lo que se ve en PC. Por
 *                   pieza (su camino en el DOM: el DOM es el mismo, cambia el CSS):
 *                   de PC cuentan las piezas que se mueven y que también se dibujan
 *                   en el teléfono (un adorno `hidden md:block` no cuenta contra
 *                   él); en el teléfono esas mismas piezas, quietas = cero, más las
 *                   que anima por su cuenta, porque adaptar un beat al teléfono es
 *                   moverlo en otras piezas (un recorrido horizontal que pasa a una
 *                   pila vertical con zoom por panel).
 * - solo-mouse      escucha mouse y nada táctil (teléfono / tablet).
 * - blur-pesado     blur animado sobre ≥ 25 % de la pantalla con scrub o sobre
 *                   fotos / canvas (un texto que se desenfoca una vez no cuenta).
 * - canvas-quieto   el canvas cambia solo en PC y en el teléfono no.
 * - css-quieto      PC corre animaciones CSS y el teléfono ninguna.
 * - sin-pin         (nota) PC pinnea y el teléfono no: puede ser la versión adaptada.
 * - blend-grande    (nota) mix-blend-mode / backdrop-filter sobre media pantalla.
 *
 * Límites: Chromium con perfil de teléfono, no un teléfono. No prueba la GPU ni
 * Safari. Corre sobre el dev server (importa /src/lib/gsap.js para leer los
 * ScrollTriggers).
 *
 * Uso:
 *   npm run check:parity                      # 10 templates + home
 *   npm run check:parity -- fizz monolith     # solo esos
 *   VIEWS=desktop,phone npm run check:parity  # sin la tablet
 *   BASE=http://127.0.0.1:5173 …              # un dev server ya corriendo
 *
 * Salida: storage/parity-check/report.txt y report.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { devices } from 'playwright'

import { installBlockHelpers } from './lib/page-helpers.mjs'
import { freePort, launchChromium, routeGoogleFonts, routePicsum, startVite } from './lib/servers.mjs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(REPO, 'storage', 'parity-check')

const TEMPLATE_PATHS = {
  home: '/',
  chapters: '/templates/chapters',
  nocturne: '/templates/nocturne',
  monolith: '/templates/monolith',
  velocity: '/templates/velocity',
  fizz: '/templates/fizz',
  atelier: '/templates/atelier',
  comic: '/templates/comic',
  unity: '/templates/unity',
  atrium: '/templates/atrium',
  meridian: '/templates/meridian',
}
const TEMPLATES = Object.keys(TEMPLATE_PATHS)

const strip = ({ defaultBrowserType, ...rest }) => rest
const VIEWS = {
  desktop: {
    label: 'PC 1440×900',
    options: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false },
  },
  phone: { label: 'Pixel 7', options: strip(devices['Pixel 7']) },
  tablet: { label: 'iPad Mini', options: strip(devices['iPad Mini']) },
}

/** Umbrales de «hay un efecto visible» (score = 1): lo que el ojo nota. */
const VISIBLE = { travel: 0.04, rel: 0.15, opacity: 0.25, scale: 0.1, blur: 6 }
const QUIET_RATIO = 0.35 // el teléfono tiene que llegar al menos a esta parte del efecto de PC
const BIG_AREA = 0.25 // fracción de la pantalla a partir de la cual un blur animado pesa
const OWN_MIN_SIZE = 0.004 // una pieza que solo anima el teléfono cuenta si ocupa al menos esto de la pantalla (no un punto)
const MOUSE_EVENTS = /^(pointermove|mousemove|mouseenter|mouseover|pointerenter)$/
const TOUCH_EVENTS = /^(touchstart|touchmove|pointerdown|deviceorientation|devicemotion)$/

/**
 * Marcas aceptadas a propósito: `template/Sección/marca` → por qué. Se listan una
 * por una, con el motivo, para que la lista no se vuelva un lugar donde esconder
 * brechas.
 */
const ACCEPTED = {}

/** Las `ACCEPTED` que se usaron en esta corrida: una que ya no se marca sobra. */
const usedAccepted = new Set()

const HARD = new Set(['sin-trigger', 'quieta', 'solo-mouse', 'blur-pesado', 'canvas-quieto', 'css-quieto'])

function parseArgs(argv) {
  const names = argv.filter((a) => !a.startsWith('--')).map((a) => a.toLowerCase())
  const unknown = names.filter((n) => !TEMPLATES.includes(n))
  if (unknown.length) {
    console.error(`Templates desconocidos: ${unknown.join(', ')}. Opciones: ${TEMPLATES.join(', ')}`)
    process.exit(2)
  }
  const views = (process.env.VIEWS || 'desktop,phone,tablet').split(',').map((v) => v.trim())
  const bad = views.filter((v) => !VIEWS[v])
  if (bad.length || !views.includes('desktop')) {
    console.error(`VIEWS desconocidas o sin desktop: ${views.join(',')}. Opciones: ${Object.keys(VIEWS).join(', ')}`)
    process.exit(2)
  }
  return { templates: names.length ? names : TEMPLATES, views }
}

// ---------------------------------------------------------------------------
// Dentro de la página
// ---------------------------------------------------------------------------

/** Registra qué componente de sección escucha qué eventos de puntero / táctiles. */
function installListenerProbe() {
  window.__listeners = []
  const original = EventTarget.prototype.addEventListener
  const interesting = /^(pointermove|mousemove|mouseenter|mouseover|pointerenter|touchstart|touchmove|pointerdown|deviceorientation|devicemotion)$/
  EventTarget.prototype.addEventListener = function patched(type, ...rest) {
    if (interesting.test(type)) {
      // El primer archivo de sección de la pila es quien lo pidió (también si lo
      // hizo a través de un helper como trackPointer en src/lib/motion.js). Si en
      // el camino hay GSAP, el listener es de ScrollTrigger (`touchmove` de un pin),
      // no de la sección: no cuenta.
      const stack = new Error().stack || ''
      const match = /\/src\/components\/sections\/[\w-]+\/([\w-]+)\.jsx?/.exec(stack)
      if (match && !/\/deps\/gsap|node_modules\/gsap/i.test(stack.slice(0, match.index))) window.__listeners.push({ type, component: match[1] })
    }
    return original.call(this, type, ...rest)
  }
}

/** Inventario de ScrollTriggers, tamaño del efecto y peso, por sección. */
async function inventoryInPage({ thresholds, expect }) {
  const { gsap, ScrollTrigger } = await import('/src/lib/gsap.js')
  const blocks = window.__mc.blocks()
  const vw = innerWidth
  const vh = innerHeight
  const area = (r) => Math.max(0, r.width) * Math.max(0, r.height)

  const sectionOf = (el) => {
    if (!el) return -1
    return blocks.findIndex((b) => b.el === el || b.el.contains(el))
  }

  const rows = blocks.map((b) => ({
    name: b.name,
    label: (b.el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 36),
    top: Math.round(b.top),
    height: Math.round(b.height),
    fixed: b.fixed,
    triggers: 0,
    pins: 0,
    scrubs: 0,
    distance: 0,
    fx: [],
    drawn: [],
    bigBlur: 0,
    loops: 0,
    cssAnims: 0,
    blend: 0,
    canvases: 0,
  }))

  const measure = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const blur = /blur\((-?[\d.]+)px\)/.exec(cs.filter || '')
    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      w: r.width,
      h: r.height,
      area: area(r),
      o: Number(cs.opacity),
      blur: blur ? Number(blur[1]) : 0,
    }
  }
  // La misma pieza en PC y en el teléfono: el camino desde la sección (el DOM es el
  // mismo, cambia el CSS). Así se compara lo mismo con lo mismo y lo que solo existe
  // en PC (`hidden md:block`) no cuenta contra el teléfono.
  const pathKey = (el, root) => {
    const parts = []
    for (let n = el; n && n !== root; n = n.parentElement) {
      const parent = n.parentElement
      parts.push(`${n.tagName.toLowerCase()}:${parent ? Array.prototype.indexOf.call(parent.children, n) : 0}`)
    }
    return parts.reverse().join('>')
  }
  const targetsOf = (anim) => {
    const out = new Set()
    const tweens = anim.getChildren ? anim.getChildren(true, true, false) : [anim]
    for (const t of tweens) for (const target of t.targets?.() || []) if (target instanceof Element) out.add(target)
    return [...out]
  }

  ScrollTrigger.refresh()
  let outside = 0
  for (const st of ScrollTrigger.getAll()) {
    let index = sectionOf(st.trigger)
    if (index < 0) index = sectionOf(st.pin)
    const row = rows[index]
    if (!row) {
      outside += 1
      continue
    }
    row.triggers += 1
    if (st.pin) row.pins += 1
    const scrub = st.vars.scrub !== undefined && st.vars.scrub !== false
    if (scrub) row.scrubs += 1
    if (scrub || st.pin) row.distance += Math.max(0, Math.round(st.end - st.start))

    const anim = st.animation
    if (!anim) continue
    const els = targetsOf(anim).slice(0, 200)
    if (!els.length) continue

    const prev = anim.progress()
    anim.progress(0)
    const from = els.map(measure)
    anim.progress(1)
    const to = els.map(measure)
    anim.progress(prev)

    els.forEach((el, i) => {
      const p = from[i]
      const q = to[i]
      if (!p.area && !q.area) return // no se dibuja en esta vista
      const biggest = Math.max(p.area, q.area)
      const db = Math.abs(q.blur - p.blur)
      row.fx.push({
        k: pathKey(el, blocks[index].el),
        size: biggest / (vw * vh),
        travel: Math.hypot((q.cx - p.cx) / vw, (q.cy - p.cy) / vh),
        rel: Math.hypot(q.cx - p.cx, q.cy - p.cy) / Math.sqrt(Math.max(biggest, 1)),
        opacity: Math.abs(q.o - p.o),
        scale: Math.abs(Math.log((Math.sqrt(q.area) || 1) / (Math.sqrt(p.area) || 1))),
        blur: db,
      })
      // Pesa un blur que se re-dibuja cuadro a cuadro (scrub) o que cae sobre
      // fotos / canvas; un texto que se desenfoca una vez al entrar no.
      const media = el.matches('img, canvas, video, picture, svg') || el.querySelector('img, canvas, video, picture')
      if (db >= 2 && biggest >= vw * vh * thresholds.bigArea && (scrub || media)) row.bigBlur += 1
    })
  }

  for (const child of gsap.globalTimeline.getChildren(true, true, true)) {
    if (child.repeat?.() !== -1) continue
    const target = (child.targets?.() || []).find((t) => t instanceof Element)
    const index = sectionOf(target)
    if (rows[index]) rows[index].loops += 1
  }

  for (const anim of document.getAnimations()) {
    if (anim.playState !== 'running' || typeof CSSAnimation === 'undefined' || !(anim instanceof CSSAnimation)) continue
    const index = sectionOf(anim.effect?.target)
    if (rows[index]) rows[index].cssAnims += 1
  }

  blocks.forEach((b, index) => {
    for (const canvas of b.el.querySelectorAll('canvas')) {
      const r = canvas.getBoundingClientRect()
      if (r.width >= 150 && r.height >= 150) rows[index].canvases += 1
    }
    for (const el of b.el.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      const blends = cs.mixBlendMode !== 'normal'
      const backdrop = cs.backdropFilter && cs.backdropFilter !== 'none'
      if (!blends && !backdrop) continue
      if (area(el.getBoundingClientRect()) >= vw * vh * 0.5) rows[index].blend += 1
    }
  })

  // Las piezas que se mueven en PC: ¿se dibujan en esta vista? Una que sí y acá no
  // se mueve es una brecha; una que no existe acá (`hidden md:block`) no lo es.
  const resolve = (root, key) => {
    let node = root
    for (const part of key ? key.split('>') : []) {
      const [tag, at] = part.split(':')
      node = node?.children?.[Number(at)]
      if (!node || node.tagName.toLowerCase() !== tag) return null
    }
    return node
  }
  blocks.forEach((b, index) => {
    const keys = expect?.[b.name]
    if (!keys) return
    rows[index].drawn = keys.filter((key) => {
      const el = resolve(b.el, key)
      return el && area(el.getBoundingClientRect()) > 0
    })
  })

  return { rows, outside, scrollHeight: Math.round(document.documentElement.scrollHeight) }
}

// ---------------------------------------------------------------------------
// Fuera de la página
// ---------------------------------------------------------------------------

function frameDiff(a, b) {
  if (!a || !b || a.length !== b.length) return 255
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return sum / a.length
}

/** ¿El primer canvas grande de la sección cambia solo? Diferencia media 0-255 entre dos cuadros. */
async function canvasChange(page, index) {
  const clipOf = () =>
    page.evaluate((i) => {
      const block = window.__mc.blocks()[i]
      const canvas = [...block.el.querySelectorAll('canvas')].find((c) => {
        const r = c.getBoundingClientRect()
        return r.width >= 150 && r.height >= 150
      })
      if (!canvas) return null
      const r = canvas.getBoundingClientRect()
      const x = Math.max(0, r.left)
      const y = Math.max(0, r.top)
      return {
        x,
        y,
        width: Math.max(1, Math.min(innerWidth, r.right) - x),
        height: Math.max(1, Math.min(innerHeight, r.bottom) - y),
      }
    }, index)

  await page.evaluate((i) => {
    const block = window.__mc.blocks()[i]
    const canvas = [...block.el.querySelectorAll('canvas')].find((c) => c.getBoundingClientRect().width >= 150)
    canvas?.scrollIntoView({ block: 'center' })
  }, index)
  await page.waitForTimeout(900)
  const clip = await clipOf()
  if (!clip) return null
  const grab = async () =>
    sharp(await page.screenshot({ type: 'jpeg', quality: 50, clip }))
      .resize(64, 64, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer()
  const a = await grab()
  await page.waitForTimeout(450)
  return frameDiff(a, await grab())
}

async function runView(browser, base, { template, view, expect }) {
  const cfg = VIEWS[view]
  const context = await browser.newContext({ ...cfg.options, locale: 'es-AR', reducedMotion: 'no-preference' })
  await context.addInitScript(installBlockHelpers)
  await context.addInitScript(installListenerProbe)
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('scrolllab-splash-seen', '1')
      // El aviso «Ver con animaciones» tapa controles y capturas.
      localStorage.setItem('scrolllab-motion-notice', '1')
    } catch {
      /* ignore */
    }
  })
  await routePicsum(context)
  await routeGoogleFonts(context)
  const page = await context.newPage()
  const errors = new Set()
  page.on('pageerror', (e) => errors.add(`pageerror: ${e.message}`.slice(0, 160)))

  await page.goto(`${base}${TEMPLATE_PATHS[template]}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  // MERIDIAN abre con una pantalla de carga (la ruta es lazy: respiro y recién ahí esperar).
  await page.waitForTimeout(1200)
  await page
    .waitForFunction(() => !document.querySelector('[role="status"][aria-label="Loading"]'), null, { timeout: 25000 })
    .catch(() => {})
  await page.waitForTimeout(1800)

  const inv = await page.evaluate(inventoryInPage, { thresholds: { ...VISIBLE, bigArea: BIG_AREA }, expect })
  const listeners = await page.evaluate(() => window.__listeners)

  const byComponent = {}
  for (const { type, component } of listeners) (byComponent[component] ||= new Set()).add(type)

  for (const [index, row] of inv.rows.entries()) {
    if (!row.canvases) continue
    row.canvasChange = await canvasChange(page, index).catch(() => null)
  }
  await context.close()
  return {
    template,
    view,
    ...inv,
    pointer: Object.fromEntries(Object.entries(byComponent).map(([k, v]) => [k, [...v].sort()])),
    errors: [...errors],
  }
}

// ---------------------------------------------------------------------------
// Comparación
// ---------------------------------------------------------------------------

/** Lo que se ve: el desplazamiento en tamaños propios, la opacidad, la escala y el blur. */
const DIMS = ['travel', 'rel', 'opacity', 'scale', 'blur']
const SHOWN = ['rel', 'opacity', 'scale', 'blur']
const score = (r) => Math.max(...SHOWN.map((k) => r[k] / VISIBLE[k]))

/** Máximo de cada dimensión sobre unas piezas `{ travel, rel, opacity, scale, blur }`. */
function effectOf(items) {
  const out = { travel: 0, rel: 0, opacity: 0, scale: 0, blur: 0, size: 0 }
  for (const item of items) for (const k of [...DIMS, 'size']) out[k] = Math.max(out[k], item[k] ?? 0)
  return out
}

/** Por pieza (su camino en el DOM): el mayor efecto entre los triggers que la mueven. */
function byKey(fx) {
  const map = new Map()
  for (const f of fx) {
    const prev = map.get(f.k)
    map.set(f.k, prev ? effectOf([prev, f]) : f)
  }
  return map
}

/** Las piezas que en PC se mueven lo bastante como para notarse, por sección: su camino en el DOM. */
const expectOf = (view) =>
  Object.fromEntries(
    view.rows
      .map((r) => [r.name, [...new Set(r.fx.filter((f) => score(f) >= 1).map((f) => f.k))]])
      .filter(([, keys]) => keys.length),
  )

/**
 * PC contra el teléfono en una sección. PC: las piezas que se mueven y que también se
 * dibujan acá (un adorno `hidden md:block` no cuenta contra el teléfono). Teléfono: esas
 * mismas piezas (quietas = cero: es la brecha) y las que anima por su cuenta, porque
 * adaptar un beat al teléfono es moverlo en otras piezas (un recorrido horizontal que
 * pasa a una pila vertical con zoom por panel).
 */
function matched(d, p) {
  const dMap = byKey(d.fx)
  const pMap = byKey(p.fx)
  const drawn = new Set(p.drawn)
  const keys = [...dMap.keys()].filter((k) => pMap.has(k) || drawn.has(k))
  const still = { travel: 0, rel: 0, opacity: 0, scale: 0, blur: 0, size: 0 }
  const own = [...pMap].filter(([k, f]) => !dMap.has(k) && f.size >= OWN_MIN_SIZE).map(([, f]) => f)
  return {
    count: keys.length,
    own: own.length,
    d: effectOf(keys.map((k) => dMap.get(k))),
    p: effectOf([...keys.map((k) => pMap.get(k) || still), ...own]),
  }
}

/**
 * El teléfono muestra menos de un tercio de lo que muestra PC. El recorrido en
 * px del viewport no entra en el puntaje (una máscara que sube 1,2 alturas se ve
 * igual con una letra de 230 px que con una de 60), pero sí en el detalle.
 */
function quieter(d, p) {
  return score(d) >= 1 && score(p) < QUIET_RATIO * score(d)
}

const dims = (r) => `recorrido ${r.travel.toFixed(2)}, propio ${r.rel.toFixed(2)}, opacidad ${r.opacity.toFixed(2)}, escala ${r.scale.toFixed(2)}, blur ${r.blur.toFixed(0)}`

/** Marcas de una sección en una vista táctil, contra la misma sección en PC. */
function compare(template, desktop, other) {
  const flags = []
  const byName = new Map(other.rows.map((r) => [r.name, r]))
  const componentOf = (name) => name.replace(/ \(\d+\)$/, '')

  for (const d of desktop.rows) {
    const p = byName.get(d.name)
    if (!p) {
      flags.push({ section: d.name, flag: 'ausente', note: true, detail: 'no se dibuja en esta vista' })
      continue
    }
    const push = (flag, detail, note = false) => flags.push({ section: d.name, flag, note: note || !HARD.has(flag), detail })

    const m = matched(d, p)
    if (d.triggers > 0 && p.triggers === 0) push('sin-trigger', `PC ${d.triggers} ScrollTrigger(s), acá 0`)
    else if (m.count > 0 && quieter(m.d, m.p)) push('quieta', `${m.count} pieza(s) que se mueven en PC y se dibujan acá${m.own ? `, y ${m.own} que anima solo el teléfono` : ''} — PC: ${dims(m.d)} → acá: ${dims(m.p)}`)
    if (d.pins > 0 && p.pins === 0) push('sin-pin', `PC ${d.pins} pin(es), acá 0`, true)
    if (p.bigBlur > 0) push('blur-pesado', `${p.bigBlur} blur(es) animado(s) sobre ≥ ${BIG_AREA * 100} % de la pantalla`)
    if (p.blend > 0) push('blend-grande', `${p.blend} mix-blend / backdrop-filter sobre ≥ 50 % de la pantalla`, true)
    if (d.cssAnims > 0 && p.cssAnims === 0) push('css-quieto', `PC ${d.cssAnims} animación(es) CSS corriendo, acá 0`)
    // Un canvas que en PC también cambia poco (niebla lenta, una secuencia que
    // sigue el scroll) no es una brecha: se compara contra PC.
    const alive = (r) => r.canvasChange !== null && r.canvasChange !== undefined && r.canvasChange >= 0.35
    if (p.canvases > 0 && alive(d) && !alive(p)) {
      push('canvas-quieto', `el canvas de PC cambia solo (${d.canvasChange.toFixed(2)}) y acá no (${(p.canvasChange ?? 0).toFixed(2)})`)
    }
    const events = other.pointer[componentOf(d.name)] || []
    if (events.some((e) => MOUSE_EVENTS.test(e)) && !events.some((e) => TOUCH_EVENTS.test(e))) {
      push('solo-mouse', `escucha ${events.join(', ')} y ningún evento táctil`)
    }
  }
  for (const f of flags) {
    const key = `${template}/${f.section}/${f.flag}`
    const reason = ACCEPTED[key]
    if (reason) {
      usedAccepted.add(key)
      Object.assign(f, { accepted: reason, note: true })
    }
  }
  return flags
}

function fmtRow(r) {
  if (!r) return '—'
  return `${r.triggers}t ${r.pins}p ${r.scrubs}s e${score(effectOf(r.fx)).toFixed(1)}`
}

function writeReports(results) {
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2))

  const lines = []
  for (const t of results) {
    lines.push(`${t.template}`)
    const desktop = t.views.desktop
    const others = Object.keys(t.views).filter((v) => v !== 'desktop')
    const header = ['sección', 'PC', ...others.map((v) => VIEWS[v].label), 'marcas']
    lines.push(`  ${header.join(' | ')}`)
    for (const d of desktop.rows) {
      const marks = t.flags.filter((f) => f.section === d.name && f.flag !== 'ausente').map((f) => (f.accepted ? `(${f.flag})` : f.note ? `~${f.flag}` : `✗${f.flag}`))
      const cells = [`${d.name}${d.label ? ` «${d.label}»` : ''}`, fmtRow(d), ...others.map((v) => fmtRow(t.views[v].rows.find((r) => r.name === d.name)))]
      lines.push(`  ${cells.join(' | ')}${marks.length ? ` | ${[...new Set(marks)].join(' ')}` : ''}`)
    }
    lines.push('')
    const hard = t.flags.filter((f) => !f.note)
    if (!hard.length) lines.push('  ✓ sin marcas')
    for (const f of t.flags.filter((x) => x.flag !== 'ausente')) {
      const tag = f.accepted ? '·' : f.note ? '~' : '✗'
      lines.push(`  ${tag} [${f.flag}] ${f.view}: ${f.section}: ${f.detail}${f.accepted ? ` — aceptada: ${f.accepted}` : ''}`)
    }
    lines.push('')
  }
  fs.writeFileSync(path.join(OUT, 'report.txt'), lines.join('\n'))
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  fs.mkdirSync(OUT, { recursive: true })

  let vite = null
  let base = process.env.BASE
  if (!base) {
    const port = await freePort()
    vite = await startVite(port)
    base = `http://127.0.0.1:${port}`
  }

  const browser = await launchChromium()
  const results = []
  const started = Date.now()
  try {
    for (const template of opts.templates) {
      const views = {}
      for (const view of opts.views) {
        views[view] = await runView(browser, base, { template, view, expect: view === 'desktop' ? undefined : expectOf(views.desktop) })
        const v = views[view]
        console.log(`${template} ${VIEWS[view].label}: ${v.rows.length} secciones, ${v.rows.reduce((n, r) => n + r.triggers, 0)} ScrollTriggers`)
      }
      const flags = []
      for (const view of opts.views.filter((v) => v !== 'desktop')) {
        for (const f of compare(template, views.desktop, views[view])) flags.push({ ...f, view })
      }
      results.push({ template, views, flags })
      const hard = flags.filter((f) => !f.note).length
      console.log(`  → ${hard ? `${hard} marca(s)` : 'sin marcas'}`)
    }
  } finally {
    await browser.close()
    if (vite) vite.kill()
  }

  writeReports(results)
  const stale = Object.keys(ACCEPTED).filter((k) => opts.templates.includes(k.split('/')[0]) && !usedAccepted.has(k))
  if (stale.length) console.log(`\n⚠ ACCEPTED que ya no se marca (borrala): ${stale.join(', ')}`)
  const hard = results.reduce((n, t) => n + t.flags.filter((f) => !f.note).length, 0)
  const minutes = ((Date.now() - started) / 60000).toFixed(1)
  console.log(`\n${hard} marca(s) en ${results.length} páginas · ${minutes} min`)
  console.log('Reporte: storage/parity-check/report.txt')
  process.exit(hard ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
