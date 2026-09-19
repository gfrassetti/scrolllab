/**
 * Graba un video vertical de cada demo scrolleando y lo deja listo para Reels,
 * TikTok y Shorts (también sirve en X y LinkedIn). Las demos son el mejor
 * anuncio: el producto se ve solo.
 *
 * Qué ve quien lo mira (sin sonido, así que todo se entiende leyendo):
 *   1. arriba, una frase que dice qué es ("Webs que cuentan una historia
 *      mientras scrolleás");
 *   2. la demo grande, scrolleando de punta a punta;
 *   3. a los pocos segundos la frase cambia y dice qué es este template
 *      (nombre + "React + GSAP, código fuente incluido");
 *   4. cierre: "Llevate el código y usalo en tu proyecto" + sitio + 10%.
 *
 * Captura frame a frame (mueve el scroll, espera, saca la captura), así el
 * resultado no depende de la velocidad de la máquina ni queda entrecortado
 * aunque la demo tenga WebGL. Después ffmpeg arma, por demo:
 *   9x16-es.mp4 / 9x16-en.mp4
 * Salida en media/marketing/<sku>/ (media/ está ignorada por git).
 *
 * Requiere: ffmpeg en el PATH, el Chromium de Playwright, red (las tipografías
 * vienen de Google Fonts) y el sitio corriendo: `npm run build && npm run preview`
 * (mejor que dev: sin HMR) o `npm run dev:web`.
 *
 * Uso: npm run video:demos                      (todas las demos, sitio en :4173)
 *      npm run video:demos -- --skus nocturne,fizz --base http://localhost:5173
 *      opciones: --seconds 18 (duración fija; por defecto se calcula del largo de
 *      la página) · --fps 30 · --keep (no borrar los frames) · --reuse (si ya hay
 *      frames guardados con --keep, no vuelve a capturar: sirve para probar
 *      cambios de texto o diseño en segundos) · --gpu (usa la placa de video en
 *      Windows: para las demos 3D pesadas, como fizz)
 *
 * Tarda ~3 min por demo. Cada demo usa su propio Chromium y, si una falla, sigue
 * con las demás y al final lista cuáles repetir con --skus.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { publicDemoSkus } from '../src/lib/sharePages.js'
import { WELCOME_COUPON_PERCENT } from '../src/lib/pricing.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'media', 'marketing')

// --clave valor (o --bandera)
const argv = process.argv.slice(2)
const args = {}
for (let i = 0; i < argv.length; i += 1) {
  if (!argv[i].startsWith('--')) continue
  const next = argv[i + 1]
  args[argv[i].slice(2)] = next && !next.startsWith('--') ? next : 'true'
}

const BASE = (args.base || 'http://localhost:4173').replace(/\/$/, '')
const FPS = Number(args.fps || 30)
const FIXED_SECONDS = args.seconds ? Number(args.seconds) : null
const KEEP_FRAMES = args.keep === 'true'
const REUSE_FRAMES = args.reuse === 'true'
const SKUS = args.skus ? args.skus.split(',').map((s) => s.trim()) : publicDemoSkus()
const LAUNCH = args.gpu === 'true'
  ? { channel: 'chromium', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] }
  : {}

/** Velocidad de scroll objetivo: rápido para que pase algo, lento para que se lea. */
const TARGET_PX_PER_SECOND = 650
const MIN_SECONDS = 12
const MAX_SECONDS = 26
const END_CARD_SECONDS = 3
const LANGS = ['es', 'en']

/** Lienzo vertical de Reels/TikTok/Shorts. */
const CANVAS = { width: 1080, height: 1920 }
/**
 * La demo se captura en una ventana casi cuadrada de ancho completo (la web en su
 * versión de escritorio, pero alta) y va a 1:1, sin reescalar. Arriba queda el texto;
 * abajo unos 180 px que las apps tapan con el nombre de usuario y la descripción.
 */
const CAPTURE = { width: 1080, height: 1300 }
const WINDOW_Y = 440
/**
 * Demos que se rompen con la ventana angosta: el héroe de fizz parte el título en
 * "TITL / E" por debajo de ~1440 px. Se capturan más anchas y ffmpeg las achica al
 * mismo tamaño (mismas proporciones, así que el video sale igual).
 */
const CAPTURE_WIDTH = { fizz: 1440 }
const captureViewport = (sku) => {
  const width = CAPTURE_WIDTH[sku] ?? CAPTURE.width
  return { width, height: Math.round((width * CAPTURE.height) / CAPTURE.width) }
}

const INK = '#161412'
const BONE = '#f2efe9'
const ACCENT = '#ff4b00'
const SITE = 'scrolllab.com.ar'

const locales = {
  es: JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/locales/es.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/locales/en.json'), 'utf8')),
}

