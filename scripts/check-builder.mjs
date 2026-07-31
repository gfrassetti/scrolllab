/**
 * Verifica que el editor del builder realmente cambie lo que se ve.
 *
 * Nace de un bug concreto: varias secciones animan el texto con SplitText, que
 * reemplaza el contenido del nodo por divs de caracteres. A partir de ahí React
 * no puede actualizar ese texto y el panel de edición parecía no hacer nada,
 * aunque el estado sí cambiaba. Ningún test unitario lo detecta: hace falta un
 * navegador de verdad.
 *
 * Corre en dev (no en build) a propósito, para que React reporte sus warnings.
 *
 * Uso: npm run check:builder
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

import { SECTION_FIELDS } from '../src/lib/sectionFields.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STORAGE_KEY = 'builder-composition-v1'

/** Puerto efímero: un vite zombi de una corrida anterior no rompe esta. */
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

/** Props que no se ven como texto: URLs de assets y endpoints. */
const NON_VISIBLE_KEYS = new Set([
  'endpoint',
  'modelUrl',
  'can1Image',
  'can2Image',
  'can3Image',
  'can4Image',
  'can5Image',
])

/**
 * Props que no llegan al DOM por diseño. Se listan una por una — y con el
 * motivo — para que la lista no se convierta en un lugar donde esconder bugs.
 */
const NOT_IN_DOM = {
  'fizz/HeroBubbles.canLabel': 'se dibuja en la textura WebGL de la lata',
  'contact/ContactForm.sendingLabel': 'solo visible mientras se envía',
  'contact/ContactForm.successMessage': 'solo visible tras enviar',
  'contact/ContactForm.errorMessage': 'solo visible si falla el envío',
}

const ROUTES = ['/', '/builder', '/cart', '/login']

const IGNORED_CONSOLE = [
  /favicon/i,
  /React DevTools/i,
  /Failed to load resource/i,
  /GL Driver Message/i, // ruido de GPU en headless
]

/**
 * Se lanza el bin de vite con node directamente: con `shell: true` en Windows
 * matamos el wrapper y el servidor queda huérfano ocupando el puerto.
 * --host explícito porque por defecto Vite escucha en ::1 y Playwright va a IPv4.
 */
function startVite(port) {
  const bin = path.join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')
  const proc = spawn(
    process.execPath,
    [bin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] },
  )

  return new Promise((resolve, reject) => {
    const fail = (reason) => {
      proc.kill()
      reject(new Error(`vite no arrancó: ${reason}`))
    }
    const timer = setTimeout(() => fail('timeout'), 60000)
    let stderr = ''

    proc.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('ready in')) {
        clearTimeout(timer)
        resolve(proc)
      }
    })
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    proc.on('exit', (code) => {
      clearTimeout(timer)
      if (code !== 0) fail(`salió con código ${code}. ${stderr.slice(0, 300)}`)
    })
    proc.on('error', reject)
  })
}

/** Campos de texto libre: los únicos que deberían aparecer tal cual en pantalla. */
function editableTextFields(sectionId) {
  return (SECTION_FIELDS[sectionId] || []).filter(
    (field) =>
      ['text', 'textarea'].includes(field.type) && !NON_VISIBLE_KEYS.has(field.key),
  )
}

/** Un token sin espacios sobrevive al split por caracteres y por palabras. */
function marker(index) {
  return `ZQMARK${index}`
}

const squash = (text) => text.replace(/\s+/g, '')

async function checkSectionRendersProps(page, sectionId) {
  const fields = editableTextFields(sectionId)
  if (!fields.length) return []

  const props = {}
  fields.forEach((field, i) => {
    props[field.key] = marker(i)
  })

  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify([{ uid: 'check-1', sectionId, props }])],
  )
  await page.goto(`${BASE}/preview`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  // Algunas props viajan en atributos (un mail en `mailto:`, un alt, un
  // placeholder) en vez de ser texto visible.
  const haystack = squash(
    await page.evaluate(() => {
      const attrs = ['href', 'aria-label', 'alt', 'title', 'placeholder', 'value']
      const values = [...document.querySelectorAll('*')].flatMap((el) =>
        attrs.map((name) => el.getAttribute(name)).filter(Boolean),
      )
      return `${document.body.textContent || ''} ${values.join(' ')}`
    }),
  )

  return fields
    .map((field, i) => {
      const id = `${sectionId}.${field.key}`
      if (id in NOT_IN_DOM) return null
      return haystack.includes(marker(i)) ? null : id
    })
    .filter(Boolean)
}

