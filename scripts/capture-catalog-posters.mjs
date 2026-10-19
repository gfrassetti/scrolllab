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
const BASE = process.argv.slice(2).find((a) => a.startsWith('http')) || 'http://localhost:5173'

/**
 * Scroll ratio por SKU: el cuadro más vistoso de cada uno, elegido mirando cada template entero
 * (2026-10-19, dueño: «muestra lo mejor de cada uno; nada vacío, feo o a medio cargar»).
 */
const SCROLL_AT = {
  // el auto y la rueda bien grandes (el hero)
  apex: 0,
  // el collage del archivo: la máquina de escribir, la escalera y el retrato
  chapters: 0.5,
  monolith: 0,
  fizz: 0,
  // la casa de ladrillo y madera entre los pinos (el hero, ya cargado)
  atelier: 0,
  // el camión con el perro y el chancho
  comic: 0.06,
  // el jugador gritando, a pantalla completa
  unity: 0.26,
  // el edificio en el pastizal (el hero)
  atrium: 0,
  // la villa al atardecer con la montaña (no la carga ni el plano)
  meridian: 0.39,
  // la obra roja, azul y negra de la colección
  kin: 0.23,
  // el puente de papel de noche, con las linternas encendidas
  fold: 0.3,
  nocturne: 0.04,
  velocity: 0.08,
  ratio: 0.08,
}

/** Scroll en píxeles (gana sobre el ratio): héroes pegados que se arman con el scroll. */
const SCROLL_PX = {}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  // Con la placa de video: con swiftshader los 3D (APEX, MONOLITH, ATELIER…) salían vacíos o a medio dibujar.
  const gpu = process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  const browser = await chromium.launch({ args: gpu })
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

  // el bundle más los que se venden sueltos; `--only=sku,sku` rehace solo esos
  const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)
  const skus = [...new Set([...BUNDLE_MODELS, 'kin', 'meridian', 'fold'])].filter((k) => !only.length || only.includes(k))
  for (const sku of skus) {
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
    // Algunos tienen su propia pantalla de carga con «Loading 84 %» (APEX, MERIDIAN): se espera a que se vaya.
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
    await page
      .waitForFunction(() => !/\bloading\b/i.test(document.body.innerText), null, { timeout: 30_000 })
      .catch(() => {})
    await page.waitForTimeout(2800)
    const ratio = SCROLL_AT[sku] ?? 0.04
    const target = await page.evaluate(
      ([r, px]) => (px != null ? px : Math.max(0, Math.floor(document.body.scrollHeight * r))),
      [ratio, SCROLL_PX[sku] ?? null],
    )
    // de a poco, como una persona: un salto directo deja los pines y los relojes de scroll a mitad de camino
    for (let i = 1; i <= 8; i += 1) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round((target * i) / 8))
      await page.waitForTimeout(350)
    }
    await page.waitForTimeout(2200)
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