const COPY = {
  es: {
    brand: 'Scroll Lab',
    hookKicker: 'Scrollytelling',
    hook: 'Webs que cuentan una historia mientras scrolleás',
    what: 'Template en React + GSAP, con el código fuente incluido',
    endTitle: 'Llevate el código y usalo en tu proyecto',
    endOffer: `${WELCOME_COUPON_PERCENT}% menos en tu primera compra`,
  },
  en: {
    brand: 'Scroll Lab',
    hookKicker: 'Scrollytelling',
    hook: 'Websites that tell a story as you scroll',
    what: 'A React + GSAP template, source code included',
    endTitle: 'Get the code and use it in your project',
    endOffer: `${WELCOME_COUPON_PERCENT}% off your first purchase`,
  },
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Space+Grotesk:wght@300..700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />`

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { position: relative; overflow: hidden; background: ${INK}; color: ${BONE};
    font-family: 'Space Grotesk', system-ui, sans-serif; }
  .abs { position: absolute; }
  .eyebrow { font-size: 24px; letter-spacing: .3em; text-transform: uppercase; }
  .title { font-family: 'Bricolage Grotesque', 'Space Grotesk', sans-serif; font-weight: 600; letter-spacing: -.03em; }
  .accent { color: ${ACCENT}; }
`

/** Achica [data-fit-box] hasta que el texto entre en su alto máximo, y avisa cuando las tipografías cargaron. */
const FIT_SCRIPT = `
  ;(() => {
    const FONTS = ['600 100px "Bricolage Grotesque"', 'italic 60px "Instrument Serif"', '400 20px "Space Grotesk"']
    Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => {
      for (const el of document.querySelectorAll('[data-fit-box]')) {
        let size = Number(el.dataset.max || 70)
        const maxHeight = Number(el.dataset.maxh || 160)
        el.style.fontSize = size + 'px'
        while (el.scrollHeight > maxHeight && size > 36) { size -= 2; el.style.fontSize = size + 'px' }
      }
      document.body.dataset.fonts = FONTS.every((f) => document.fonts.check(f)) ? 'ok' : 'missing'
      document.body.dataset.ready = '1'
    })
  })()
`

const mark = (size) => `<svg viewBox="0 0 32 32" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="5" width="24" height="4.5" fill="${BONE}"/>
  <rect x="4" y="13.75" width="14" height="4.5" fill="${BONE}"/>
  <rect x="22.5" y="13.75" width="5.5" height="4.5" fill="${ACCENT}"/>
  <rect x="4" y="22.5" width="19" height="4.5" fill="${BONE}"/>
</svg>`

function page({ lang, width, height, transparent = false, body }) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8" />${FONTS}
<style>${BASE_CSS}
  html, body { width: ${width}px; height: ${height}px; ${transparent ? 'background: transparent;' : ''} }
</style></head><body>${body}<script>${FIT_SCRIPT}</script></body></html>`
}

/** Marca fija, arriba a la izquierda (transparente: se superpone al lienzo). */
function headHtml(lang) {
  return page({
    lang,
    width: CANVAS.width,
    height: WINDOW_Y,
    transparent: true,
    body: `<div class="abs" style="left:64px;top:104px;display:flex;align-items:center;gap:20px">
      ${mark(48)}<span class="eyebrow" style="font-size:26px">${escapeHtml(COPY[lang].brand)}</span>
    </div>`,
  })
}

/** Texto de arriba: una línea chica en naranja y la frase grande. Se muestra por tramos del video. */
function captionHtml({ lang, kicker, text }) {
  return page({
    lang,
    width: CANVAS.width,
    height: WINDOW_Y,
    transparent: true,
    body: `<p class="abs eyebrow accent" style="left:64px;top:186px;width:952px;font-size:26px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(kicker)}</p>
    <h2 class="abs title" data-fit-box data-max="70" data-maxh="150" style="left:64px;top:232px;width:952px;line-height:1.04;text-wrap:balance">${escapeHtml(text)}</h2>`,
  })
}

/** Cierre a pantalla completa: qué hacer, dónde y la oferta de primera compra. */
function endHtml(lang) {
  const c = COPY[lang]
  return page({
    lang,
    width: CANVAS.width,
    height: CANVAS.height,
    body: `<div class="abs" style="left:0;right:0;top:430px;text-align:center">
      ${mark(120)}
      <h2 class="title" data-fit-box data-max="96" data-maxh="330" style="margin:52px auto 0;width:880px;line-height:1.02;text-wrap:balance">${escapeHtml(c.endTitle)}</h2>
      <p class="title accent" style="margin-top:56px;font-size:70px">${SITE}</p>
      <p style="display:inline-block;margin-top:64px;padding:22px 44px;border:2px solid ${ACCENT};border-radius:999px;font-size:40px">${escapeHtml(c.endOffer)}</p>
    </div>`,
  })
}

/** Un Chromium por tarea: si el de una demo con WebGL queda en mal estado, no arrastra al resto. */
async function withBrowser(task) {
  const browser = await chromium.launch(LAUNCH)
  try {
    return await task(browser)
  } finally {
    await browser.close()
  }
}

/** Reintenta: Chromium a veces pierde el renderer justo después de cerrar una demo con WebGL. */
async function retry(label, task, attempts = 3) {
  for (let n = 1; ; n += 1) {
    try {
      return await task()
    } catch (err) {
      if (n >= attempts) throw err
      console.warn(`   ${label}: falló (${String(err.message).split('\n')[0]}), reintento ${n + 1}/${attempts}`)
    }
  }
}

async function renderPng(browser, html, size, file, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 })
  try {
    await page.setContent(html, { waitUntil: 'load' })
    await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 })
    if ((await page.evaluate(() => document.body.dataset.fonts)) !== 'ok') {
      throw new Error('No cargaron las tipografías (¿sin red?): no escribo una pieza con fuentes de respaldo.')
    }
    await page.screenshot({ path: file, type: 'png', omitBackground: transparent })
  } finally {
    await page.close()
  }
}

function ffmpeg(params) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...params], {
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    proc.on('error', (err) => reject(new Error(`No pude ejecutar ffmpeg (¿está en el PATH?): ${err.message}`)))
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg terminó con código ${code}`))))
  })
}

