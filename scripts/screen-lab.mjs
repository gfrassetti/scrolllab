/**
 * screen:lab — ¿esta sección anda como widget de LAB? Screening en el iframe
 * real (loader → iframe cross-origin → frame), no lectura de código.
 *
 * Para cada sección (las que se pasan por argumento, o todas las de
 * HOSTABLE_SECTIONS), en un sitio ajeno con una pantalla de texto arriba y otra
 * abajo, scrolleando el sitio de a poco, como alguien que lee:
 *
 *  - el modo (FLOW / PIN), el alto del iframe contra el del contenido y si el
 *    alto se queda quieto, el scroll horizontal y los errores del frame;
 *  - `texto-oculto`: un texto que nunca llegó a verse (opacidad < 0.5) mientras
 *    estaba en pantalla — un reveal que en el iframe queda a medias;
 *  - `texto-cortado`: un texto que se vio pero nunca entero (se sale por un
 *    costado); en una marquesina es el diseño;
 *  - `red`: pedidos que fallaron (fotos, fuentes, la config);
 *  - `foto-rota`: un <img> con src que no cargó;
 *  - `fuente`: una familia que la sección pide y el frame no cargó (el texto
 *    sale con la de reemplazo);
 *  - 4 capturas por pasada mientras la sección cruza la pantalla (2 en calma),
 *    juntas en una lámina: storage/lab-screen/<modelo>-<Sección>.png, y todo
 *    en storage/lab-screen/report.json.
 *
 * Pasadas: por defecto 1280 y 390 con movimiento. `--deep`: 390 (teléfono con
 * toque), 768 y 1280, con movimiento y con «reducir movimiento». `--reduce`:
 * solo calma. `--header`: el sitio tiene una barra fija arriba (64 px), como
 * muchos sitios reales. `--jobs N`: N secciones a la vez (default 3).
 *
 * La sección tiene que estar en HOSTABLE_SECTIONS y en embed/src/registry.js
 * (para probar candidatas, sumarlas a los dos mientras dura el screening).
 *
 * Uso: npm run screen:lab -- [modelo/Sección …] [--deep] [--reduce] [--header] [--jobs N] [--no-build]
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(REPO)
const OUT = path.join(REPO, 'storage', 'lab-screen')
fs.mkdirSync(OUT, { recursive: true })

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const jobsAt = argv.indexOf('--jobs')
const JOBS = jobsAt >= 0 ? Math.max(1, Number(argv[jobsAt + 1]) || 1) : 3
const ids = argv.filter((a, i) => !a.startsWith('-') && argv[i - 1] !== '--jobs')

const { HOSTABLE_SECTIONS } = await import('../server/sections.js')
const SECTIONS = ids.length ? ids : HOSTABLE_SECTIONS
const unknown = SECTIONS.filter((id) => !HOSTABLE_SECTIONS.includes(id))
if (unknown.length) {
  console.error(`✖ no están en HOSTABLE_SECTIONS: ${unknown.join(', ')}`)
  process.exit(1)
}

const DESKTOP = { name: 'desktop', width: 1280, height: 800 }
const TABLET = { name: 'tablet', width: 768, height: 1024 }
const PHONE = { name: 'mobile', width: 390, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
/** Cada pasada: un ancho y un modo de movimiento. */
const PASSES = flag('--deep')
  ? [PHONE, TABLET, DESKTOP].flatMap((vp) => [
      { vp, reduce: false },
      { vp, reduce: true },
    ])
  : [DESKTOP, PHONE].map((vp) => ({ vp, reduce: flag('--reduce') }))
const HEADER = flag('--header')

/**
 * Texto tenue A PROPÓSITO, que «texto-oculto» (opacidad < 0.5) marcaría cada
 * vez: [sección, el comienzo del texto (números como #), motivo]. Uno por uno y
 * con el porqué, como ALLOW en check-mobile: no es un lugar para esconder bugs
 * (ADR 0007: aceptar algo lo decide una persona y queda acá, en el código).
 */
