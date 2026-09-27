/**
 * LAB de punta a punta en un navegador real, sección por sección (todas las de
 * HOSTABLE_SECTIONS), como lo usa un suscriptor:
 *
 *  1. el editor /lab/:id carga y su vista previa es el frame REAL del embed;
 *  2. escribir en un campo cambia la vista previa, sin guardar;
 *  3. «Publicar» → el embed pegado en un sitio ajeno muestra el cambio;
 *  4. otro cambio sin publicar: el editor avisa y el sitio sigue igual.
 *
 * Una vez: el ancho Mobile del preview mide 390px de verdad, una imagen con
 * ruta relativa avisa y no se guarda (en LAB va URL completa), la consola
 * del editor queda limpia, y con Starter (5) la 6ª publicación avisa el tope
 * al lado del botón y queda en borrador.
 *
 * Levanta la API (store de archivo temporal, login dev, MP mock), el embed
 * recién buildeado (embed-dist) en un estático y Vite dev apuntando a esa API.
 * El sitio del cliente (localhost) y el frame (127.0.0.1) quedan en orígenes
 * distintos, como en producción.
 *
 * Uso: npm run check:lab   (PLAYWRIGHT_CHROMIUM_PATH=… si no hay `playwright install`)
 */
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(REPO)

const { HOSTABLE_SECTIONS } = await import('../server/sections.js')
const { SECTION_FIELDS } = await import('../src/lib/sectionFields.js')

// localhost ↔ 127.0.0.1 entre puertos dispara los chequeos de red local de
// Chromium; en producción todo va por HTTPS público.
const LAUNCH_ARGS = [
  '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
]
const IGNORED_CONSOLE = [/favicon/i, /React DevTools/i, /Failed to load resource/i, /GL Driver/i]

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