/** El caso reportado: editar en vivo desde el panel del preview. */
async function checkLiveEditing(page) {
  const problems = []

  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [
      STORAGE_KEY,
      JSON.stringify([{ uid: 'live-1', sectionId: 'atelier/HeroMeaning' }]),
    ],
  )
  await page.goto(`${BASE}/builder`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /vista previa|preview/i }).first().click()
  await page.waitForTimeout(2000)

  const heading = page.locator('h1[data-atelier-hero]')
  const before = (await heading.innerText()).trim()

  await page.locator('button', { hasText: /editar/i }).first().click()
  await page.waitForTimeout(300)
  await page.locator('aside input[type="text"]').first().fill('ZQLIVE')
  await page.waitForTimeout(1500)

  const after = (await heading.innerText()).trim()
  if (!squash(after).includes('ZQLIVE')) {
    problems.push(`editar en vivo no cambió el texto (antes: "${before}", después: "${after}")`)
  }
  return problems
}

/**
 * El header avisa cuántas secciones quedaron armadas. Vive fuera del builder,
 * así que se alimenta de localStorage y de un evento propio.
 */
async function checkBuilderBadge(page) {
  const problems = []
  const link = page.getByRole('link', { name: /^builder/i }).first()

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  if ((await link.innerText()).includes('(')) {
    problems.push('el nav muestra contador con el builder vacío')
  }

  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [
      STORAGE_KEY,
      JSON.stringify([
        { uid: 'badge-1', sectionId: 'chapters/NavMinimal' },
        { uid: 'badge-2', sectionId: 'atelier/HeroMeaning' },
      ]),
    ],
  )
  await page.reload({ waitUntil: 'networkidle' })

  const label = squash(await link.innerText())
  if (!label.includes('(2)')) {
    problems.push(`el nav debería decir "(2)" y dice "${label}"`)
  }
  return problems
}

async function checkConsole(page, route) {
  const hits = []
  const onConsole = (msg) => {
    if (!['error', 'warning'].includes(msg.type())) return
    const text = msg.text()
    if (!IGNORED_CONSOLE.some((re) => re.test(text))) hits.push(text.slice(0, 200))
  }
  const onError = (err) => hits.push(`excepción: ${err.message.slice(0, 200)}`)

  page.on('console', onConsole)
  page.on('pageerror', onError)
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1200)
  page.off('console', onConsole)
  page.off('pageerror', onError)

  return [...new Set(hits)].map((hit) => `${route}: ${hit}`)
}

const port = await freePort()
const BASE = `http://127.0.0.1:${port}`
const vite = await startVite(port)
const browser = await chromium.launch()
const problems = []

try {
  const sectionIds = Object.keys(SECTION_FIELDS).filter(
    (id) => editableTextFields(id).length > 0,
  )

  console.log(`Revisando ${sectionIds.length} secciones con texto editable…`)
  for (const sectionId of sectionIds) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
    const missing = await checkSectionRendersProps(page, sectionId)
    await page.close()
    if (missing.length) {
      console.log(`  ✖ ${sectionId} — no renderiza: ${missing.join(', ')}`)
      problems.push(...missing.map((m) => `${m} no aparece en pantalla`))
    }
  }
  console.log('  hecho')

  console.log('Editando en vivo desde el panel…')
  const live = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  problems.push(...(await checkLiveEditing(live)))
  await live.close()

  console.log('Revisando el contador del builder en el nav…')
  const badge = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  problems.push(...(await checkBuilderBadge(badge)))
  await badge.close()

  console.log('Revisando la consola en cada ruta…')
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
    problems.push(...(await checkConsole(page, route)))
    await page.close()
  }
} finally {
  await browser.close()
  vite.kill()
}

if (problems.length) {
  console.error(`\n✖ ${problems.length} problema(s):\n`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('\n✓ El editor aplica los cambios y no hay errores de consola')
