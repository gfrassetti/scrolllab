/**
 * Captura covers reales (4:5) de cada demo para el catálogo del homepage:
 * public/catalog/<sku>.jpg y el .webp liviano que usa la home (960 px).
 * Saltea el splash del market y espera el loader de cada template. Después,
 * `npm run gen:og` rehace las tarjetas para compartir con estas portadas.
 * Requiere Vite corriendo (npm run dev:web).
 * Volver a correrlo cada vez que cambia el copy de un hero (docs/template-copy.md).
 *
 * Uso: npm run capture:catalog [-- http://127.0.0.1:5173]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { BUNDLE_MODELS } from '../server/catalog.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(REPO, 'public', 'catalog')
const BASE = process.argv[2] || 'http://localhost:5173'

/** Scroll ratio por SKU: hero / beat más “vendible” en el primer viewport+ */
const SCROLL_AT = {
  chapters: 0.02,
  nocturne: 0.04,
  monolith: 0.03,
  // Antes del final del cruce: el título ya se lee y la foto todavía no se desenfocó.
  velocity: 0.08,
  // El titular 3D sube con la página: arriba del todo se lee entero.
  fizz: 0,
  atelier: 0,
  comic: 0.06,
  unity: 0.04,
  kin: 0,
  ratio: 0.08,
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 900, height: 1125 },
    deviceScaleFactor: 1.25,
  })
  // Sin el splash del market: la portada es el template, no la bienvenida.
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('scrolllab-splash-seen', '1')
    } catch {
      /* storage bloqueado: igual se espera abajo */
    }
  })
  const page = await context.newPage()

  for (const sku of BUNDLE_MODELS) {
    const url = `${BASE}/templates/${sku}`
    process.stdout.write(`→ ${sku} … `)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    await page.waitForTimeout(1500)
    // El loader de cada template (APEX, KIN, MERIDIAN…) traba la página hasta que se va.
    for (let i = 0; i < 40; i += 1) {
      const busy = await page.evaluate(
        () => Boolean(document.querySelector('[data-page-loader]')) || document.body.style.overflow === 'hidden',
      )
      if (!busy) break
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(2800)
    const ratio = SCROLL_AT[sku] ?? 0.04
    await page.evaluate((r) => {
      const y = Math.max(0, Math.floor(document.body.scrollHeight * r))
      window.scrollTo(0, y)
    }, ratio)
    await page.waitForTimeout(1800)
    const dest = path.join(OUT, `${sku}.jpg`)
    await page.screenshot({ path: dest, type: 'jpeg', quality: 84 })
    await sharp(dest).resize({ width: 960 }).webp({ quality: 80 }).toFile(path.join(OUT, `${sku}.webp`))
    const kb = Math.round(fs.statSync(dest).size / 1024)
    console.log(`${kb}kb`)
  }

  await browser.close()
  console.log(`Done → ${path.relative(REPO, OUT)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
