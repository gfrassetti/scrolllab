/**
 * check:builder-save — lo que se edita en el builder se guarda, se retoma y se
 * descarga. Lo que ningún test unitario ve porque pasa por el navegador:
 *
 *   1. Con sesión, abrir un proyecto, editar un texto en el panel y esperar el
 *      guardado automático (el servidor tiene el texto nuevo).
 *   2. «Otro dispositivo» (un navegador limpio, la misma cuenta): abrir el
 *      proyecto y ver el texto en la vista previa (en el builder manda el servidor).
 *   3. Comprar esa composición (pago simulado) y bajar el ZIP: App.jsx lleva el
 *      texto editado.
 *
 * Lo determinista (permisos, tope de proyectos, la receta que llega al ZIP) ya
 * está en node:test (builderProjects.test.js, builderRoundTrip.test.js). La API
 * corre aislada: store de archivo temporal, login dev, MP simulado.
 *
 * Uso:
 *   npm run check:builder-save                    una sección por modelo
 *   npm run check:builder-save -- apex            la primera sección editable del modelo
 *   npm run check:builder-save -- apex/Statement  esa sección
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

import { readZip } from '../server/__tests__/helpers/zip.js'
import { ALLOWED_SECTIONS } from '../server/sections.js'
import { BUILDER_HIDDEN_SKUS } from '../src/domain/catalog.js'

// SHOW_HIDDEN=1: prueba también los modelos en obra (BUILDER_HIDDEN_SKUS), p. ej. ORDO; el builder los muestra con esa variable.
if (process.env.SHOW_HIDDEN === '1') process.env.VITE_BUILDER_SHOW_HIDDEN = '1'
import { sectionModelOf } from '../src/domain/sections.js'
import { SECTION_FIELDS } from '../src/lib/sectionFields.js'
import { NOT_IN_DOM } from './lib/not-in-dom.mjs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(REPO)

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })

async function waitUp(url, tries = 160) {
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

// --- qué secciones -----------------------------------------------------------

const BUILDER = ALLOWED_SECTIONS.filter((id) => process.env.SHOW_HIDDEN === '1' || !BUILDER_HIDDEN_SKUS.includes(sectionModelOf(id)))
/** El primer texto suelto de la sección que se ve en la página (no un loader, un estado ni un aria-label). */
const visibleTextField = (id) =>
  (SECTION_FIELDS[id] || []).find(
    (f) => (f.type === 'text' || f.type === 'textarea') && !(`${id}.${f.key}` in NOT_IN_DOM) && !/Label$/.test(f.key),
  )
/** La primera sección del modelo con un texto suelto que se ve, que no sea un nav. */
const firstOf = (model) => BUILDER.find((id) => sectionModelOf(id) === model && !/\/Nav/.test(id) && visibleTextField(id))
const SHOTS = path.join(REPO, 'storage', 'builder-save')
fs.mkdirSync(SHOTS, { recursive: true })

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const models = [...new Set(BUILDER.map(sectionModelOf))]
const sections = (args.length ? args : models)
  .map((a) => (a.includes('/') ? a : firstOf(a)))
  .filter(Boolean)
const unknown = args.filter((a) => (a.includes('/') ? !BUILDER.includes(a) || !visibleTextField(a) : !firstOf(a)))
if (unknown.length || !sections.length) {
  console.error(`✖ sin sección editable en el builder: ${(unknown.length ? unknown : args).join(', ')}`)
  process.exit(1)
}

// --- servidores ---------------------------------------------------------------

const [apiPort, vitePort] = await Promise.all([freePort(), freePort()])
const API = `http://localhost:${apiPort}`
const BASE = `http://127.0.0.1:${vitePort}`
const children = [
  spawn(process.execPath, ['embed/test/e2e-api.mjs'], {
    cwd: REPO,
    stdio: 'ignore',
    env: { ...process.env, E2E_API_PORT: String(apiPort), E2E_CLIENT_URL: BASE },
  }),
  spawn(
    process.execPath,
    [path.join(REPO, 'node_modules/vite/bin/vite.js'), '--port', String(vitePort), '--host', '127.0.0.1', '--strictPort'],
    { cwd: REPO, stdio: 'ignore', env: { ...process.env, VITE_API_PROXY_TARGET: API } },
  ),
]
const shutdown = () => children.forEach((c) => c.kill('SIGTERM'))
process.on('exit', shutdown)

const EMAIL = 'builder-save@test.com'
const problems = []
let browser

/** Un navegador nuevo con sesión (cada uno es «otro dispositivo»). */
async function device() {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'es-AR' })
  const login = await context.request.post(`${BASE}/api/auth/dev-login`, { data: { email: EMAIL, name: 'Builder Save' } })
  if (!login.ok()) throw new Error(`dev-login → HTTP ${login.status()}`)
  return context
}

async function previewText(page) {
  return page.evaluate(() => document.querySelector('main')?.innerText || document.body.innerText)
}

/**
 * Espera a que la vista previa muestre el texto: hasta 15 s, porque hay
 * secciones que muestran su barra recién después de su pantalla de carga (APEX:
 * hasta 4,5 s esperando el film, más la entrada).
 */