const ACCEPTED_DIM = [
  ['meridian/Interior', 'Category #', 'rótulo de cada ambiente al 45 %: jerarquía bajo el título, se lee'],
  ['unity/LastPortrait', 'STAT #', 'rótulo de cada cifra al 45 %: la cifra va a pleno, el rótulo acompaña'],
  ['unity/UniversalLang', 'STAT #', 'rótulo de cada cifra al 45 %: la cifra va a pleno, el rótulo acompaña'],
  ['apex/Models', 'Model #', 'la gama: el nombre activo (puntero o el del medio en el teléfono) a pleno, el resto al 20 %'],
  ['apex/Gallery', 'Next →', 'la miniatura que sigue al mouse: solo existe con puntero fino'],
]
const isAcceptedDim = (sectionId, entry) =>
  ACCEPTED_DIM.some(([id, text]) => id === sectionId && entry.startsWith(text) && !/nunca en pantalla/.test(entry))

const LAUNCH_ARGS = [
  '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
]

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

async function waitUp(url, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(url)).status < 500) return
    } catch {
      /* todavía no */
    }
    await sleep(250)
  }
  throw new Error(`no levantó: ${url}`)
}

if (!flag('--no-build')) {
  console.log('Buildeando el embed…')
  const built = spawnSync('npm', ['run', 'build:embed'], { cwd: REPO, stdio: 'ignore', shell: process.platform === 'win32' })
  if (built.status !== 0) {
    console.error('✖ npm run build:embed falló')
    process.exit(1)
  }
}

const [apiPort, staticPort] = await Promise.all([freePort(), freePort()])
const API = `http://localhost:${apiPort}`
const FRAME_HOST = `http://127.0.0.1:${staticPort}`
const SITE = `http://localhost:${staticPort}`
const children = [
  spawn(process.execPath, ['embed/test/e2e-api.mjs'], {
    cwd: REPO,
    stdio: 'ignore',
    env: { ...process.env, E2E_API_PORT: String(apiPort), E2E_CLIENT_URL: SITE, E2E_EMBED_CDN_URL: `${FRAME_HOST}/embed-dist` },
  }),
  spawn(process.execPath, ['embed/test/static-server.mjs', String(staticPort)], { cwd: REPO, stdio: 'ignore' }),
]
const stop = () => children.forEach((c) => c.kill())
process.on('exit', stop)

await Promise.all([waitUp(`${API}/api/embed/loader`), waitUp(`${FRAME_HOST}/embed-dist/v1/loader.js`)])
const login = await fetch(`${API}/api/auth/dev-login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'screen-lab@test.com' }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
const headers = { 'content-type': 'application/json', cookie }

async function publish(sectionId) {
  const created = await fetch(`${API}/api/hosted`, { method: 'POST', headers, body: JSON.stringify({ sectionId }) })
  if (!created.ok) throw new Error(`crear ${sectionId}: ${created.status}`)
  const id = (await created.json()).instance.id
  const pub = await fetch(`${API}/api/hosted/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ draftProps: {}, domains: [], publish: true }),
  })
  if (!pub.ok) throw new Error(`publicar ${sectionId}: ${pub.status}`)
  return { id, key: (await pub.json()).instance.key }
}

const filler = (n) =>
  `<div style="min-height:100vh;padding:48px 24px;font:16px/1.5 system-ui;color:#333;background:#f3f1ec">${'<p>Texto del sitio del cliente.</p>'.repeat(n)}</div>`
const siteHeader = HEADER
  ? '<header style="position:fixed;top:0;left:0;right:0;height:64px;z-index:10;background:#1d1d1d;color:#fff;font:600 15px system-ui;display:flex;align-items:center;padding:0 24px">Sitio del cliente</header>'
  : ''
