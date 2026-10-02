/**
 * E2E de LAB "en vivo": lo que el dueño hace en LAB se ve (o deja de verse) en
 * el sitio del cliente, y el embed se comporta como parte de su página.
 *
 *  - publicar refleja el cambio en la próxima carga; un borrador no sale en vivo
 *  - despublicar apaga el embed (y volver a publicar lo prende)
 *  - dominios permitidos: se ve en el autorizado (y su www), no en otro
 *  - links: #ancla / «Back to top» scrollean el sitio, un link del sitio navega
 *    en la misma pestaña, uno externo abre pestaña nueva, mailto no navega el
 *    iframe, y el frame no puede mandar al sitio a otro dominio
 *
 * Mismos 3 procesos que embed.e2e.mjs (`serve()` reusa lo que ya escucha). Los
 * dominios de cliente (cliente.test / otro.test) se resuelven a 127.0.0.1 con
 * `--host-resolver-rules`: el frame queda en otro origen, como en producción.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright'

const REPO = path.normalize(path.join(fileURLToPath(import.meta.url), '../../../..'))
const API = 'http://localhost:8787'
const FRAME_BASE = 'http://localhost:4179/embed-dist/v1'
const LAUNCH_ARGS = [
  '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
  '--host-resolver-rules=MAP cliente.test 127.0.0.1, MAP www.cliente.test 127.0.0.1, MAP otro.test 127.0.0.1',
]

async function isUp(url) {
  try {
    return (await fetch(url)).status < 500
  } catch {
    return false
  }
}
async function waitUp(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    if (await isUp(url)) return true
    await sleep(500)
  }
  throw new Error(`no levantó: ${url}`)
}
async function serve(args, probeUrl) {
  if (await isUp(probeUrl)) return null
  const child = spawn(process.execPath, args, { cwd: REPO, stdio: ['ignore', 'ignore', 'pipe'] })
  child.stderr.on('data', (b) => {
    const s = String(b)
    if (/EADDRINUSE|Error:/.test(s)) process.stderr.write(`[e2e srv] ${s}`)
  })
  return child
}

/** Página del cliente: bloque alto, un #servicios y el <script> del loader. */
function hostPage(key) {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">
    <section style="height:1400px;background:#eee">arriba</section>
    <section id="servicios" style="height:900px;background:#cde">servicios del cliente</section>
    <script src="${FRAME_BASE}/loader.js" data-scrolllab data-key="${key}" data-api="${API}" async></script>
  </body></html>`
}

describe('LAB en vivo — el sitio del cliente refleja LAB', () => {
  const procs = []
  let browser
  let headers

  before(async () => {
    for (const child of await Promise.all([
      serve(['embed/test/e2e-api.mjs'], `${API}/api/embed/loader`),
      serve(['embed/test/static-server.mjs', '4178'], 'http://localhost:4178/'),
      serve(['embed/test/static-server.mjs', '4179'], 'http://localhost:4179/'),
    ])) {
      if (child) procs.push(child)
    }
    await Promise.all([
      waitUp(`${API}/api/embed/loader`),
      waitUp('http://localhost:4178/'),
      waitUp('http://localhost:4179/'),
    ])
    const login = await fetch(`${API}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'lab-live-e2e@test.com' }),
    })
    assert.ok(login.ok, 'dev-login')
    const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
    headers = { 'content-type': 'application/json', cookie }
    browser = await chromium.launch({
      args: LAUNCH_ARGS,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    })
  })

  after(async () => {
    await browser?.close()
    for (const p of procs) p.kill('SIGTERM')
    await sleep(300)
    for (const p of procs) if (!p.killed) p.kill('SIGKILL')
  })

  async function create(sectionId = 'chapters/FooterCTA') {
    const res = await fetch(`${API}/api/hosted`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sectionId }),
    })
    assert.ok(res.ok, `crear (${res.status})`)
    return (await res.json()).instance
  }
  async function update(id, body) {
    const res = await fetch(`${API}/api/hosted/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    })
    assert.ok(res.ok, `PUT ${JSON.stringify(body).slice(0, 60)} (${res.status})`)
    return (await res.json()).instance
  }
  const remove = (id) =>
    fetch(`${API}/api/hosted/${id}`, { method: 'DELETE', headers }).catch(() => {})

  /** Abre la página del cliente en `origin` y espera a que el embed resuelva. */
  async function openSite(key, origin = 'http://cliente.test:4178', pagePath = '/servicios/index.html') {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce',
    })
    await context.route(`${origin}${pagePath}`, (route) =>
      route.fulfill({ contentType: 'text/html', body: hostPage(key) }),
    )
    const page = await context.newPage()
    const configStatus = []
    page.on('response', (r) => {
      if (r.url().includes('/config')) configStatus.push(r.status())
    })
    await page.goto(`${origin}${pagePath}`, { waitUntil: 'load' })
    for (let i = 0; i < 30 && configStatus.length === 0; i++) await sleep(250)
    await sleep(900)
    const frame = page.frames().find((f) => f.url().includes(':4179/'))
    const text = frame
      ? await frame.evaluate(() => document.getElementById('root')?.innerText || '').catch(() => '')
      : ''
    const height = await page
      .locator('iframe[data-scrolllab-frame]')
      .evaluate((el) => el.getBoundingClientRect().height)
      .catch(() => 0)
    return { context, page, frame, text, height, status: configStatus[0] }
  }

  it('publicar refleja el cambio en la próxima carga; el borrador no sale en vivo', async () => {
    const inst = await create()
    try {
      await update(inst.id, { draftProps: { ctaWord: 'VIVOUNO' }, publish: true })
      let site = await openSite(inst.key)
      assert.match(site.text, /VIVOUNO/)
      await site.context.close()

      // Guardar borrador: el sitio sigue mostrando lo publicado.
      await update(inst.id, { draftProps: { ctaWord: 'BORRADORDOS' } })
      site = await openSite(inst.key)
      assert.match(site.text, /VIVOUNO/)
      assert.doesNotMatch(site.text, /BORRADORDOS/)
      await site.context.close()

      // Publicar: el cambio aparece al recargar, sin tocar el snippet.
      await update(inst.id, { publish: true })
      site = await openSite(inst.key)
      assert.match(site.text, /BORRADORDOS/)
      await site.context.close()
    } finally {
      await remove(inst.id)
    }
  })

  it('despublicar apaga el embed; volver a publicar lo prende', async () => {
    const inst = await create()
    try {
      await update(inst.id, { draftProps: { ctaWord: 'PRENDIDO' }, publish: true })
      await update(inst.id, { unpublish: true })
      let site = await openSite(inst.key)
      assert.equal(site.status, 409)
      assert.equal(site.text.trim(), '')
      assert.ok(site.height < 2, `el iframe apagado ocupa ${site.height}px`)
      await site.context.close()

      await update(inst.id, { publish: true })
      site = await openSite(inst.key)
      assert.match(site.text, /PRENDIDO/)
      await site.context.close()
    } finally {
      await remove(inst.id)
    }
  })

  it('dominios permitidos: se ve en el autorizado (y su www), no en otro', async () => {
    const inst = await create()
    try {
      const pub = await update(inst.id, {
        draftProps: { ctaWord: 'DOMINIOOK' },
        domains: ['https://www.cliente.test/', 'localhost:5173'],
        publish: true,
      })
      assert.deepEqual(pub.domains, ['cliente.test', 'localhost'])

      for (const origin of ['http://cliente.test:4178', 'http://www.cliente.test:4178']) {
        const site = await openSite(inst.key, origin)
        assert.equal(site.status, 200, `${origin}: config`)
        assert.match(site.text, /DOMINIOOK/, `${origin}: no se ve`)
        await site.context.close()
      }
      const otro = await openSite(inst.key, 'http://otro.test:4178')
      assert.equal(otro.status, 403)
      assert.equal(otro.text.trim(), '')
      assert.ok(otro.height < 2, `en un dominio no autorizado ocupa ${otro.height}px`)
      await otro.context.close()
    } finally {
      await remove(inst.id)
    }
  })

  it('links: anclas y «Back to top» scrollean el sitio; del sitio navega; externo en pestaña nueva', async () => {
    const inst = await create()
    try {
      await update(inst.id, {
        publish: true,
        draftProps: {
          links: [
            { label: 'Servicios', href: '#servicios' },
            { label: 'Contacto', href: '/contacto' },
            { label: 'Afuera', href: 'http://otro.test:4178/afuera' },
            { label: 'Escribinos', href: 'mailto:hola@cliente.test' },
          ],
        },
      })
      const site = await openSite(inst.key)
      const { page, frame, context } = site
      try {
        await context.route(/otro\.test:4178\/afuera|cliente\.test:4178\/contacto/, (route) =>
          route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>destino</title>' }),
        )
        // El link relativo apunta al sitio del cliente, no al dominio del embed.
        const hrefs = await frame.evaluate(() =>
          [...document.querySelectorAll('nav a')].map((a) => a.getAttribute('href')),
        )
        assert.ok(hrefs.includes('http://cliente.test:4178/contacto'), hrefs.join(' · '))

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await sleep(400)
        await frame.locator('a', { hasText: 'Servicios' }).click()
        await page.waitForFunction(() => Math.abs(window.scrollY - 1400) < 4, null, { timeout: 4000 })

        await frame.locator('a', { hasText: /back to top/i }).click()
        await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 4000 })

        const navs = []
        page.on('framenavigated', (f) => {
          if (f !== page.mainFrame()) navs.push(f.url())
        })
        await frame.locator('a', { hasText: 'Escribinos' }).click()
        await sleep(500)
        assert.deepEqual(navs, [], 'mailto navegó el iframe')

        const [popup] = await Promise.all([
          context.waitForEvent('page', { timeout: 5000 }),
          frame.locator('a', { hasText: 'Afuera' }).click(),
        ])
        await popup.waitForLoadState('load')
        assert.equal(popup.url(), 'http://otro.test:4178/afuera')
        assert.equal(page.url(), 'http://cliente.test:4178/servicios/index.html')
        await popup.close()

        // Un frame comprometido no puede mandar al sitio a otro dominio.
        await frame.evaluate(() =>
          parent.postMessage({ type: 'scrolllab:navigate', href: 'http://otro.test:4178/afuera' }, '*'),
        )
        await sleep(500)
        assert.equal(page.url(), 'http://cliente.test:4178/servicios/index.html')

        await frame.locator('a', { hasText: 'Contacto' }).click()
        await page.waitForURL('http://cliente.test:4178/contacto', { timeout: 5000 })
      } finally {
        await context.close()
      }
    } finally {
      await remove(inst.id)
    }
  })
})