async function waitUp(url, tries = 120) {
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

/** El campo de texto que se edita en cada sección (o el primero de una lista). */
function editTarget(sectionId) {
  const fields = SECTION_FIELDS[sectionId] || []
  const top = fields.find((f) => f.type === 'text' || f.type === 'textarea')
  if (top) return { field: top }
  const list = fields.find(
    (f) => f.type === 'list' && f.item?.some((s) => s.type === 'text' || s.type === 'textarea'),
  )
  if (!list) return null
  return { list, field: list.item.find((s) => s.type === 'text' || s.type === 'textarea') }
}

// --- build + servidores ----------------------------------------------------

console.log('Buildeando el embed…')
const built = spawnSync('npm', ['run', 'build:embed'], {
  cwd: REPO,
  stdio: 'ignore',
  shell: process.platform === 'win32',
})
if (built.status !== 0) {
  console.error('✖ npm run build:embed falló')
  process.exit(1)
}

const [apiPort, staticPort, vitePort] = await Promise.all([freePort(), freePort(), freePort()])
// localhost: el CSP del frame solo deja hablar por http con localhost (dev).
const API = `http://localhost:${apiPort}`
const BASE = `http://127.0.0.1:${vitePort}`
const FRAME_HOST = `http://127.0.0.1:${staticPort}` // el embed (otro origen)
const SITE = `http://localhost:${staticPort}` // el sitio del cliente

const children = [
  // La API del e2e del embed (store de archivo temporal, login dev, MP mock).
  spawn(process.execPath, ['embed/test/e2e-api.mjs'], {
    cwd: REPO,
    stdio: 'ignore',
    env: {
      ...process.env,
      E2E_API_PORT: String(apiPort),
      E2E_CLIENT_URL: BASE,
      E2E_EMBED_CDN_URL: `${FRAME_HOST}/embed-dist`,
    },
  }),
  spawn(process.execPath, ['embed/test/static-server.mjs', String(staticPort)], {
    cwd: REPO,
    stdio: 'ignore',
  }),
  spawn(
    process.execPath,
    [path.join(REPO, 'node_modules/vite/bin/vite.js'), '--port', String(vitePort), '--host', '127.0.0.1', '--strictPort'],
    { cwd: REPO, stdio: 'ignore', env: { ...process.env, VITE_API_PROXY_TARGET: API } },
  ),
]

const problems = []
let browser

async function shutdown() {
  await browser?.close().catch(() => {})
  for (const child of children) child.kill('SIGTERM')
}

try {
  await Promise.all([
    waitUp(`${API}/api/embed/loader`),
    waitUp(`${FRAME_HOST}/embed-dist/v1/loader.js`),
    waitUp(`${BASE}/lab`),
  ])

  browser = await chromium.launch({
    args: LAUNCH_ARGS,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  })
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    reducedMotion: 'reduce', // texto plano: sin SplitText
    locale: 'es-AR',
  })
  const login = await context.request.post(`${BASE}/api/auth/dev-login`, {
    data: { email: 'check-lab@test.com' },
  })
  if (!login.ok()) throw new Error(`dev-login: HTTP ${login.status()}`)

  const hostPage = (key) => `<!doctype html><html><head><meta charset="utf-8"></head>
    <body style="margin:0"><section style="height:200px">sitio del cliente</section>
    <script src="${FRAME_HOST}/embed-dist/v1/loader.js" data-scrolllab data-key="${key}" data-api="${API}" async></script>
    </body></html>`

  /** Texto del embed en el sitio del cliente (nueva página, config fresca). */
  async function siteText(key) {
    const page = await context.newPage()
    await page.route(`${SITE}/__host.html`, (route) =>
      route.fulfill({ contentType: 'text/html', body: hostPage(key) }),
    )
    await page.goto(`${SITE}/__host.html`)
    let text = ''
    for (let i = 0; i < 40 && !text; i++) {
      const frame = page.frames().find((f) => f.url().startsWith(FRAME_HOST))
      if (frame) {
        text = await frame
          .evaluate(() => document.getElementById('root')?.innerText || '')
          .catch(() => '')
      }
      if (!text) await sleep(250)
    }
    await page.close()
    return text
  }

  /** Texto de la vista previa (el frame real adentro del editor). */
  async function previewText(page) {
    const frame = page.frames().find((f) => f.url().startsWith(FRAME_HOST))
    if (!frame) return ''
    return frame.evaluate(() => document.getElementById('root')?.innerText || '').catch(() => '')
  }
  async function waitPreview(page, marker) {
    for (let i = 0; i < 40; i++) {
      if ((await previewText(page)).includes(marker)) return true
      await sleep(250)
    }
    return false
  }

  async function fieldInput(page, target, row = 0) {
    if (target.list) {
      const list = page.locator('div.block', {
        has: page.locator(`span:text-is("${target.list.label}")`),
      })
      await list.getByRole('button', { name: /Agregar/ }).click()
      return list
        .locator('label', { has: page.locator(`span:text-is("${target.field.label}")`) })
        .nth(row)
        .locator('input, textarea')
    }
    return page
      .locator('label', { has: page.locator(`span:text-is("${target.field.label}")`) })
      .first()
      .locator('input, textarea')
  }

  console.log(`Editando, previsualizando y publicando ${HOSTABLE_SECTIONS.length} secciones…`)
  let n = 0
  for (const sectionId of HOSTABLE_SECTIONS) {
    n += 1
    const target = editTarget(sectionId)
    if (!target) {
      problems.push(`${sectionId}: no tiene ningún campo de texto editable`)
      continue
    }
    const created = await context.request.post(`${BASE}/api/hosted`, { data: { sectionId } })
    if (!created.ok()) {
      problems.push(`${sectionId}: crear → HTTP ${created.status()}`)
      continue
    }
    const { instance } = await created.json()
    const page = await context.newPage()
    const fail = (msg) => problems.push(`${sectionId}: ${msg}`)
    try {
      await page.goto(`${BASE}/lab/${instance.id}`)
      const box = page.locator('[data-lab-preview]')
      await box.waitFor({ timeout: 15000 })

      const one = `LABUNO${n}X`
      const input = await fieldInput(page, target)
      await input.fill(one)
      if (!(await waitPreview(page, one))) {
        fail(`la vista previa no muestra "${target.field.label}" editado`)
        continue
      }

      await page.getByRole('button', { name: 'Publicar', exact: true }).click()
      await page.waitForURL(`${BASE}/lab`, { timeout: 10000 })
      if (!(await siteText(instance.key)).includes(one)) {
        fail('publicado, pero el sitio del cliente no muestra el cambio')
        continue
      }

      // Otro cambio, sin publicar: aviso en el editor y el sitio sigue igual.
      await page.goto(`${BASE}/lab/${instance.id}`)
      await box.waitFor({ timeout: 15000 })
      const two = `LABDOS${n}X`
      const again = target.list
        ? page
            .locator('label', { has: page.locator(`span:text-is("${target.field.label}")`) })
            .first()
            .locator('input, textarea')
        : await fieldInput(page, target)
      await again.fill(two)
      if (!(await waitPreview(page, two))) fail('la vista previa no toma el segundo cambio')
      if (!(await page.getByText('Hay cambios sin publicar').isVisible())) {
        fail('con cambios sin publicar el editor no avisa')
      }
      await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click()
      await page.getByText('Guardado', { exact: true }).waitFor({ timeout: 5000 })
      const live = await siteText(instance.key)
      if (live.includes(two) || !live.includes(one)) fail('un borrador salió en vivo')
    } catch (err) {
      fail(`excepción: ${err.message.split('\n')[0].slice(0, 160)}`)
    } finally {
      await page.close()
    }
  }
  console.log('  hecho')

  console.log('Ancho mobile, imagen relativa y consola…')
  {
    const created = await context.request.post(`${BASE}/api/hosted`, {
      data: { sectionId: 'atelier/StudioCards' },
    })
    const { instance } = await created.json()
    const page = await context.newPage()
    const consoleHits = []
    page.on('console', (m) => {
      if (m.type() !== 'error' && m.type() !== 'warning') return
      if (IGNORED_CONSOLE.some((re) => re.test(m.text()))) return
      consoleHits.push(m.text().slice(0, 160))
    })
    page.on('pageerror', (e) => consoleHits.push(`excepción: ${e.message.slice(0, 160)}`))
    await page.goto(`${BASE}/lab/${instance.id}`)
    await page.locator('[data-lab-preview]').waitFor({ timeout: 15000 })

    await page.getByRole('button', { name: 'Mobile', exact: true }).click()
    await sleep(600)
    const width = await page
      .locator('[data-lab-preview] iframe')
      .evaluate((el) => el.getBoundingClientRect().width)
    if (Math.round(width) !== 390) problems.push(`preview Mobile mide ${width}px, no 390`)
    const frame = page.frames().find((f) => f.url().startsWith(FRAME_HOST))
    const inner = frame ? await frame.evaluate(() => window.innerWidth) : 0
    if (inner !== 390) problems.push(`adentro del preview Mobile el viewport es ${inner}px`)

    const list = page.locator('div.block', { has: page.locator('span:text-is("Tarjetas")') })
    if (await list.count()) {
      await list.getByRole('button', { name: /Agregar/ }).click()
      const img = list.locator('input[placeholder^="https://"]').first()
      await img.fill('/foto.jpg')
      if (!(await page.getByText('en LAB la imagen va con la URL completa').isVisible())) {
        problems.push('una imagen con ruta relativa no avisa')
      }
      await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click()
      await sleep(800)
      const saved = await (await context.request.get(`${BASE}/api/hosted/${instance.id}`)).json()
      if (JSON.stringify(saved.instance.draftProps || {}).includes('/foto.jpg')) {
        problems.push('una imagen con ruta relativa se guardó en LAB')
      }
    } else {
      problems.push('StudioCards: no encontré la lista «Tarjetas»')
    }
    problems.push(...consoleHits.map((h) => `consola del editor: ${h}`))
    await page.close()
  }
  console.log('Tope del plan: Starter publica 5 y la 6ª avisa…')
  {
    // Otro usuario (otra cookie): Starter por el mock de Mercado Pago.
    const planCtx = await browser.newContext({
      viewport: { width: 1400, height: 900 },
      reducedMotion: 'reduce',
      locale: 'es-AR',
    })
    await planCtx.request.post(`${BASE}/api/auth/dev-login`, {
      data: { email: 'check-lab-starter@test.com' },
    })
    const sub = await (
      await planCtx.request.post(`${BASE}/api/subscriptions`, {
        data: { plan: 'hosted_starter', cycle: 'monthly' },
      })
    ).json()
    await planCtx.request.post(`${BASE}${sub.activateUrl}`)
    const ids = []
    for (let i = 0; i < 6; i++) {
      const res = await planCtx.request.post(`${BASE}/api/hosted`, {
        data: { sectionId: 'chapters/FooterCTA' },
      })
      ids.push((await res.json()).instance.id)
    }
    for (const id of ids.slice(0, 5)) {
      const res = await planCtx.request.put(`${BASE}/api/hosted/${id}`, { data: { publish: true } })
      if (!res.ok()) problems.push(`Starter: la publicación ${ids.indexOf(id) + 1} de 5 dio HTTP ${res.status()}`)
    }
    const page = await planCtx.newPage()
    await page.goto(`${BASE}/lab/${ids[5]}`)
    await page.locator('[data-lab-preview]').waitFor({ timeout: 15000 })
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    const alert = page.getByRole('alert').filter({ hasText: 'límite de tu plan' })
    try {
      await alert.waitFor({ timeout: 5000 })
      if (!(await alert.isVisible())) problems.push('Starter: el aviso del tope no se ve')
      const box = await alert.boundingBox()
      const vh = page.viewportSize().height
      if (!box || box.y < 0 || box.y > vh) {
        problems.push('Starter: el aviso del tope queda fuera de pantalla al tocar Publicar')
      }
    } catch {
      problems.push('Starter: publicar la 6ª no muestra el aviso del tope')
    }
    if (!page.url().endsWith(`/lab/${ids[5]}`)) problems.push('Starter: con el tope, el editor igual navegó')
    const sixth = await (await planCtx.request.get(`${BASE}/api/hosted/${ids[5]}`)).json()
    if (sixth.instance.status !== 'draft') problems.push('Starter: la 6ª quedó publicada')
    await planCtx.close()
  }
} catch (err) {
  problems.push(`excepción: ${err.message}`)
} finally {
  await shutdown()
}

if (problems.length) {
  console.error(`\n✖ ${problems.length} problema(s):\n`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('\n✓ LAB: se edita, se previsualiza con el embed real, se publica y se ve en el sitio')
process.exit(0)