const hostPage = (key) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0">${siteHeader}${filler(4)}
<script src="${FRAME_HOST}/embed-dist/v1/loader.js" data-scrolllab data-key="${key}" data-api="${API}" async></script>
${filler(4)}</body></html>`

/** Una medición que tarda más de 8 s (el frame trabado) devuelve `fallback`. */
const capped = (promise, fallback) => Promise.race([promise, sleep(8000).then(() => fallback)])

/**
 * En el frame, en cada paso del scroll: por cada texto que está en la pantalla
 * del sitio, la opacidad máxima que tuvo y si alguna vez se vio entero de
 * costado a costado. El estado vive en el frame y se identifica por ELEMENTO
 * (antes era por la posición en la lista de textos, que cambia cuando la
 * sección agrega o saca nodos —contadores, SplitText, máscaras— y el mismo
 * texto quedaba dos veces: la copia vieja salía «nunca en pantalla»).
 */
function sampleText([iframeTop, vh]) {
  const state = (window.__slScreen = window.__slScreen || { rows: new Map() })
  const effective = (el) => {
    let o = 1
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.visibility === 'hidden' || cs.display === 'none') return 0
      o *= Number(cs.opacity)
      if (/inset\([^)]*100%/.test(cs.clipPath)) return 0
    }
    return o
  }
  // Texto que se ve: no el CSS de un <style> ni un <script>, y no lo que la
  // sección marca como oculto a propósito (un menú cerrado `inert`, una copia
  // decorativa `aria-hidden`).
  const leaves = [...document.querySelectorAll('#root *')].filter(
    (el) =>
      !/^(STYLE|SCRIPT|TEMPLATE|NOSCRIPT)$/.test(el.tagName) &&
      !el.closest('[inert], [aria-hidden="true"]') &&
      [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim().length > 1),
  )
  const width = document.documentElement.clientWidth
  for (const el of leaves) {
    let row = state.rows.get(el)
    if (!row) {
      // Los números van como # (un contador que cuenta cambia su texto cuadro a cuadro).
      row = { text: el.textContent.trim().replace(/\d+/g, '#').slice(0, 40), o: -1, whole: false, drawn: false }
      state.rows.set(el, row)
    }
    const r = el.getBoundingClientRect()
    // Lo que no se dibuja en este ancho (`md:hidden`, `hidden md:block`) no cuenta.
    if (!r.width || !r.height) continue
    row.drawn = true
    // Dónde está dentro del widget (px desde arriba): para encontrarlo en la lámina.
    if (row.y == null) row.y = Math.round(r.top + window.scrollY)
    const top = r.top + iframeTop
    const bottom = r.bottom + iframeTop
    if (bottom < 0 || top > vh) continue
    const o = effective(el)
    row.o = Math.max(row.o, o)
    if (o >= 0.5 && r.left >= -2 && r.right <= width + 2) row.whole = true
  }
}

/** En el frame, al final: los textos que siguen en la página (lo reemplazado por la sección no cuenta). */
function collectText() {
  const rows = [...(window.__slScreen?.rows || new Map()).entries()]
    .filter(([el]) => el.isConnected)
    .map(([, row]) => row)
  return {
    hidden: rows
      .filter((r) => r.drawn && r.o < 0.5)
      .map((r) => `${r.text}${r.o < 0 ? ' (nunca en pantalla)' : ` (${r.o.toFixed(2)})`} @${r.y ?? '?'}px`),
    cut: rows.filter((r) => r.o >= 0.5 && !r.whole).map((r) => r.text),
  }
}

/** En el frame, al final: fotos rotas y familias tipográficas que no cargaron. */
async function finalChecks() {
  await document.fonts?.ready
  const broken = [...document.querySelectorAll('#root img')]
    .filter((img) => img.getAttribute('src') && img.complete && img.naturalWidth === 0)
    .map((img) => img.getAttribute('src').slice(-60))
  const GENERIC = /^(serif|sans-serif|monospace|system-ui|cursive|fantasy|ui-[a-z-]+|-apple-system|inherit|initial)$/i
  const loaded = new Set()
  document.fonts?.forEach((f) => {
    if (f.status === 'loaded') loaded.add(f.family.replace(/["']/g, '').toLowerCase())
  })
  const wanted = new Set()
  for (const el of document.querySelectorAll('#root *')) {
    if (!/\S/.test(el.textContent || '') || /^(STYLE|SCRIPT)$/.test(el.tagName)) continue
    const first = getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/["']/g, '')
    if (first && !GENERIC.test(first)) wanted.add(first)
  }
  const fonts = [...wanted].filter((f) => !loaded.has(f.toLowerCase()))
  return { broken, fonts }
}

/** Una pasada: un ancho, un modo. Devuelve la vista y las capturas. */
async function runPass(browser, key, { vp, reduce }, sectionId) {
  const { name, width, height, ...device } = vp
  const context = await browser.newContext({ viewport: { width, height }, ...device, reducedMotion: reduce ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  const errors = []
  const network = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/i.test(m.text()) && errors.push(m.text()))
  page.on('requestfailed', (r) => !/favicon/.test(r.url()) && network.push(`${r.failure()?.errorText || 'falló'} ${r.url().slice(-70)}`))
  page.on('response', (r) => r.status() >= 400 && !/favicon/.test(r.url()) && network.push(`${r.status()} ${r.url().slice(-70)}`))
  await page.route(`${SITE}/__host.html`, (route) => route.fulfill({ contentType: 'text/html', body: hostPage(key) }))
  const view = { pass: `${name}${reduce ? '·calma' : ''}`, marks: [] }
  const shots = []
  try {
    await page.goto(`${SITE}/__host.html`)
    let frame = null
    for (let i = 0; i < 60 && !frame; i++) {
      const fr = page.frames().find((f) => f.url().includes(`127.0.0.1:${staticPort}`))
      if (fr && (await fr.evaluate(() => document.getElementById('root')?.childElementCount || 0).catch(() => 0))) frame = fr
      else await sleep(250)
    }
    if (!frame) {
      view.marks.push('no-monta')
      return { view, shots }
    }
    await sleep(1500)
    const iframe = page.locator('iframe[data-scrolllab-frame]')
    const pinned = await page.evaluate(() => !!document.querySelector('[data-scrolllab-pin]'))
    const { top, height: range } = await page.evaluate(() => {
      const host = document.querySelector('[data-scrolllab-pin]') || document.querySelector('iframe[data-scrolllab-frame]')
      const r = host.getBoundingClientRect()
      return { top: r.top + scrollY, height: r.height }
    })
    const start = Math.max(0, top - height)
    const end = top + range
    const fractions = reduce ? [0.3, 0.7] : [0.25, 0.45, 0.65, 0.85]
    const shotAt = fractions.map((f) => start + height * 0.5 + (end - start - height * 0.5) * f)
    // Una sección muy alta no puede trabar el screening: a lo sumo ~160 pasos.
    const step = Math.max(80, Math.ceil((end - start) / 160))
    const deadline = Date.now() + 150_000
    for (let y = start; y <= end + 40; y += step) {
      if (Date.now() > deadline) {
        view.marks.push('trabada')
        break
      }
      await page.evaluate((v) => window.scrollTo(0, v), y)
      await sleep(70)
      const iframeTop = await capped(iframe.evaluate((el) => el.getBoundingClientRect().top), 0)
      await capped(frame.evaluate(sampleText, [iframeTop, height]).catch(() => {}), null)
      if (shotAt.length && y >= shotAt[0]) {
        shotAt.shift()
        await sleep(450)
        shots.push((await page.screenshot()).toString('base64'))
      }
    }
    await sleep(800)
    const m = await capped(
      frame.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        content:
          document.getElementById('root').getBoundingClientRect().height +
          (document.querySelector('.sl-badge-row')?.getBoundingClientRect().height || 0),
      })),
      { overflow: 0, content: 0 },
    )
    const iframeH = await capped(iframe.evaluate((el) => el.getBoundingClientRect().height), 0)
    await sleep(1500)
    const later = await capped(iframe.evaluate((el) => el.getBoundingClientRect().height), 0)
    const { broken, fonts } = await capped(frame.evaluate(finalChecks), { broken: [], fonts: [] })
    const text = await capped(frame.evaluate(collectText), { hidden: [], cut: [] })
    const hidden = text.hidden.filter((h) => !isAcceptedDim(sectionId, h))
    const { cut } = text
    Object.assign(view, {
      mode: pinned ? 'pin' : 'flow',
      iframeH: Math.round(iframeH),
      content: Math.round(m.content),
      overflow: m.overflow,
      hidden,
      cut,
      broken,
      fonts,
      network: [...new Set(network)],
      errors,
    })
    if (m.overflow > 2) view.marks.push(`overflow ${m.overflow}px`)
    if (!pinned && iframeH - m.content > 40) view.marks.push(`iframe-alto (${Math.round(iframeH)} vs ${Math.round(m.content)})`)
    if (!pinned && Math.abs(later - iframeH) > 16) view.marks.push(`alto-inestable (${Math.round(iframeH)}→${Math.round(later)})`)
    if (iframeH < 80) view.marks.push('sin-alto')
    if (hidden.length) view.marks.push(`texto-oculto ×${hidden.length}`)
    if (cut.length) view.marks.push(`texto-cortado ×${cut.length}`)
    if (broken.length) view.marks.push(`foto-rota ×${broken.length}`)
    if (fonts.length) view.marks.push(`fuente: ${fonts.join(', ')}`)
    if (view.network.length) view.marks.push(`red ×${view.network.length}`)
    if (errors.length) view.marks.push(`errores ×${errors.length}`)
  } catch (err) {
    view.marks.push(`excepción: ${String(err.message).split('\n')[0].slice(0, 120)}`)
  } finally {
    await context.close()
  }
  return { view, shots }
}

async function screen(browser, sectionId) {
  const { id, key } = await publish(sectionId)
  const row = { sectionId, views: [] }
  const strips = []
  try {
    for (const pass of PASSES) {
      const { view, shots } = await runPass(browser, key, pass, sectionId)
      row.views.push(view)
      strips.push({ view, shots, width: pass.vp.width })
    }
  } finally {
    await fetch(`${API}/api/hosted/${id}`, { method: 'DELETE', headers }).catch(() => {})
  }

  // Lámina: una fila por pasada.
  const sheet = await browser.newPage({ viewport: { width: 1640, height: 900 } })
  const stripHtml = ({ view, shots, width }) => {
    const w = width >= 1000 ? 390 : width >= 700 ? 230 : 150
    return `<div style="margin:6px 0 2px">${view.pass} — ${view.mode || ''} ${view.iframeH || ''}px ${view.marks.join(' · ')}</div>
      <div style="display:flex;gap:8px">${shots.map((b) => `<img src="data:image/png;base64,${b}" style="width:${w}px;border:1px solid #999">`).join('')}</div>`
  }
  await sheet.setContent(`<body style="margin:8px;background:#222;color:#eee;font:13px system-ui">
    <div style="font-size:15px">${sectionId}${HEADER ? ' — sitio con barra fija' : ''}</div>${strips.map(stripHtml).join('')}</body>`)
  await sleep(300)
  await sheet.screenshot({ path: path.join(OUT, `${sectionId.replace('/', '-')}${HEADER ? '-header' : ''}.png`), fullPage: true })
  await sheet.close()

  const marks = row.views.flatMap((v) => v.marks.map((m) => `${v.pass}:${m}`))
  console.log(`${marks.length ? '·' : '✓'} ${sectionId.padEnd(28)} ${row.views.map((v) => `${v.pass}:${v.mode}/${v.iframeH}`).join(' ')}  ${marks.join(' · ')}`)
  return row
}

const browser = await chromium.launch({ args: LAUNCH_ARGS, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
const report = []
try {
  const queue = [...SECTIONS]
  await Promise.all(
    Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
      while (queue.length) {
        const sectionId = queue.shift()
        try {
          report.push(await screen(browser, sectionId))
        } catch (err) {
          console.log(`✖ ${sectionId}: ${err.message}`)
          report.push({ sectionId, error: err.message })
        }
      }
    }),
  )
} finally {
  await browser.close()
  stop()
}
report.sort((a, b) => SECTIONS.indexOf(a.sectionId) - SECTIONS.indexOf(b.sectionId))
fs.writeFileSync(path.join(OUT, `report${HEADER ? '-header' : ''}.json`), JSON.stringify(report, null, 2))
console.log(`\nLáminas y report.json en ${path.relative(REPO, OUT)}`)
process.exit(0)
