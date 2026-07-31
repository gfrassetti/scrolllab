/**
 * Verificación de entrega punta a punta: hace lo mismo que haría el comprador.
 *
 * Empaqueta cada template (y una composición del builder), lo extrae, corre
 * `npm install` de verdad — así se valida que el package.json generado alcance —
 * lo compila con Vite y abre el resultado en Chromium para confirmar que
 * renderiza algo, sin errores de consola.
 *
 * Los tests de `npm test` abren el ZIP y revisan imports y dependencias; esto
 * es lo único que detecta un fallo en runtime o una página en blanco. Es lento
 * a propósito, por eso vive fuera de `npm test`.
 *
 * Uso: npm run check:visual [-- modelo1 modelo2]
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

import { BUNDLE_MODELS } from '../server/catalog.js'
import { packCustomTemplate, packFixedTemplate } from '../server/packaging.js'
import { readZip } from '../server/__tests__/helpers/zip.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SHOTS = path.join(REPO, 'storage', 'visual-check')
const LICENSE = { orderId: 'visual-check', email: 'check@scrolllab.test' }

const CUSTOM_RECIPE = [
  'chapters/HeroKinetic',
  'nocturne/SplitReveals',
  { id: 'contact/ContactForm' },
  'atelier/FooterAtelier',
]

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
}

/** Ruido de terceros que no dice nada sobre la salud del template. */
const IGNORED_ERRORS = [/favicon/i, /Download the React DevTools/i]

function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: 'pipe', shell: process.platform === 'win32' })
}

function serveDist(dist) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0])
    let file = path.join(dist, rel === '/' ? 'index.html' : rel)
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(dist, 'index.html')
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
    })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, port: server.address().port }),
    )
  })
}

async function inspect(browser, dist, name) {
  const { server, port } = await serveDist(dist)
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (!IGNORED_ERRORS.some((re) => re.test(text))) errors.push(text)
  })
  page.on('pageerror', (err) => errors.push(err.message))

  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' })
    await page.waitForTimeout(2500) // que corran las animaciones de entrada

    const text = (await page.locator('body').innerText()).trim()
    const height = await page.evaluate(() => document.body.scrollHeight)
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })

    // Recorrer la página también prueba los ScrollTrigger, que es donde suele
    // romperse un template que arriba se ve bien.
    for (const [label, ratio] of [['medio', 0.5], ['final', 0.95]]) {
      await page.evaluate((r) => {
        window.scrollTo(0, document.body.scrollHeight * r)
      }, ratio)
      await page.waitForTimeout(1800)
      await page.screenshot({ path: path.join(SHOTS, `${name}-${label}.png`) })
    }

    return { errors, text, height }
  } finally {
    await page.close()
    server.close()
  }
}

async function check(browser, name, packTo) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `sl-${name}-`))
  const problems = []

  const zipPath = path.join(work, `${name}.zip`)
  await packTo(zipPath)

  const project = path.join(work, 'app')
  for (const [entry, content] of readZip(fs.readFileSync(zipPath))) {
    const dest = path.join(project, entry)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, content)
  }

  try {
    run('npm', ['install', '--no-audit', '--no-fund', '--silent'], project)
  } catch (err) {
    return [`${name}: npm install falló — ${String(err.stderr || err).slice(0, 400)}`]
  }

  try {
    run('npx', ['vite', 'build'], project)
  } catch (err) {
    return [`${name}: vite build falló — ${String(err.stdout || err.stderr || err).slice(0, 600)}`]
  }

  const { errors, text, height } = await inspect(
    browser,
    path.join(project, 'dist'),
    name,
  )

  if (text.length < 40) problems.push(`${name}: la página renderiza casi vacía`)
  if (height < 1200) problems.push(`${name}: la página mide ${height}px, no hay scroll`)
  for (const error of errors) problems.push(`${name}: error en consola — ${error}`)

  fs.rmSync(work, { recursive: true, force: true })
  return problems
}

const only = process.argv.slice(2)
const targets = [
  ...BUNDLE_MODELS.map((model) => ({
    name: model,
    packTo: (destPath) => packFixedTemplate({ model, destPath, licenseMeta: LICENSE }),
  })),
  {
    name: 'custom',
    packTo: (destPath) =>
      packCustomTemplate({ recipe: CUSTOM_RECIPE, destPath, licenseMeta: LICENSE }),
  },
].filter((t) => !only.length || only.includes(t.name))

fs.mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch()
const problems = []

for (const target of targets) {
  process.stdout.write(`· ${target.name} … `)
  const found = await check(browser, target.name, target.packTo)
  problems.push(...found)
  console.log(found.length ? `${found.length} problema(s)` : 'ok')
}

await browser.close()

console.log(`\nCapturas en ${path.relative(REPO, SHOTS)}`)

if (problems.length) {
  console.error(`\n✖ ${problems.length} problema(s):\n`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`✓ ${targets.length} proyectos instalan, compilan y renderizan`)
