/**
 * Captura covers reales (4:5) de cada demo para el catálogo del homepage.
 * Requiere Vite corriendo (npm run dev:web).
 *
 * Uso: npm run capture:catalog [-- http://127.0.0.1:5173]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { BUNDLE_MODELS } from '../server/catalog.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(REPO, 'public', 'catalog')
const BASE = process.argv[2] || 'http://localhost:5173'

/** Scroll ratio por SKU: hero / beat más “vendible” en el primer viewport+ */
const SCROLL_AT = {
  chapters: 0.02,
  nocturne: 0.04,
  monolith: 0.03,
  velocity: 0.05,
  fizz: 0.04,
  atelier: 0.05,
  comic: 0.06,
  unity: 0.04,
  ratio: 0.08,
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 900, height: 1125 },
    deviceScaleFactor: 1.25,
  })

  for (const sku of BUNDLE_MODELS) {
    const url = `${BASE}/templates/${sku}`
    process.stdout.write(`→ ${sku} … `)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    await page.waitForTimeout(2800)
    const ratio = SCROLL_AT[sku] ?? 0.04
    await page.evaluate((r) => {
      const y = Math.max(0, Math.floor(document.body.scrollHeight * r))
      window.scrollTo(0, y)
    }, ratio)
    await page.waitForTimeout(900)
    const dest = path.join(OUT, `${sku}.jpg`)
    await page.screenshot({ path: dest, type: 'jpeg', quality: 84 })
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
