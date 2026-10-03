/**
 * Verifica que el editor del builder realmente cambie lo que se ve: cada
 * texto, link e imagen editable (sueltos y dentro de listas) aparece en el
 * preview. Junto con server/__tests__/builderRoundTrip.test.js (el ZIP recibe
 * exactamente las props del preview) cubre que lo editado se descarga.
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
import { BUILDER_HIDDEN_SKUS } from '../src/lib/pricing.js'

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
  'fizz/CanCarousel.canLabel': 'solo en latas sin foto; las de ejemplo traen PNG',
  'fizz/HeroBubbles.canLabel': 'se imprime en la etiqueta de la botella, dentro del canvas WebGL: no llega al DOM',
  'fizz/HeroBubbles.canImage': 'es la etiqueta de la botella (textura WebGL), no un <img> del DOM',
  'unity/FooterTrophy.accentWord': 'resalta esa palabra dentro del título; sola no se ve',
  'contact/ContactForm.sendingLabel': 'solo visible mientras se envía',
  'contact/ContactForm.successMessage': 'solo visible tras enviar',
  'contact/ContactForm.errorMessage': 'solo visible si falla el envío',
  'meridian/Masterplan.units.line1': 'tooltip: aparece al pasar el mouse por el punto',
  'meridian/Masterplan.units.line2': 'tooltip: aparece al pasar el mouse por el punto',
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

/** Un token sin espacios sobrevive al split por caracteres y por palabras. */
function marker(index) {
  return `ZQMARK${index}`
}

/** Qué se busca en pantalla según el tipo: el texto, o la URL en un atributo. */
function checkKind(field) {
  if (['text', 'textarea'].includes(field.type) && !NON_VISIBLE_KEYS.has(field.key)) return 'text'
  if (field.type === 'href' || field.type === 'image') return 'url'
  return null
}

/**
 * Lo que el comprador puede editar y tiene que verse: textos, links e
 * imágenes, sueltos y dentro de listas (dos filas por lista). Devuelve las
 * props a cargar y qué buscar de cada una. Los `checkout*` del ProductGrid se
 * ven en la ruta /checkout, no en la grilla.
 */
function editsFor(sectionId) {
  const props = {}
  const expect = []
  let n = 0
  const valueFor = (kind) => (kind === 'text' ? marker(n++) : `https://zq.example/${marker(n++)}`)
  for (const field of SECTION_FIELDS[sectionId] || []) {
    if (sectionId === 'commerce/ProductGrid' && field.key.startsWith('checkout')) continue
    const id = `${sectionId}.${field.key}`
    if (field.type === 'list') {
      const rows = [0, 1].map((row) => {
        const item = {}
        for (const sub of field.item || []) {
          const kind = checkKind(sub)
          if (!kind) continue
          item[sub.key] = valueFor(kind)
          if (!(`${id}.${sub.key}` in NOT_IN_DOM)) {
            expect.push({ id: `${id}[${row}].${sub.key}`, value: item[sub.key] })
          }
        }
        return item
      })
      if (rows.some((row) => Object.keys(row).length)) props[field.key] = rows
      continue
    }
    const kind = checkKind(field)
    if (!kind) continue
    props[field.key] = valueFor(kind)
    if (!(id in NOT_IN_DOM)) expect.push({ id, value: props[field.key] })
  }
  return { props, expect }
}

const squash = (text) => text.replace(/\s+/g, '')

async function checkSectionRendersProps(page, sectionId) {
  const { props, expect } = editsFor(sectionId)
  if (!expect.length) return []

  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify([{ uid: 'check-1', sectionId, props }])],
  )
  await page.goto(`${BASE}/preview`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  // Algunas props viajan en atributos (un mail en `mailto:`, un alt, un
  // placeholder, una imagen en src o en un background) en vez de ser texto.
  const haystack = squash(
    await page.evaluate(() => {
      const attrs = ['href', 'src', 'aria-label', 'alt', 'title', 'placeholder', 'value', 'id', 'style']
      const values = [...document.querySelectorAll('*')].flatMap((el) =>
        attrs.map((name) => el.getAttribute(name)).filter(Boolean),
      )
      return `${document.body.textContent || ''} ${values.join(' ')}`
    }),
  )

  return expect.filter(({ value }) => !haystack.includes(value)).map(({ id }) => id)
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

  // «Editar hero» / «Edit hero»: el navegador del check puede estar en inglés.
  await page.locator('button', { hasText: /edit/i }).first().click()
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
const problems = []
// Adentro del try: si Chromium no abre, igual se cierra vite (quedaba zombi).
let browser

try {
  // PLAYWRIGHT_CHROMIUM_PATH: un Chromium del sistema (contenedor/CI sin `playwright install`).
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
  // Lo que ofrece la paleta pública: los modelos en obra (RATIO…) no.
  const sectionIds = Object.keys(SECTION_FIELDS).filter(
    (id) =>
      editsFor(id).expect.length > 0 &&
      !BUILDER_HIDDEN_SKUS.includes(id.split('/')[0]),
  )
  const total = sectionIds.reduce((sum, id) => sum + editsFor(id).expect.length, 0)

  console.log(`Revisando ${total} valores editados en ${sectionIds.length} secciones…`)
  const checkOnce = async (sectionId) => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
    const missing = await checkSectionRendersProps(page, sectionId)
    await page.close()
    return missing
  }
  for (const sectionId of sectionIds) {
    let missing = await checkOnce(sectionId)
    // Faltan todos a la vez: la página no llegó a pintar (Vite recarga cuando
    // descubre una dependencia nueva a mitad de la corrida). Un reintento lo
    // distingue de un bug, que falla igual la segunda vez.
    const expected = editsFor(sectionId).expect.length
    if (expected > 1 && missing.length === expected) {
      missing = await checkOnce(sectionId)
    }
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
  await browser?.close()
  vite.kill()
}

if (problems.length) {
  console.error(`\n✖ ${problems.length} problema(s):\n`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('\n✓ El editor aplica los cambios y no hay errores de consola')
