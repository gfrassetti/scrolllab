/**
 * Emulador de teléfono: audita el movimiento real, no el layout.
 *
 * check:mobile mide tipografía, zonas de toque e imágenes con el scroll
 * saltado por JS. Esto mide lo que el usuario *ve mientras scrollea*, con
 * gestos táctiles reales (CDP `Input.dispatchTouchEvent`, no
 * `scrollTo`/rueda de mouse) y la CPU frenada, en los 10 templates y el
 * home, con el movimiento completo y con la versión calma
 * (`prefers-reduced-motion: reduce`, ver src/lib/motion.js).
 *
 * Por sección reporta:
 *
 * - scroll-stuck: el gesto no mueve `scrollY` (o casi nada) varias veces
 *   seguidas habiendo más página debajo — la interacción se traba de
 *   verdad. Para poder seguir auditando el resto de la página, fuerza un
 *   salto y sigue (se marca en el hallazgo).
 * - frozen: `scrollY` avanza con normalidad pero el cuadro no cambia
 *   durante varias pantallas seguidas — un hueco vacío o un escenario
 *   «pinneado» que no tiene nada que mostrar en este modo.
 * - hidden: texto a la vista con `opacity:0`/`visibility:hidden` — quedó
 *   esperando una animación que en este modo no corre.
 * - bar-jump: el alto del viewport baja 64px y vuelve (la barra del
 *   navegador al scrollear) y el scroll salta — ScrollTrigger se
 *   re-midió a mitad de camino.
 * - row-stuck: una fila con scroll horizontal propio (carrusel) no avanza
 *   al deslizar el dedo.
 * - error: errores de consola/página (mismo filtro de ruido que check:mobile).
 *
 * Perfiles: Pixel 7 (Chromium real) e iPhone 13 (WebKit no está disponible
 * en este entorno: se emulan pantalla/DPR 3/táctil/UA del iPhone, el motor
 * sigue siendo Chromium — ver AGENTS.md).
 *
 * Salida en storage/motion-check/<template>/: capturas JPEG por sección,
 * `report.json` + `report.txt`, una hoja de contacto HTML y (con --video)
 * un .webm del recorrido por cada perfil × modo.
 *
 * Uso:
 *   npm run check:motion                          # todo: 10 templates + home
 *   npm run check:motion -- comic unity            # solo esos
 *   npm run check:motion -- --quick                # Pixel 7, ambos modos
 *   npm run check:motion -- --video                # + .webm por corrida
 *   MOTION=reduce PROFILE=pixel npm run check:motion -- meridian
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium …
 *
 * Variables: BASE, MOTION (reduce|normal|both), PROFILE (pixel|iphone|both),
 * CPU (multiplicador de frenado, default 4), CHROMIUM_ARGS.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { devices } from 'playwright'

import { IGNORED_CONSOLE, IGNORED_URLS, installBlockHelpers } from './lib/page-helpers.mjs'
import { freePort, launchChromium, routePicsum, startVite } from './lib/servers.mjs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(REPO, 'storage', 'motion-check')

/** Los 9 en venta + MERIDIAN. RATIO/PLUM/SIGNAL no están en vivo (ver AGENTS.md). */
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

/** Metrics only — el motor sigue siendo Chromium (sin WebKit en este entorno). */
const PROFILES = {
  pixel: (() => {
    const { defaultBrowserType, ...rest } = devices['Pixel 7']
    return { label: 'Pixel 7', ...rest }
  })(),
  iphone: (() => {
    const { defaultBrowserType, ...rest } = devices['iPhone 13']
    return { label: 'iPhone 13 (metrics; motor Chromium)', ...rest }
  })(),
}

const MAX_GESTURES = 60
const STUCK_AFTER = 3 // gestos seguidos sin avanzar antes de marcar scroll-stuck
const FROZEN_AFTER = 3 // gestos seguidos con el mismo cuadro antes de marcar frozen
const FRAME_DIFF_THRESHOLD = 3 // diferencia media (0-255) por debajo de la cual dos cuadros «son el mismo»

function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')))
  const names = argv.filter((a) => !a.startsWith('--')).map((a) => a.toLowerCase())
  const unknown = names.filter((n) => !TEMPLATES.includes(n))
  if (unknown.length) {
    console.error(`Templates desconocidos: ${unknown.join(', ')}. Opciones: ${TEMPLATES.join(', ')}`)
    process.exit(2)
  }
  const quick = flags.has('--quick')
  const motion = process.env.MOTION || 'both'
  const profileArg = process.env.PROFILE || (quick ? 'pixel' : 'both')
  return {
    templates: names.length ? names : TEMPLATES,
    motions: motion === 'both' ? ['normal', 'reduce'] : [motion],
    profiles: profileArg === 'both' ? ['pixel', 'iphone'] : [profileArg],
    video: flags.has('--video'),
    cpu: Number(process.env.CPU) || 4,
  }
}