async function previewShows(page, marker) {
  for (let i = 0; i < 50; i++) {
    if ((await previewText(page)).includes(marker)) return true
    await sleep(300)
  }
  return false
}

async function checkSection(sectionId, n) {
  const fail = (msg) => problems.push(`${sectionId}: ${msg}`)
  const marker = `ZQSAVE${n}X`
  const a = await device()
  let projectId = null
  let current = null
  try {
    // 1. Proyecto con esa sección; se abre por URL, se edita y se guarda solo.
    const created = await a.request.post(`${BASE}/api/builder-projects`, {
      data: { name: `QA ${sectionId}`, recipe: [{ id: sectionId }] },
    })
    if (!created.ok()) return fail(`crear proyecto → HTTP ${created.status()}`)
    projectId = (await created.json()).project.id

    const page = await a.newPage()
    current = page
    await page.goto(`${BASE}/builder?project=${projectId}`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /vista previa|preview/i }).first().click()
    await page.waitForTimeout(1500)
    await page.locator('button', { hasText: /edit/i }).first().click()
    await page.waitForTimeout(300)
    // El campo por su etiqueta, como lo busca una persona en el panel.
    const field = visibleTextField(sectionId)
    const input = page
      .locator('aside label', { has: page.locator(`span:text-is("${field.label}")`) })
      .first()
      .locator('input, textarea')
    await input.fill(marker)

    let saved = false
    for (let i = 0; i < 40 && !saved; i++) {
      await sleep(250)
      const res = await a.request.get(`${BASE}/api/builder-projects/${projectId}`)
      saved = res.ok() && JSON.stringify((await res.json()).project?.recipe || []).includes(marker)
    }
    if (!saved) return fail('el guardado automático no llegó al servidor en 10 s')
    if (!(await previewShows(page, marker))) fail('la vista previa no muestra el texto editado')
    await page.close()

    // 2. Otro dispositivo: el proyecto abre con lo guardado.
    const b = await device()
    try {
      const other = await b.newPage()
      await other.goto(`${BASE}/builder?project=${projectId}`, { waitUntil: 'networkidle' })
      await other.getByRole('button', { name: /vista previa|preview/i }).first().click()
      if (!(await previewShows(other, marker))) fail('en otro navegador el proyecto abre sin lo editado')
    } finally {
      await b.close()
    }

    // 3. Comprar y bajar: el ZIP trae lo editado.
    const project = (await (await a.request.get(`${BASE}/api/builder-projects/${projectId}`)).json()).project
    const checkout = await a.request.post(`${BASE}/api/checkout`, {
      data: { items: [{ sku: 'custom', recipe: project.recipe }] },
    })
    if (!checkout.ok()) return fail(`checkout → HTTP ${checkout.status()} ${(await checkout.text()).slice(0, 120)}`)
    const { orderId } = await checkout.json()
    const paid = await a.request.post(`${BASE}/api/checkout/mock-pay`, { data: { orderId } })
    if (!paid.ok()) return fail(`pago simulado → HTTP ${paid.status()}`)
    const link = await a.request.get(`${BASE}/api/orders/${orderId}/download`)
    if (!link.ok()) return fail(`link de descarga → HTTP ${link.status()}`)
    const zip = await a.request.get(`${BASE}${(await link.json()).url}`)
    if (!zip.ok()) return fail(`descarga → HTTP ${zip.status()}`)
    const files = readZip(Buffer.from(await zip.body()))
    const app = files.get('src/App.jsx')?.toString('utf8') || ''
    if (!app.includes(marker)) fail('el ZIP descargado no trae el texto editado (src/App.jsx)')
    if (!files.has(`src/components/sections/${sectionId}.jsx`)) fail('el ZIP no trae el archivo de la sección')
  } catch (err) {
    fail(`excepción: ${String(err.message || err).split('\n')[0].slice(0, 160)}`)
  } finally {
    // Captura del momento en que falló: storage/builder-save/<modelo>-<Sección>.png.
    if (current && problems.some((p) => p.startsWith(`${sectionId}:`))) {
      await current.screenshot({ path: path.join(SHOTS, `${sectionId.replace('/', '-')}.png`) }).catch(() => {})
    }
    if (projectId) await a.request.delete(`${BASE}/api/builder-projects/${projectId}`).catch(() => {})
    await a.close()
  }
}

try {
  await Promise.all([waitUp(`${API}/api/embed/loader`), waitUp(`${BASE}/builder`)])
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
  console.log(`Editar → guardar → otro dispositivo → comprar → ZIP: ${sections.length} sección(es)`)
  let n = 0
  for (const id of sections) {
    const before = problems.length
    await checkSection(id, n++)
    console.log(`  ${problems.length > before ? '✖' : '✓'} ${id}`)
  }
} finally {
  await browser?.close().catch(() => {})
  shutdown()
}

if (problems.length) {
  console.error(`\n✖ ${problems.length} problema(s):\n`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('\n✓ Lo editado se guarda, se retoma en otro navegador y llega al ZIP')
