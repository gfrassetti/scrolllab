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
 * - unreachable (solo en calma): texto o fotos que ningún gesto puede traer a la
 *   pantalla — quedan fuera de un contenedor con `overflow-x: hidden` que no se
 *   desliza (un recorrido horizontal que con «reducir movimiento» perdió el pin).
 *   A plena opacidad: `hidden` no lo ve, el elemento existe y no se ve nunca.
 * - viewport: algo se sale por la derecha y el navegador del teléfono ensancha
 *   la pantalla (`innerWidth` > ancho del dispositivo): la página se ve
 *   achicada. `overflow-x: clip` en el body no lo tapa en mobile.
 * - bar-jump: el alto del viewport baja 64px y vuelve (la barra del
 *   navegador al scrollear) y el scroll salta — ScrollTrigger se
 *   re-midió a mitad de camino.
 * - row-stuck: una fila con scroll horizontal propio (carrusel) no avanza
 *   al deslizar el dedo.
 * - error: errores de consola/página (mismo filtro de ruido que check:mobile).
 *
 * Modo `forced` (MOTION=forced o MOTION=all): lo que deja el botón «Ver con
 * animaciones» (src/lib/motionOverride.js) — «reducir movimiento» prendido en
 * el dispositivo MÁS la preferencia guardada de pedir el movimiento completo.
 * Tiene que verse igual que el modo normal; se compara por página el alto del
 * documento y la cantidad de ScrollTrigger vivos:
 *
 * - override-ignored: la página con el botón puesto NO queda igual que sin
 *   «reducir movimiento» — alguna sección sigue leyendo el ajuste del
 *   dispositivo y se ignora el botón. (Es el chequeo que faltó cuando el botón
 *   solo andaba en los templates ya migrados.)
 *
 * Perfiles: Pixel 7 (Chromium real), iPhone 13 y iPad Mini (WebKit no está disponible
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
 *   MOTION=forced npm run check:motion                 # el botón anda en todos
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium …
 *
 * Variables: BASE, MOTION (reduce|normal|forced|both|all), PROFILE (pixel|iphone|ipad|both|all),
 * CPU (multiplicador de frenado, default 4), CHROMIUM_ARGS.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { devices } from 'playwright'

import { IGNORED_CONSOLE, IGNORED_URLS, installBlockHelpers } from './lib/page-helpers.mjs'
import { freePort, launchChromium, routeGoogleFonts, routePicsum, startVite } from './lib/servers.mjs'

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
  kin: '/templates/kin',
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
  ipad: (() => {
    const { defaultBrowserType, ...rest } = devices['iPad Mini']
    return { label: 'iPad Mini (metrics; motor Chromium)', ...rest }
  })(),
}