// ---------------------------------------------------------------------------
// Helpers que corren dentro de la página (además de installBlockHelpers)
// ---------------------------------------------------------------------------

/** Cachea los bloques con su `el` (mc.blockMeta() no lo expone) y busca el texto visible a destiempo. */
function installMotionHelpers() {
  const mc = window.__mc

  mc.cacheBlocks = () => {
    mc.__blocks = mc.blocks()
    return mc.__blocks.map(({ name, top, height }) => ({ name, top, height }))
  }

  /**
   * Texto *sólidamente* a la vista (no solo rozando un borde: una reserva
   * entrando por abajo recién a punto de revelarse no cuenta) con
   * `opacity:0`/`visibility:hidden`/color transparente. Se llama al SALIR
   * de la sección (ver check-motion.mjs): si para entonces el reveal keyed
   * a esa posición de scroll no corrió, no va a correr.
   */
  mc.hiddenText = (index) => {
    const b = mc.__blocks?.[index]
    if (!b) return []
    const out = new Set()
    const walker = document.createTreeWalker(b.el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.textContent.trim().length > 2 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    })
    let n
    while ((n = walker.nextNode())) {
      const parent = n.parentElement
      if (!parent) continue
      const r = parent.getBoundingClientRect()
      const centerY = r.top + r.height / 2
      const solidlyOnscreen = centerY > innerHeight * 0.12 && centerY < innerHeight * 0.88 && r.width > 0 && r.right > 0 && r.left < innerWidth
      if (!solidlyOnscreen) continue
      const cs = getComputedStyle(parent)
      const transparentColor = /rgba?\([^)]*,\s*0\s*\)/.test(cs.color)
      if (cs.visibility === 'hidden' || Number(cs.opacity) === 0 || transparentColor) {
        out.add(n.textContent.trim().slice(0, 48))
      }
    }
    return [...out]
  }

  /** Filas con scroll horizontal propio (carruseles por overflow, no por pin de GSAP). */
  mc.swipableRows = () => {
    mc.__rows = [...document.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el)
      return (
        (cs.overflowX === 'auto' || cs.overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth + 40 &&
        el.getBoundingClientRect().width > 100
      )
    })
    return mc.__rows.map((el, index) => {
      const r = el.getBoundingClientRect()
      return { index, top: r.top + scrollY, scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
    })
  }

  mc.scrollRowIntoView = (index) => {
    mc.__rows[index]?.scrollIntoView({ block: 'center' })
  }

  mc.rowScrollLeft = (index) => mc.__rows[index]?.scrollLeft ?? null
}

// ---------------------------------------------------------------------------
// Scroll y captura
// ---------------------------------------------------------------------------

/** Un arrastre de dedo real (touchstart → N touchmove → touchend), no `scrollTo`/rueda. */
async function touchSwipe(cdp, { x, startY, endY, steps = 10, stepDelay = 16 }) {
  const pt = (y) => [{ x, y, id: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(startY) })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(startY + ((endY - startY) * i) / steps) })
    await new Promise((r) => setTimeout(r, stepDelay))
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

const swipeDown = (cdp, vp, dist) =>
  touchSwipe(cdp, { x: Math.round(vp.width / 2), startY: Math.round(vp.height * 0.78), endY: Math.round(vp.height * 0.78) - dist })

/** Arrastre horizontal: `x` es un objeto {start,end} en vez de un solo número. */
async function touchSwipeX(cdp, { y, startX, endX, steps = 10, stepDelay = 16 }) {
  const pt = (x) => [{ x, y, id: 2 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(startX) })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(startX + ((endX - startX) * i) / steps) })
    await new Promise((r) => setTimeout(r, stepDelay))
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

/** Cuadro chico en gris (barato de diffear) de lo que se ve ahora mismo. */
async function grabFrame(page) {
  const jpeg = await page.screenshot({ type: 'jpeg', quality: 45 })
  return sharp(jpeg).resize(48, 96, { fit: 'fill' }).greyscale().raw().toBuffer()
}

function frameDiff(a, b) {
  if (!a || !b || a.length !== b.length) return 255
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return sum / a.length
}

