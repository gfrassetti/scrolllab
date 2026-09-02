/**
 * E2E del embed con Chromium real (librería `playwright`, sin `@playwright/test`).
 * Corre con `npm run test:e2e` (buildea el embed antes).
 *
 * Levanta 3 procesos:
 *  - :8787  API real (store de archivo, MP mock) — `embed/test/e2e-api.mjs`
 *  - :4178  estático → hace de "sitio del cliente" con el <script> del loader
 *  - :4179  estático → sirve el frame en OTRO origen (aislamiento real)
 *
 * Verifica: se monta el iframe cross-origin, el host no puede leerlo, el frame
 * no puede tocar el DOM del host, la sección renderiza con los props
 * publicados, el CSS del host no se filtra y el puente de altura lo dimensiona.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright'

const REPO = path.normalize(
  path.join(fileURLToPath(import.meta.url), '../../../..'),
)
const HOST_URL = 'http://localhost:4178/embed/test/iframe-host.html'
const SELFBASE_URL = 'http://localhost:4178/embed/test/iframe-host-selfbase.html'
const PIN_URL = 'http://localhost:4178/embed/test/iframe-pin.html'
const CTA_TOKEN = 'EMBEDDEDOK'

// localhost→localhost entre puertos distintos dispara los chequeos de Local /
// Private Network Access de Chromium y el iframe queda en chrome-error://. En
// prod el frame se sirve por HTTPS desde el CDN, así que esto es solo para el
// harness local. No tocamos same-origin: las aserciones de aislamiento siguen
// valiendo.
const LAUNCH_ARGS = [
  '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
]

async function isUp(url) {
  try {
    const r = await fetch(url)
    return r.status < 500
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

/** Levanta el server salvo que ya haya algo escuchando en `probeUrl`. */
async function serve(args, probeUrl) {
  if (await isUp(probeUrl)) return null // reusar el que ya corre
  const child = spawn(process.execPath, args, {
    cwd: REPO,
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  child.stderr.on('data', (b) => {
    const s = String(b)
    if (/EADDRINUSE|Error:/.test(s)) process.stderr.write(`[e2e srv] ${s}`)
  })
  return child
}

describe('embed e2e (Chromium)', () => {
  const procs = []
  let browser
  let hostedKey = ''
  let pinKey = ''

  before(async () => {
    for (const child of await Promise.all([
      serve(['embed/test/e2e-api.mjs'], 'http://localhost:8787/api/embed/loader'),
      serve(['embed/test/static-server.mjs', '4178'], 'http://localhost:4178/'),
      serve(['embed/test/static-server.mjs', '4179'], 'http://localhost:4179/'),
    ])) {
      if (child) procs.push(child)
    }

    await Promise.all([
      waitUp('http://localhost:8787/api/embed/loader'),
      waitUp('http://localhost:4178/'),
      waitUp('http://localhost:4179/'),
    ])

    // Seed: login dev → crear → publicar. Cookie de sesión a mano.
    const api = 'http://localhost:8787'
    const login = await fetch(`${api}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'embed-e2e@test.com' }),
    })
    assert.ok(login.ok, 'dev-login')
    const cookie = (login.headers.getSetCookie?.() || [])
      .map((c) => c.split(';')[0])
      .join('; ')
    assert.ok(cookie, 'cookie de sesión')

    const headers = { 'content-type': 'application/json', cookie }
    const created = await fetch(`${api}/api/hosted`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sectionId: 'chapters/FooterCTA' }),
    })
    assert.ok(created.ok, 'crear instancia')
    const id = (await created.json()).instance.id

    const published = await fetch(`${api}/api/hosted/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        draftProps: { ctaWord: CTA_TOKEN, email: 'e2e@test.com', legal: 'e2e' },
        domains: [],
        publish: true,
      }),
    })
    assert.ok(published.ok, 'publicar')
    hostedKey = (await published.json()).instance.key
    assert.ok(hostedKey, 'key pública')

    // Segunda instancia, sección con pin (Horizontal Panels) para el modo PIN.
    const pinCreated = await fetch(`${api}/api/hosted`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sectionId: 'chapters/HorizontalPanels' }),
    })
    assert.ok(pinCreated.ok, 'crear instancia pin')
    const pinId = (await pinCreated.json()).instance.id
    const pinPub = await fetch(`${api}/api/hosted/${pinId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        draftProps: { variant: 'type', heading: 'PIN E2E' },
        domains: [],
        publish: true,
      }),
    })
    assert.ok(pinPub.ok, 'publicar pin')
    pinKey = (await pinPub.json()).instance.key
    assert.ok(pinKey, 'key pin')

    browser = await chromium.launch({ args: LAUNCH_ARGS })
  })

  after(async () => {
    await browser?.close()
    for (const p of procs) p.kill('SIGTERM')
    await sleep(300)
    for (const p of procs) if (!p.killed) p.kill('SIGKILL')
  })

  async function openHost(url = HOST_URL, key = hostedKey, opts = {}) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      // Las secciones scrolljack (PIN) se degradan a stack con reduced motion,
      // así que el test de PIN lo desactiva; el resto lo deja para tener texto
      // determinista.
      reducedMotion: opts.motion ? 'no-preference' : 'reduce',
    })
    const page = await context.newPage()
    // La anfitriona trae data-key="__E2E_KEY__" — le metemos la real.
    await page.route(url, async (route) => {
      const res = await route.fetch()
      const body = (await res.text()).replace('__E2E_KEY__', key)
      await route.fulfill({ response: res, body, contentType: 'text/html' })
    })
    await page.goto(url)
    return { context, page }
  }

  const frameOf = (page) => page.frames().find((f) => f.url().includes(':4179/'))

  async function waitFrameRoot(page) {
    for (let i = 0; i < 40; i++) {
      const fr = frameOf(page)
      if (fr) {
        const txt = await fr
          .evaluate(() => document.getElementById('root')?.innerText || '')
          .catch(() => '')
        if (txt) return { frame: fr, text: txt }
      }
      await sleep(500)
    }
    throw new Error('el frame nunca renderió #root')
  }

  it('monta un iframe cross-origin que el host no puede leer', async () => {
    const { context, page } = await openHost()
    try {
      const iframe = page.locator('iframe[data-scrolllab-frame]')
      await iframe.waitFor({ state: 'attached', timeout: 15_000 })
      assert.match((await iframe.getAttribute('sandbox')) || '', /allow-scripts/)
      assert.equal(
        await iframe.evaluate((el) => el.contentDocument === null),
        true,
        'contentDocument bloqueado por el navegador',
      )
    } finally {
      await context.close()
    }
  })

  it('renderiza la sección con los props publicados', async () => {
    const { context, page } = await openHost()
    try {
      const { text } = await waitFrameRoot(page)
      assert.match(text, /EMBEDDEDOK/)
    } finally {
      await context.close()
    }
  })

  it('el frame no puede alcanzar el documento del host', async () => {
    const { context, page } = await openHost()
    try {
      const { frame } = await waitFrameRoot(page)

      const parentDom = await frame.evaluate(() => {
        try {
          return window.parent.document.body.innerHTML.length
        } catch {
          return 'blocked'
        }
      })
      assert.equal(parentDom, 'blocked')

      const secret = await frame.evaluate(() => {
        try {
          return (
            window.top.document.getElementById('secret')?.dataset.token ?? null
          )
        } catch {
          return 'blocked'
        }
      })
      assert.equal(secret, 'blocked')
    } finally {
      await context.close()
    }
  })

  it('el CSS del host no se filtra al frame', async () => {
    const { context, page } = await openHost()
    try {
      const { frame } = await waitFrameRoot(page)
      // El host fuerza `body { font-family: Georgia, serif }`. El frame tiene
      // sus propios tokens: no hereda nada.
      const font = await frame.evaluate(
        () => getComputedStyle(document.body).fontFamily,
      )
      assert.ok(
        !font.toLowerCase().includes('georgia'),
        `heredó la fuente del host: ${font}`,
      )
    } finally {
      await context.close()
    }
  })

  it('sin data-frame: deriva la base del frame del src del loader', async () => {
    const { context, page } = await openHost(SELFBASE_URL)
    try {
      const iframe = page.locator('iframe[data-scrolllab-frame]')
      await iframe.waitFor({ state: 'attached', timeout: 15_000 })
      // el loader vive en :4179 → el frame también, cross-origin del host (:4178)
      const src = await iframe.getAttribute('src')
      assert.match(src, /^http:\/\/localhost:4179\/embed-dist\/v1\/frame\/index\.html#/)
      const { frame, text } = await waitFrameRoot(page)
      assert.match(text, /EMBEDDEDOK/)
      assert.equal(
        await frame.evaluate(() => {
          try {
            return window.parent.document.body.innerHTML.length
          } catch {
            return 'blocked'
          }
        }),
        'blocked',
      )
    } finally {
      await context.close()
    }
  })

  it('el puente de altura dimensiona el iframe', async () => {
    const { context, page } = await openHost()
    try {
      const iframe = page.locator('iframe[data-scrolllab-frame]')
      await iframe.waitFor({ state: 'attached', timeout: 15_000 })
      let h = 0
      for (let i = 0; i < 30; i++) {
        h = await iframe.evaluate((el) => el.getBoundingClientRect().height)
        if (h > 50) break
        await sleep(500)
      }
      assert.ok(h > 50, `alto del iframe = ${h}`)
    } finally {
      await context.close()
    }
  })

  it('modo PIN: la sección con pin entra en sticky sobre un spacer', async () => {
    const { context, page } = await openHost(PIN_URL, pinKey, { motion: true })
    try {
      // El loader crea <div data-scrolllab-pin> cuando el frame le manda
      // scrolllab:pinlength (PIN mode enganchado).
      const wrap = page.locator('div[data-scrolllab-pin]')
      await wrap.waitFor({ state: 'attached', timeout: 20_000 })

      const wrapH = await wrap.evaluate((el) => el.getBoundingClientRect().height)
      assert.ok(wrapH > 900, `el spacer del pin debería pasar el viewport, fue ${wrapH}`)

      const pos = await page
        .locator('iframe[data-scrolllab-frame]')
        .evaluate((el) => getComputedStyle(el).position)
      assert.ok(/sticky/.test(pos), `iframe position = ${pos}`)

      // scrollear el host y ver que el iframe sigue pegado arriba (sticky).
      await page.mouse.wheel(0, 600)
      await sleep(400)
      const top = await page
        .locator('iframe[data-scrolllab-frame]')
        .evaluate((el) => el.getBoundingClientRect().top)
      assert.ok(Math.abs(top) < 4, `iframe top tras scroll = ${top} (debería seguir ~0)`)
    } finally {
      await context.close()
    }
  })
})