/** Arranca y termina suave (smootherstep): se lee el hero y se cierra sin corte. */
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10)

/** Scrollea la demo de punta a punta sacando una captura por frame. */
async function captureFrames(page, sku, framesDir) {
  await page.goto(`${BASE}/templates/${sku}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await page.waitForTimeout(3500) // arranque / intro de la demo
  const total = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight))
  if (total < 400) throw new Error(`${sku}: la página casi no scrollea (${total}px). ¿Cargó la demo?`)

  const seconds = FIXED_SECONDS ?? Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, total / TARGET_PX_PER_SECOND))
  const frames = Math.round(seconds * FPS)
  fs.rmSync(framesDir, { recursive: true, force: true })
  fs.mkdirSync(framesDir, { recursive: true })

  const started = Date.now()
  for (let i = 0; i < frames; i += 1) {
    const y = Math.round(ease(i / (frames - 1)) * total)
    await page.evaluate((top) => window.scrollTo(0, top), y)
    await page.waitForTimeout(40) // que ScrollTrigger / Lenis alcancen la posición
    await page.screenshot({
      path: path.join(framesDir, `f${String(i + 1).padStart(5, '0')}.jpg`),
      type: 'jpeg',
      quality: 92,
    })
    if ((i + 1) % 120 === 0) {
      const eta = ((Date.now() - started) / (i + 1)) * (frames - i - 1)
      process.stdout.write(`   ${sku}: ${i + 1}/${frames} frames (faltan ~${Math.round(eta / 1000)} s)\n`)
    }
  }
  return { frames, seconds, total }
}

/**
 * Arma el video de un idioma en una sola pasada: lienzo + demo + marca + dos textos
 * que se relevan (con fundido) + cierre que aparece al final.
 */
async function encode({ lang, framesDir, frames, dir, cards }) {
  const seconds = frames / FPS
  const total = seconds + END_CARD_SECONDS
  // A los pocos segundos la frase de arriba pasa de "qué es" a "qué es este template".
  const swap = Math.min(6.5, Math.max(3.5, seconds * 0.35))
  const t = (n) => n.toFixed(3)
  const loop = (file) => ['-loop', '1', '-framerate', String(FPS), '-t', t(total), '-i', file]

  // Frames JPEG (rango completo) → RGB → una sola conversión a BT.709 de rango limitado,
  // que es lo que esperan Instagram, TikTok y YouTube; en rango completo se ven apagados.
  const graph = [
    `[0:v]format=rgb24[bg]`,
    `[1:v]scale=${CAPTURE.width}:${CAPTURE.height}:flags=lanczos:in_range=full,format=rgb24,setsar=1[demo]`,
    `[bg][demo]overlay=0:${WINDOW_Y}:eof_action=pass:format=auto[a]`,
    `[2:v]format=rgba[head]`,
    `[a][head]overlay=0:0:format=auto[b]`,
    // La primera frase ya está en el cuadro 0: es la portada que las redes eligen por defecto.
    `[3:v]format=rgba,fade=t=out:st=${t(swap - 0.45)}:d=0.4:alpha=1[hook]`,
    `[b][hook]overlay=0:0:format=auto[c]`,
    `[4:v]format=rgba,fade=t=in:st=${t(swap)}:d=0.5:alpha=1,fade=t=out:st=${t(seconds - 0.35)}:d=0.3:alpha=1[what]`,
    `[c][what]overlay=0:0:format=auto[d]`,
    `[5:v]format=rgba,fade=t=in:st=${t(seconds)}:d=0.4:alpha=1[end]`,
    `[d][end]overlay=0:0:format=auto,scale=out_color_matrix=bt709:out_range=limited,format=yuv420p[o]`,
  ].join(';')

  await ffmpeg([
    '-f', 'lavfi', '-t', t(total), '-i', `color=c=${INK}:s=${CANVAS.width}x${CANVAS.height}:r=${FPS}`,
    '-framerate', String(FPS), '-i', path.join(framesDir, 'f%05d.jpg'),
    ...loop(cards.head),
    ...loop(cards[`hook-${lang}`]),
    ...loop(cards[`what-${lang}`]),
    ...loop(cards[`end-${lang}`]),
    '-filter_complex', graph,
    '-map', '[o]', '-t', t(total),
    '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-r', String(FPS),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart',
    path.join(dir, `9x16-${lang}.mp4`),
  ])
}

async function recordDemo(sku) {
  const t0 = Date.now()
  console.log(`→ ${sku}`)
  const dir = path.join(OUT, sku)
  const framesDir = path.join(dir, '.frames')
  fs.mkdirSync(dir, { recursive: true })

  for (const lang of LANGS) {
    if (!locales[lang].templates?.[sku]?.vibe) throw new Error(`Falta templates.${sku}.vibe en ${lang}.json`)
  }

  let frames = REUSE_FRAMES && fs.existsSync(framesDir)
    ? fs.readdirSync(framesDir).filter((name) => name.endsWith('.jpg')).length
    : 0
  if (frames > 0) {
    console.log(`   ${sku}: reuso ${frames} frames guardados`)
  } else {
    const captured = await withBrowser(async (browser) => {
      const page = await browser.newPage({ viewport: captureViewport(sku), deviceScaleFactor: 1 })
      page.on('pageerror', (err) => console.warn(`   ${sku}: error en la página: ${err.message}`))
      return captureFrames(page, sku, framesDir)
    })
    frames = captured.frames
    console.log(`   ${sku}: ${frames} frames (${captured.seconds.toFixed(1)} s a ${FPS} fps)`)
  }

  // Piezas de texto: en otro Chromium (sin el WebGL de la demo)
  const cards = { head: path.join(dir, '.head.png') }
  for (const lang of LANGS) {
    for (const name of ['hook', 'what', 'end']) cards[`${name}-${lang}`] = path.join(dir, `.${name}-${lang}.png`)
  }
  const strip = { width: CANVAS.width, height: WINDOW_Y }
  await retry(`${sku} textos`, () =>
    withBrowser(async (browser) => {
      await renderPng(browser, headHtml('es'), strip, cards.head, { transparent: true })
      for (const lang of LANGS) {
        const c = COPY[lang]
        const vibe = locales[lang].templates[sku].vibe
        await renderPng(browser, captionHtml({ lang, kicker: c.hookKicker, text: c.hook }), strip, cards[`hook-${lang}`], { transparent: true })
        await renderPng(browser, captionHtml({ lang, kicker: `${sku.toUpperCase()} · ${vibe}`, text: c.what }), strip, cards[`what-${lang}`], { transparent: true })
        await renderPng(browser, endHtml(lang), CANVAS, cards[`end-${lang}`])
      }
    }),
  )

  // La versión horizontal 16:9 de antes ya no se hace: los videos son verticales.
  for (const lang of LANGS) fs.rmSync(path.join(dir, `16x9-${lang}.mp4`), { force: true })
  for (const lang of LANGS) await encode({ lang, framesDir, frames, dir, cards })
  console.log(`   ${sku}: 2 videos → ${path.relative(ROOT, dir)}`)

  if (!KEEP_FRAMES) fs.rmSync(framesDir, { recursive: true, force: true })
  for (const file of Object.values(cards)) fs.rmSync(file, { force: true })
  console.log(`   ${sku}: listo en ${Math.round((Date.now() - t0) / 1000)} s`)
}

async function main() {
  for (const sku of SKUS) {
    if (!publicDemoSkus().includes(sku)) throw new Error(`"${sku}" no es una demo pública`)
  }
  fs.mkdirSync(OUT, { recursive: true })

  // Una demo que falla no tira abajo a las demás: se avisa al final cuáles repetir.
  const failed = []
  for (const sku of SKUS) {
    try {
      await recordDemo(sku)
    } catch (err) {
      console.error(`   ✗ ${sku}: ${err.message}`)
      failed.push(sku)
    }
  }
  if (failed.length) {
    console.error(`\nFallaron: ${failed.join(', ')}. Repetí con: npm run video:demos -- --skus ${failed.join(',')}`)
    process.exit(1)
  }
  console.log(`\nListo → ${path.relative(ROOT, OUT)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