function currentSection(blocks, centerY) {
  for (const b of blocks) if (centerY >= b.top && centerY < b.top + b.height) return b
  return blocks.reduce((closest, b) => (Math.abs(b.top - centerY) < Math.abs(closest.top - centerY) ? b : closest), blocks[0])
}

// ---------------------------------------------------------------------------
// Un job: un template × un perfil × un modo
// ---------------------------------------------------------------------------

async function runJob(browser, base, { template, profile, mode, opts, jobDir }) {
  const profileCfg = PROFILES[profile]
  const context = await browser.newContext({
    ...profileCfg,
    reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference',
    ...(opts.video ? { recordVideo: { dir: jobDir, size: profileCfg.viewport } } : {}),
  })
  await context.addInitScript(installBlockHelpers)
  await context.addInitScript(installMotionHelpers)
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('scrolllab-splash-seen', '1')
    } catch {
      /* ignore */
    }
  })
  await routePicsum(context)

  const page = await context.newPage()
  const issues = []
  const errors = new Set()
  let fontsFailed = false
  page.on('pageerror', (e) => errors.add(`pageerror: ${e.message}`))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return
    errors.add(text.slice(0, 160))
  })
  page.on('requestfailed', (req) => {
    const url = req.url()
    // Mismo entorno que check:mobile: el proxy de este contenedor no deja
    // bajar Google Fonts. No es un bug del template — aviso aparte, no error.
    if (/fonts\.(googleapis|gstatic)\.com/.test(url)) {
      fontsFailed = true
      return
    }
    if (IGNORED_URLS.some((re) => re.test(url))) return
    errors.add(`requestfailed: ${url}`)
  })

  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.cpu })

  await page.goto(`${base}${TEMPLATE_PATHS[template]}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(1100)

  const vp = page.viewportSize()
  const blocks = await page.evaluate(() => window.__mc.cacheBlocks())
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)

  const frames = [] // { section, scrollY, path } para la hoja de contacto
  const seenFrozenAt = new Set()
  const seenHiddenAt = new Set()
  const checkHidden = async (sec) => {
    if (seenHiddenAt.has(sec.name)) return
    const hidden = await page.evaluate((i) => window.__mc.hiddenText(i), blocks.indexOf(sec))
    if (hidden.length) {
      seenHiddenAt.add(sec.name)
      issues.push({ check: 'hidden', section: sec.name, detail: hidden.slice(0, 3).join(' · ') })
    }
  }
  let lastSection = null
  let lastSmallFrame = null
  let stuckRun = 0
  let frozenRun = 0
  let frozenStartY = 0
  let gestures = 0

  const saveFrame = async (sectionName, scrollY) => {
    const dir = path.join(jobDir, 'frames')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${String(frames.length).padStart(2, '0')}-${sectionName.replace(/[^a-z0-9]+/gi, '_')}.jpg`)
    const jpeg = await page.screenshot({ type: 'jpeg', quality: 55 })
    fs.writeFileSync(file, jpeg)
    frames.push({ section: sectionName, scrollY: Math.round(scrollY), file: path.relative(OUT, file) })
  }

  // Salto de la barra del navegador a mitad de página: el alto baja 64px y
  // vuelve, como al scrollear en un celular de verdad. `scrollY` y el cuadro
  // pueden correrse un poco solo por eso (secciones en `svh`: el alto de lo
  // que está arriba cambia, y el scroll-anchoring nativo del navegador
  // compensa el número para que la pantalla no salte de golpe — eso es una
  // ayuda del browser, no el bug, y un scrub reacciona proporcional al
  // scrollY aunque el `progress` interno no haya saltado). Lo que señala el
  // bug de verdad es el `progress` de cada ScrollTrigger: si
  // `ignoreMobileResize` (src/lib/gsap.js) funciona, no debería moverse más
  // que el redondeo por este resize puntual.
  const progressSnapshot = () =>
    page.evaluate(async () => {
      const { ScrollTrigger } = await import('/src/lib/gsap.js')
      return ScrollTrigger.getAll().map((st) => Math.round(st.progress * 1000) / 1000)
    })
  const barJumpCheck = async () => {
    const before = await progressSnapshot()
    await page.setViewportSize({ width: vp.width, height: vp.height - 64 })
    await page.waitForTimeout(350)
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.waitForTimeout(350)
    const after = await progressSnapshot()
    if (before.length !== after.length) {
      issues.push({ check: 'bar-jump', section: lastSection?.name || '?', detail: `ScrollTrigger.getAll() cambió de ${before.length} a ${after.length} triggers (se reconstruyeron)` })
      return
    }
    const jumped = before.reduce((n, p, i) => n + (Math.abs(after[i] - p) > 0.02 ? 1 : 0), 0)
    if (jumped) {
      issues.push({ check: 'bar-jump', section: lastSection?.name || '?', detail: `${jumped} ScrollTrigger(s) saltaron de progreso al bajar y subir el alto 64px` })
    }
  }
  let barJumpDone = false

  await saveFrame('inicio', 0)

  while (gestures < MAX_GESTURES) {
    const before = await page.evaluate(() => scrollY)
    await swipeDown(cdp, vp, Math.round(vp.height * 0.7))
    await page.waitForTimeout(260)
    const after = await page.evaluate(() => scrollY)
    gestures++
    const delta = after - before
    const atBottom = after + vp.height >= scrollHeight - 2

    const centerY = after + vp.height / 2
    const section = currentSection(blocks, centerY)
    if (section && section.name !== lastSection?.name) {
      // Recién al salir de una sección tuvo su última chance de revelarse:
      // un paso tardío de un crossfade pinneado está bien que siga en
      // opacity:0 a mitad de camino (todavía no le tocó). Chequear antes
      // de pisar lastSection.
      if (lastSection) await checkHidden(lastSection)
      await saveFrame(section.name, after)
      lastSection = section
      frozenRun = 0
    }

    // scroll-stuck: el gesto casi no mueve scrollY habiendo más página abajo.
    if (delta < Math.max(6, vp.height * 0.05) && !atBottom) {
      stuckRun++
      if (stuckRun === STUCK_AFTER) {
        issues.push({
          check: 'scroll-stuck',
          section: section?.name || '?',
          detail: `${STUCK_AFTER} gestos sin avanzar en scrollY≈${Math.round(after)} — se fuerza un salto para seguir auditando`,
        })
        // Sin esto la corrida completa de este job queda colgada reintentando
        // el mismo gesto: se documenta el bug y se sigue.
        await page.evaluate((y) => window.scrollTo(0, y), after + vp.height)
        stuckRun = 0
      }
    } else {
      stuckRun = 0
    }

    // frozen: scrollY avanza pero el cuadro no cambia — hueco vacío o
    // escenario pinneado sin nada que mostrar en este modo.
    const smallFrame = await grabFrame(page)
    const diff = frameDiff(lastSmallFrame, smallFrame)
    if (diff < FRAME_DIFF_THRESHOLD) {
      if (frozenRun === 0) frozenStartY = before
      frozenRun++
      if (frozenRun === FROZEN_AFTER && !seenFrozenAt.has(section?.name)) {
        seenFrozenAt.add(section?.name)
        issues.push({
          check: 'frozen',
          section: section?.name || '?',
          detail: `el cuadro no cambia entre scrollY≈${Math.round(frozenStartY)} y ≈${Math.round(after)} (~${Math.round((after - frozenStartY) / vp.height)} pantallas)`,
        })
      }
    } else {
      frozenRun = 0
    }
    lastSmallFrame = smallFrame

    if (!barJumpDone && after > scrollHeight * 0.3) {
      barJumpDone = true
      await barJumpCheck()
    }

    if (atBottom) break
  }
  if (gestures >= MAX_GESTURES) {
    issues.push({ check: 'error', section: lastSection?.name || '?', detail: `no llegó al final en ${MAX_GESTURES} gestos` })
  }
  if (lastSection) await checkHidden(lastSection) // la última sección nunca "sale": se chequea acá.
  await saveFrame('final', await page.evaluate(() => scrollY))

  // Filas con scroll horizontal propio: ¿responden al dedo?
  const rows = await page.evaluate(() => window.__mc.swipableRows())
  for (const row of rows.slice(0, 4)) {
    await page.evaluate((i) => window.__mc.scrollRowIntoView(i), row.index)
    await page.waitForTimeout(300)
    const box = await page.evaluate((i) => {
      const el = window.__mc.__rows[i]
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width }
    }, row.index)
    const before = await page.evaluate((i) => window.__mc.rowScrollLeft(i), row.index)
    await touchSwipeX(cdp, { y: box.y, startX: box.x + box.width * 0.35, endX: box.x + box.width * 0.35 - box.width * 0.6 })
    await page.waitForTimeout(300)
    const after = await page.evaluate((i) => window.__mc.rowScrollLeft(i), row.index)
    if (Math.abs(after - before) < 4 && row.scrollWidth - row.clientWidth > 40) {
      issues.push({ check: 'row-stuck', section: lastSection?.name || '?', detail: `scrollLeft ${before} → ${after} (ancho de sobra ${row.scrollWidth - row.clientWidth}px)` })
    }
  }

  for (const e of errors) issues.push({ check: 'error', section: '(página)', detail: e })

  let videoPath = null
  await context.close()
  if (opts.video) {
    const raw = await page.video()?.path().catch(() => null)
    if (raw && fs.existsSync(raw)) {
      videoPath = path.join(jobDir, 'scroll.webm')
      fs.renameSync(raw, videoPath)
    }
  }

  return { template, profile, mode, issues, scrollHeight, gestures, frames, fontsFailed, videoPath: videoPath ? path.relative(OUT, videoPath) : null }
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------