const MAX_GESTURES = 60
const STUCK_AFTER = 3 // gestos seguidos sin avanzar antes de marcar scroll-stuck
const FROZEN_SCREENS = 1.5 // pantallas de scroll con el mismo cuadro antes de marcar frozen
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
  const MODES = ['normal', 'reduce', 'forced']
  if (!['both', 'all', ...MODES].includes(motion)) {
    console.error(`MOTION desconocido: ${motion}. Opciones: ${MODES.join(', ')}, both (normal+reduce), all`)
    process.exit(2)
  }
  const profileArg = process.env.PROFILE || (quick ? 'pixel' : 'both')
  const wanted = profileArg === 'both' ? ['pixel', 'iphone'] : profileArg === 'all' ? Object.keys(PROFILES) : profileArg.split(',')
  const badProfile = wanted.filter((n) => !PROFILES[n])
  if (badProfile.length) {
    console.error(`Perfiles desconocidos: ${badProfile.join(', ')}. Opciones: ${Object.keys(PROFILES).join(', ')}, both, all`)
    process.exit(2)
  }
  return {
    templates: names.length ? names : TEMPLATES,
    motions: motion === 'both' ? ['normal', 'reduce'] : motion === 'all' ? MODES : [motion],
    profiles: profileArg === 'both' ? ['pixel', 'iphone'] : profileArg === 'all' ? Object.keys(PROFILES) : profileArg.split(','),
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
      // Un menú cerrado, un panel inerte o un texto `aria-hidden` están
      // ocultos a propósito (mismo criterio que check:mobile).
      // `data-scrub-tail`: lo revela el scroll a propósito (CTA del hero de MERIDIAN).
      if (parent.closest('[inert], [aria-hidden="true"], [hidden], [data-scrub-tail]')) continue
      const r = parent.getBoundingClientRect()
      const centerY = r.top + r.height / 2
      const solidlyOnscreen = centerY > innerHeight * 0.12 && centerY < innerHeight * 0.88 && r.width > 0 && r.right > 0 && r.left < innerWidth
      if (!solidlyOnscreen) continue
      const cs = getComputedStyle(parent)
      // Solo `rgba(…, 0)` (alfa 0) o `transparent`: el regex anterior también
      // agarraba `rgb(0, 0, 0)` — texto negro puro — y cualquier color sin azul.
      const transparentColor = cs.color === 'transparent' || /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*0(\.0+)?\s*\)$/.test(cs.color)
      if (cs.visibility === 'hidden' || Number(cs.opacity) === 0 || transparentColor) {
        out.add(n.textContent.trim().slice(0, 48))
      }
    }
    return [...out]
  }

  /**
   * Contenido que ningún gesto puede traer a la pantalla: texto o fotos que
   * quedan por fuera de la caja de un ancestro con `overflow-x: hidden|clip` que
   * no se desliza. Solo tiene sentido en calma: con el movimiento completo es
   * GSAP quien corre el track con un transform, y ahí lo de afuera sí llega.
   * (Las filas con `overflow-x: auto|scroll` son carruseles: se deslizan.)
   */
  mc.unreachable = (index) => {
    const b = mc.__blocks?.[index]
    if (!b) return []
    const found = new Set()
    for (const el of b.el.querySelectorAll('*')) {
      let label = ''
      if (el.tagName === 'IMG') label = (el.currentSrc || '').split('/').pop() || 'img'
      else for (const n of el.childNodes) if (n.nodeType === 3) label += n.nodeValue
      label = label.trim()
      if (label.length < 3) continue
      // `data-pan`: el contenido se trae con una interacción (tocar un pin y el mapa se
      // desplaza), no con el scroll: el mapa de MERIDIAN es más ancho que la pantalla.
      // `data-bleed`: la composición se sale del borde a propósito (fotos recortadas).
      if (el.closest('[inert], [aria-hidden="true"], [hidden], [data-scrub-tail], [data-pan], [data-bleed]')) continue
      if (!el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true })) continue
      const cs0 = getComputedStyle(el)
      if (cs0.position === 'fixed') continue
      const r = el.getBoundingClientRect()
      if (r.width < 8 || r.height < 8) continue
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a)
        // Una fila con scroll propio (auto|scroll) trae lo de afuera con el dedo:
        // lo que quede más allá de un ancestro `hidden` más arriba no está perdido.
        // (Que la fila responda al swipe lo mide `row-stuck`.)
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') break
        if (cs.overflowX !== 'hidden' && cs.overflowX !== 'clip') continue
        const ar = a.getBoundingClientRect()
        const outside = Math.max(0, ar.left - r.left) + Math.max(0, r.right - ar.right)
        if (outside > r.width * 0.5) {
          found.add(label.slice(0, 40))
          break
        }
      }
    }
    return [...found].slice(0, 4)
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

/**
 * Espera a que termine la inercia: tras soltar el dedo, normalizeScroll y
 * Lenis siguen moviendo la página unos cientos de ms, y una captura a mitad
 * de ese tramo sale con el cuadro corrido (una franja del fondo arriba, que
 * decae a 0 con la inercia). Los diffs y las capturas se toman ya asentados.
 */
