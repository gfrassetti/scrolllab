/**
 * Auditoría responsive: recorre cada ruta del marketplace en anchos
 * mobile/tablet/desktop y saca capturas (arriba/medio/abajo), además de
 * reportar elementos que se desbordan del viewport.
 *
 * Requiere el dev server corriendo (npm run dev → http://localhost:5173).
 * A diferencia de check:visual, no empaqueta ni compila: apunta al server de
 * desarrollo directo, así es rápido y sirve para iterar el responsive.
 *
 * Uso:
 *   node scripts/check-responsive.mjs                 # todas las rutas, 4 anchos
 *   node scripts/check-responsive.mjs /cart /builder  # solo esas rutas
 *   BASE=http://localhost:5173 WIDTHS=390,768,1024,1440 node scripts/check-responsive.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(REPO, 'storage', 'responsive-check')
const BASE = process.env.BASE || 'http://localhost:5173'

const WIDTHS = (process.env.WIDTHS || '390,768,1024,1440')
  .split(',')
  .map((w) => Number(w.trim()))
  .filter(Boolean)

// Altura por ancho: aprox. a devices reales (mobile alto, desktop 16:10).
const HEIGHT_FOR = (w) => (w <= 480 ? 844 : w < 1024 ? 1024 : 900)

const ROUTES = [
  '/',
  '/templates/chapters',
  '/templates/nocturne',
  '/templates/monolith',
  '/templates/fizz',
  '/templates/velocity',
  '/templates/atelier',
  '/templates/comic',
  '/templates/unity',
  '/builder',
  '/preview',
  '/cart',
  '/account',
  '/login',
  '/checkout/success',
  '/checkout/failure',
  '/checkout/mock',
  '/legal/license',
  '/legal/privacy',
  '/legal/terms',
  '/ruta-inexistente-404',
]

const only = process.argv.slice(2)
const routes = only.length ? only : ROUTES

const slug = (route) =>
  route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_')

/** Elementos cuyo borde derecho/izquierdo se sale del viewport (overflow real). */
function scanOverflow() {
  const vw = window.innerWidth
  const offenders = []
  const nodes = document.body.querySelectorAll('*')
  for (const el of nodes) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    // El cursor custom y overlays decorativos son fixed + pointer-events:none:
    // no son overflow de contenido, se ignoran para bajar ruido.
    const cs = getComputedStyle(el)
    if (cs.pointerEvents === 'none' && cs.position === 'fixed') continue
    const over = Math.max(r.right - vw, -r.left)
    if (over > 2 && r.width <= vw * 3) {
      const cls =
        typeof el.className === 'string' ? el.className.slice(0, 80) : ''
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls,
        right: Math.round(r.right),
        left: Math.round(r.left),
        w: Math.round(r.width),
        over: Math.round(over),
      })
    }
  }
  return offenders.sort((a, b) => b.over - a.over).slice(0, 8)
}

async function shoot(context, route, width) {
  const height = HEIGHT_FOR(width)
  const page = await context.newPage()
  await page.setViewportSize({ width, height })
  const dir = path.join(OUT, slug(route))
  fs.mkdirSync(dir, { recursive: true })

  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push(e.message))

  let overflow = []
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 20000 })
    await page.waitForTimeout(1600)
    await page.screenshot({ path: path.join(dir, `${width}-top.png`) })

    overflow = await page.evaluate(scanOverflow)

    for (const [label, ratio] of [
      ['mid', 0.5],
      ['bottom', 0.95],
    ]) {
      await page.evaluate((r) => {
        window.scrollTo(0, document.body.scrollHeight * r)
      }, ratio)
      await page.waitForTimeout(1200)
      await page.screenshot({ path: path.join(dir, `${width}-${label}.png`) })
    }
  } catch (err) {
    consoleErrors.push(`goto/scroll failed: ${String(err).slice(0, 200)}`)
  } finally {
    await page.close()
  }
  return { overflow, consoleErrors }
}

fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
// Salta el splash de marca (una vez por sesión) y estabiliza captura.
const context = await browser.newContext()
await context.addInitScript(() => {
  try {
    sessionStorage.setItem('scrolllab-splash-seen', '1')
  } catch {
    /* ignore */
  }
})

const report = []
for (const route of routes) {
  const line = [`\n${route}`]
  for (const width of WIDTHS) {
    const { overflow, consoleErrors } = await shoot(context, route, width)
    const tier = width <= 480 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'
    if (overflow.length || consoleErrors.length) {
      line.push(`  ${width}px (${tier}):`)
      for (const o of overflow) {
        line.push(`    overflow +${o.over}px  <${o.tag} class="${o.cls}">`)
      }
      for (const e of consoleErrors) line.push(`    err: ${e}`)
    } else {
      line.push(`  ${width}px (${tier}): ok`)
    }
  }
  const block = line.join('\n')
  report.push(block)
  console.log(block)
}

await browser.close()

const reportPath = path.join(OUT, 'report.txt')
fs.writeFileSync(reportPath, report.join('\n') + '\n')
console.log(`\nCapturas + report en ${path.relative(REPO, OUT)}`)