function writeReports(results) {
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2))

  const lines = []
  for (const r of results) {
    const head = `${r.template} · ${PROFILES[r.profile].label} · ${r.mode} (${r.gestures} gestos, ${Math.round(r.scrollHeight)}px)`
    lines.push(head)
    if (!r.issues.length) lines.push('  ✓ sin hallazgos')
    for (const i of r.issues) lines.push(`  ✗ [${i.check}] ${i.section}: ${i.detail}`)
    lines.push('')
  }
  fs.writeFileSync(path.join(OUT, 'report.txt'), lines.join('\n'))

  const byTemplate = new Map()
  for (const r of results) {
    if (!byTemplate.has(r.template)) byTemplate.set(r.template, [])
    byTemplate.get(r.template).push(r)
  }
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
  for (const [template, jobs] of byTemplate) {
    const dir = path.join(OUT, template)
    const html = [
      '<!doctype html><meta charset="utf-8">',
      `<title>check:motion — ${esc(template)}</title>`,
      '<style>body{font:14px/1.4 system-ui;margin:24px;background:#111;color:#eee}h2{margin-top:32px}',
      '.job{margin-bottom:28px}.issues{color:#ff8a65;font-size:13px;white-space:pre-wrap}',
      '.frames{display:flex;gap:8px;overflow-x:auto;padding:8px 0}',
      '.frames figure{margin:0;flex:0 0 auto;text-align:center}img{height:220px;border:1px solid #333}',
      'figcaption{font-size:11px;color:#999;max-width:140px}</style>',
      `<h1>${esc(template)}</h1>`,
    ]
    for (const job of jobs) {
      html.push(`<div class="job"><h2>${esc(PROFILES[job.profile].label)} — ${esc(job.mode)}</h2>`)
      html.push(`<div class="issues">${job.issues.length ? job.issues.map((i) => `✗ [${esc(i.check)}] ${esc(i.section)}: ${esc(i.detail)}`).join('\n') : '✓ sin hallazgos'}</div>`)
      html.push('<div class="frames">')
      for (const f of job.frames) {
        html.push(`<figure><img src="${esc(path.relative(dir, path.join(OUT, f.file)))}" loading="lazy"><figcaption>${esc(f.section)} · ${f.scrollY}px</figcaption></figure>`)
      }
      html.push('</div>')
      if (job.videoPath) html.push(`<p><a href="${esc(path.relative(dir, path.join(OUT, job.videoPath)))}">video</a></p>`)
      html.push('</div>')
    }
    fs.writeFileSync(path.join(dir, 'sheet.html'), html.join('\n'))
  }
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
  const jobs = []
  for (const template of opts.templates)
    for (const profile of opts.profiles) for (const mode of opts.motions) jobs.push({ template, profile, mode })

  const results = []
  const started = Date.now()
  try {
    for (const job of jobs) {
      const jobDir = path.join(OUT, job.template, `${job.profile}-${job.mode}`)
      fs.mkdirSync(jobDir, { recursive: true })
      const r = await runJob(browser, base, { ...job, opts, jobDir })
      results.push(r)
      const bad = r.issues.length
      console.log(
        `[${results.length}/${jobs.length}] ${job.template} ${PROFILES[job.profile].label} ${job.mode}: ${bad ? `${bad} hallazgos` : 'OK'} (${r.gestures} gestos)`,
      )
    }
  } finally {
    await browser.close()
    if (vite) vite.kill()
  }

  writeReports(results)
  const totalIssues = results.reduce((n, r) => n + r.issues.length, 0)
  const mb = ((Date.now() - started) / 60000).toFixed(1)
  console.log(`\n${totalIssues} hallazgos en ${results.length} corridas · ${mb} min`)
  console.log(`Reportes: storage/motion-check/report.txt · storage/motion-check/<template>/sheet.html`)
  if (results.some((r) => r.fontsFailed)) {
    console.log('\n⚠ Google Fonts no cargó en Chromium: lo visual se vio con la fuente de reemplazo (ver CHROMIUM_ARGS en check:mobile).')
  }
  process.exit(totalIssues ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