async function settleScroll(page, { poll = 90, stable = 3, max = 3000 } = {}) {
  let last = await page.evaluate(() => scrollY)
  let same = 0
  const t0 = Date.now()
  while (same < stable && Date.now() - t0 < max) {
    await page.waitForTimeout(poll)
    const y = await page.evaluate(() => scrollY)
    same = Math.abs(y - last) < 0.5 ? same + 1 : 0
    last = y
  }
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
    // El chrome del market sale en el idioma del navegador: con en-US el menú
    // entra a 768 px y con es-AR (el público real) no — así se escondió un desborde.
    locale: 'es-AR',
    reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference',
    ...(opts.video ? { recordVideo: { dir: jobDir, size: profileCfg.viewport } } : {}),
  })
  await context.addInitScript(installBlockHelpers)
  await context.addInitScript(installMotionHelpers)
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('scrolllab-splash-seen', '1')
      // El aviso «Ver con animaciones» (MotionNotice) tapa controles y capturas.
      localStorage.setItem('scrolllab-motion-notice', '1')
    } catch {
      /* ignore */
    }
  })
  await routePicsum(context)
  await routeGoogleFonts(context)

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
  const seenUnreachableAt = new Set()
  const checkUnreachable = async (sec) => {
    if (mode !== 'reduce' || seenUnreachableAt.has(sec.name)) return
    const lost = await page.evaluate((i) => window.__mc.unreachable(i), blocks.indexOf(sec))
    if (lost.length) {
      seenUnreachableAt.add(sec.name)
      issues.push({ check: 'unreachable', section: sec.name, detail: `fuera de un contenedor que no se desliza: ${lost.join(' · ')}` })
    }
  }
  let lastSection = null
  let lastSmallFrame = null
  let lastFrameY = 0
  let stuckRun = 0
  let frozenFromY = null
  let gestures = 0

  const saveFrame = async (sectionName, scrollY) => {
    const dir = path.join(jobDir, 'frames')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${String(frames.length).padStart(2, '0')}-${sectionName.replace(/[^a-z0-9]+/gi, '_')}.jpg`)
    const jpeg = await page.screenshot({ type: 'jpeg', quality: 55 })
    fs.writeFileSync(file, jpeg)
    frames.push({ section: sectionName, scrollY: Math.round(scrollY), file: path.relative(OUT, file) })
  }

  // Barra del navegador: en un celular, al scrollear aparece y se esconde, y
  // el alto de la ventana cambia ~64px. `ScrollTrigger.config({ignoreMobileResize})`
  // (src/lib/gsap.js) existe para que eso NO re-mida los pins a mitad de scroll.
  // Se emula bajando y subiendo el alto 64px y se cuentan los `refresh` de
  // ScrollTrigger durante ese tramo: tiene que ser 0.
  //
  // No se compara scrollY ni el `progress` de los triggers: con `setViewportSize`
  // cambian también las unidades `svh`/`vh` (en un celular real NO cambian con
  // la barra), así que lo de arriba se reacomoda y el scroll-anchoring del
  // navegador corre el número — un efecto del emulador, no un bug.
  const barJumpCheck = async () => {
    // Sin triggers (la versión calma no crea ninguno) un refresh no tiene qué
    // desfasar: se mide solo si hay pins/scrubs en juego.
    const triggers = await page.evaluate(async () => {
      const { ScrollTrigger } = await import('/src/lib/gsap.js')
      window.__stRefreshes = 0
      ScrollTrigger.addEventListener('refresh', () => {
        window.__stRefreshes += 1
      })
      return ScrollTrigger.getAll().length
    })
    await page.setViewportSize({ width: vp.width, height: vp.height - 64 })
    await page.waitForTimeout(500)
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.waitForTimeout(500)
    const refreshes = await page.evaluate(() => window.__stRefreshes)
    if (refreshes > 0 && triggers > 0) {
      issues.push({
        check: 'bar-jump',
        section: lastSection?.name || '?',
        detail: `ScrollTrigger se re-midió ${refreshes} vez/veces por un cambio de alto de 64px (ignoreMobileResize no lo frenó)`,
      })
    }
  }
  let barJumpDone = false
  let viewportWidened = false

  await saveFrame('inicio', 0)
  lastSmallFrame = await grabFrame(page)

  while (gestures < MAX_GESTURES) {
    const before = await page.evaluate(() => scrollY)
    await swipeDown(cdp, vp, Math.round(vp.height * 0.7))
    await settleScroll(page)
    const after = await page.evaluate(() => scrollY)
    gestures++
    const delta = after - before
    // El alto cambia durante el recorrido (fotos que cargan, fuentes, secciones
    // que se acomodan): se mide de nuevo, no el de la carga.
    const { heightNow, innerW, innerH } = await page.evaluate(() => ({
      heightNow: document.documentElement.scrollHeight,
      innerW: window.innerWidth,
      innerH: window.innerHeight,
    }))
    // innerHeight y no el alto del dispositivo: si la pantalla se ensanchó, el
    // alto visible en px de CSS también creció.
    const atBottom = after + innerH >= heightNow - 2
    const centerY = after + vp.height / 2
    const section = currentSection(blocks, centerY)

    // Algo se sale por la derecha y el navegador del teléfono ensancha la
    // pantalla para que entre (la página se ve achicada): el desborde que
    // `overflow-x: clip` no tapa en mobile.
    if (innerW > vp.width + 1 && !viewportWidened) {
      viewportWidened = true
      issues.push({
        check: 'viewport',
        section: section?.name || '?',
        detail: `la pantalla se ensanchó a ${innerW}px (el teléfono es de ${vp.width}px): algo se sale por la derecha`,
      })
    }
    if (section && section.name !== lastSection?.name) {
      // Recién al salir de una sección tuvo su última chance de revelarse:
      // un paso tardío de un crossfade pinneado está bien que siga en
      // opacity:0 a mitad de camino (todavía no le tocó). Chequear antes
      // de pisar lastSection.
      if (lastSection) {
        await checkHidden(lastSection)
        await checkUnreachable(lastSection)
      }
      await saveFrame(section.name, after)
      lastSection = section
    }

    // scroll-stuck: el gesto casi no mueve scrollY habiendo más página abajo.
    if (delta < Math.max(6, vp.height * 0.05) && !atBottom) {
      stuckRun++
      if (stuckRun === STUCK_AFTER) {
        issues.push({
          check: 'scroll-stuck',
          section: section?.name || '?',
          detail: `${STUCK_AFTER} gestos sin avanzar en scrollY≈${Math.round(after)} (alto ${Math.round(heightNow)}, máx ${Math.round(heightNow - innerH)}) — se fuerza un salto para seguir auditando`,
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
    // escenario pinneado sin nada que mostrar en este modo. Se mide por
    // distancia, no por cantidad de gestos: con la inercia cada gesto recorre
    // más de una pantalla, y un escenario pegado de 2 pantallas son 2 gestos.
    const smallFrame = await grabFrame(page)
    const diff = frameDiff(lastSmallFrame, smallFrame)
    if (diff < FRAME_DIFF_THRESHOLD) {
      if (frozenFromY === null) frozenFromY = lastFrameY
      const travelled = after - frozenFromY
      if (travelled >= vp.height * FROZEN_SCREENS && !seenFrozenAt.has(section?.name)) {
        seenFrozenAt.add(section?.name)
        issues.push({
          check: 'frozen',
          section: section?.name || '?',
          detail: `el cuadro no cambia entre scrollY≈${Math.round(frozenFromY)} y ≈${Math.round(after)} (~${(travelled / vp.height).toFixed(1)} pantallas)`,
        })
        await saveFrame(`frozen-${section?.name || 'x'}`, after) // la evidencia queda en la hoja de contacto
      }
    } else {
      frozenFromY = null
    }
    lastSmallFrame = smallFrame
    lastFrameY = after

    if (!barJumpDone && after > scrollHeight * 0.3) {
      barJumpDone = true
      await barJumpCheck()
    }

    if (atBottom) break
  }
  if (gestures >= MAX_GESTURES) {
    issues.push({ check: 'error', section: lastSection?.name || '?', detail: `no llegó al final en ${MAX_GESTURES} gestos` })
  }
  if (lastSection) {
    // la última sección nunca "sale": se chequea acá.
    await checkHidden(lastSection)
    await checkUnreachable(lastSection)
  }
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
// Modo forced: ¿el botón «Ver con animaciones» deja la página como el modo normal?
// ---------------------------------------------------------------------------

/** Carga una página y mide lo que no puede diferir: alto del documento y ScrollTrigger vivos. */
async function loadAndMeasure(browser, base, { template, profile, reduce, forced }) {
  const context = await browser.newContext({
    ...PROFILES[profile],
    reducedMotion: reduce ? 'reduce' : 'no-preference',
    locale: 'es-AR',
  })
  await context.addInitScript((override) => {
    try {
      sessionStorage.setItem('scrolllab-splash-seen', '1')
      localStorage.setItem('scrolllab-motion-notice', '1')
      if (override) localStorage.setItem('scrolllab-motion', 'full')
    } catch {
      /* ignore */
    }
  }, forced)
  await routePicsum(context)
  await routeGoogleFonts(context)
  const page = await context.newPage()
  let fontsFailed = false
  page.on('requestfailed', (req) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) fontsFailed = true
  })
  await page.goto(`${base}${TEMPLATE_PATHS[template]}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(2200)
  const measured = await page.evaluate(async () => {
    const { ScrollTrigger } = await import('/src/lib/gsap.js')
    return {
      height: Math.round(document.documentElement.scrollHeight),
      triggers: ScrollTrigger.getAll().length,
      dataMotion: document.documentElement.dataset.motion || null,
      reduces: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  })
  await context.close()
  return { ...measured, fontsFailed }
}

async function probeOverride(browser, base, { template, profile }) {
  const normal = await loadAndMeasure(browser, base, { template, profile, reduce: false, forced: false })
  const forced = await loadAndMeasure(browser, base, { template, profile, reduce: true, forced: true })
  const issues = []

  if (forced.dataMotion !== 'full' || forced.reduces) {
    issues.push({
      check: 'override-ignored',
      section: '(página)',
      detail: `con el botón puesto <html data-motion> = ${forced.dataMotion} y matchMedia sigue avisando «reducir» (${forced.reduces})`,
    })
  }
  const tolerance = Math.max(40, normal.height * 0.02)
  if (Math.abs(forced.height - normal.height) > tolerance) {
    issues.push({
      check: 'override-ignored',
      section: '(página)',
      detail: `alto con el botón ${forced.height}px vs ${normal.height}px sin «reducir movimiento»: alguna sección sigue en la versión calma`,
    })
  }
  if (forced.triggers !== normal.triggers) {
    issues.push({
      check: 'override-ignored',
      section: '(página)',
      detail: `ScrollTrigger vivos con el botón: ${forced.triggers}, sin «reducir movimiento»: ${normal.triggers}`,
    })
  }
  return {
    template,
    profile,
    mode: 'forced',
    issues,
    scrollHeight: forced.height,
    gestures: 0,
    frames: [],
    fontsFailed: forced.fontsFailed || normal.fontsFailed,
    videoPath: null,
  }
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
      const r =
        job.mode === 'forced'
          ? await probeOverride(browser, base, job)
          : await runJob(browser, base, { ...job, opts, jobDir })
      results.push(r)
      const bad = r.issues.length
      console.log(
        `[${results.length}/${jobs.length}] ${job.template} ${PROFILES[job.profile].label} ${job.mode}: ${bad ? `${bad} hallazgos` : 'OK'} (${job.mode === 'forced' ? `igual que normal: ${Math.round(r.scrollHeight)}px` : `${r.gestures} gestos`})`,
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
    console.log('\n⚠ Google Fonts no cargó en Chromium: lo visual se vio con la fuente de reemplazo (ver FONTS_VIA_CURL y CHROMIUM_ARGS en check:mobile).')
  }
  process.exit(totalIssues ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
