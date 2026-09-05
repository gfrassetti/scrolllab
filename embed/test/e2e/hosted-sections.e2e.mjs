/**
 * E2E: cada sección de HOSTABLE_SECTIONS, embebida en un sitio ajeno.
 *
 * Para cada id de `server/sections.js#HOSTABLE_SECTIONS`:
 *  1. login dev → crear instancia → publicar con props (incluye un marcador de
 *     texto único + bg/fg).
 *  2. cargar una página anfitriona con el <script> del loader y la key real.
 *  3. verificar que el iframe cross-origin (:4179) montó, que el host NO lo puede
 *     leer, que #root renderió el marcador (⇒ son *estos* props, no un cache),
 *     que no hay scroll horizontal dentro del frame y que el puente de altura
 *     dimensionó el iframe.
 *
 * Además, un bloque responsive: FooterCTA / BigNumbers / TypeAccordion /
 * FooterAtrium a 375 / 768 / 1280 px sobre un host "plano" (sin padding hostil),
 * sin overflow horizontal y con el iframe dimensionado al contenido.
 *
 * Comparte los 3 procesos con embed.e2e.mjs (`serve()` reusa lo que ya escucha);
 * el runner los corre en serie (`--test-concurrency=1`).
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright'
import { HOSTABLE_SECTIONS } from '../../../server/sections.js'

const REPO = path.normalize(path.join(fileURLToPath(import.meta.url), '../../../..'))
const API = 'http://localhost:8787'
const HOST_URL = 'http://localhost:4178/embed/test/iframe-host.html'
const PLAIN_URL = 'http://localhost:4178/embed/test/iframe-host-plain.html'
const LAUNCH_ARGS = [
  '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
]

// Props + marcador por sección. Con `reducedMotion: 'reduce'` los componentes
// saltan SplitText y el texto queda plano → el marcador aparece literal en
// innerText. Un id nuevo en HOSTABLE_SECTIONS sin entrada acá hace fallar el test.
const CASES = {
  'chapters/FooterCTA': {
    props: { ctaWord: 'MKFTCA', email: 'e2e@t.co', legal: 'x', bg: '#101014', fg: '#f5f5f5' },
    marker: 'MKFTCA',
  },
  'nocturne/OutroCTA': {
    props: { ctaWord: 'MKOTRO', email: 'e2e@t.co', legal: 'x', bg: '#0e0e11', fg: '#ece9e2' },
    marker: 'MKOTRO',
  },
  'monolith/FooterBrutal': {
    props: { ctaWord: 'MKBRUT', email: 'e2e@t.co', legal: 'x', bg: '#2b3cff', fg: '#f2f2f2' },
    marker: 'MKBRUT',
  },
  'fizz/FooterSplash': {
    props: { ctaWord: 'MKSPLA', email: 'e2e@t.co', legal: 'x', bg: '#241352', fg: '#fff3e2' },
    marker: 'MKSPLA',
  },
  'velocity/FooterVelocity': {
    props: { line: 'MKVELO', legal: 'x', bg: '#0a1a12', fg: '#ece9e2' },
    marker: 'MKVELO',
  },
  'atelier/FooterAtelier': {
    props: { line: 'MKATEL', eyebrow: 'e', brand: 'B', legal: 'x', bg: '#0b0c10', fg: '#ffffff' },
    marker: 'MKATEL',
  },
  'atrium/FooterAtrium': {
    props: { mark: 'MKATRM', legal: 'x', bg: '#111111', fg: '#f4f1ea' },
    marker: 'MKATRM',
  },
  'chapters/BigNumbers': {
    props: { bg: '#0e1420', fg: '#eef2f7', stats: [{ value: '42', suffix: '+', label: 'MKBIGN' }] },
    marker: 'MKBIGN',
  },
  'atelier/KeyFacts': {
    props: { eyebrow: 'e', title: 'MKKEYF', bg: '#101820', fg: '#eef2f7', facts: [{ value: '9', label: 'x' }] },
    marker: 'MKKEYF',
  },
  'monolith/TypeAccordion': {
    props: {
      label: 'MKTYPA',
      unit: '01',
      total: '03',
      bg: '#0c0c0c',
      fg: '#e8e8e8',
      items: [{ title: 'MKTYPA', body: 'cuerpo' }],
    },
    marker: 'MKTYPA',
  },
  'chapters/VelocityMarquee': {
    props: { text: 'MKMARQ', bg: '#101014', fg: '#f5f5f5' },
    marker: 'MKMARQ',
  },
  'nocturne/DiagonalMarquee': {
    props: { textA: 'MKDIAG', textB: 'sub', bg: '#0e0e11', fg: '#ece9e2' },
    marker: 'MKDIAG',
  },
  'nocturne/SplitReveals': {
    props: {
      seq: '01',
      total: '03',
      label: 'x',
      bg: '#0e0e11',
      fg: '#ece9e2',
      beats: [{ kicker: 'MKSPLIT', title: 'MKSPLIT', body: 'cuerpo' }],
    },
    marker: 'MKSPLIT',
  },
  'nocturne/WorkIndex': {
    props: {
      seq: '01',
      total: '03',
      label: 'x',
      bg: '#0e0e11',
      fg: '#ece9e2',
      works: [{ index: '001', title: 'MKWORK', category: 'x', year: '2026' }],
    },
    marker: 'MKWORK',
  },
  'monolith/SkewScroller': {
    props: {
      unit: '01',
      total: '03',
      label: 'x',
      bg: '#cdcbc4',
      fg: '#101010',
      words: [{ word: 'MKSKEW' }],
    },
    marker: 'MKSKEW',
  },
  'monolith/ExhibitGrid': {
    props: {
      unit: '01',
      total: '03',
      label: 'x',
      bg: '#cdcbc4',
      fg: '#101010',
      exhibits: [{ code: 'MKEXHB', caption: 'x' }],
    },
    marker: 'MKEXHB',
  },
  'fizz/BubbleBenefits': {
    props: {
      eyebrow: 'x',
      title: 'MKBUBL',
      bg: '#241352',
      fg: '#fff3e2',
      benefits: [{ title: 'MKBUBL', body: 'x', color: '#ff3ea5' }],
    },
    marker: 'MKBUBL',
  },
  'atelier/AboutClarity': {
    props: { eyebrow: 'x', title: 'MKABTC', body: 'cuerpo', bg: '#0b0c10', fg: '#ffffff' },
    marker: 'MKABTC',
  },
}

// Responsive: las 18 HOSTABLE_SECTIONS, no solo una muestra — "cada una debe
// verse bien" en mobile/tablet/desktop.
const RESPONSIVE_SECTIONS = HOSTABLE_SECTIONS
// `FooterAtrium` usa `pt-[14svh]`: dentro del iframe FLOW el `svh` no tiene un
// viewport estable (retroalimenta con el propio alto que el puente le va
// asignando), así que el puente tarda más pasadas en converger. Se sigue
// probando sin overflow / con marcador / visible — solo se salta el chequeo
// estricto de "el iframe sigue al contenido en el primer settle".
const SKIP_HEIGHT_FOLLOW = new Set(['atrium/FooterAtrium'])
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 780 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
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

describe('embed e2e — todas las HOSTABLE_SECTIONS', () => {
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
      body: JSON.stringify({ email: 'sections-e2e@test.com' }),
    })
    assert.ok(login.ok, 'dev-login')
    const cookie = (login.headers.getSetCookie?.() || [])
      .map((c) => c.split(';')[0])
      .join('; ')
    assert.ok(cookie, 'cookie de sesión')
    headers = { 'content-type': 'application/json', cookie }

    browser = await chromium.launch({ args: LAUNCH_ARGS })
  })

  after(async () => {
    await browser?.close()
    for (const p of procs) p.kill('SIGTERM')
    await sleep(300)
    for (const p of procs) if (!p.killed) p.kill('SIGKILL')
  })

  async function seed(sectionId, props) {
    const created = await fetch(`${API}/api/hosted`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sectionId }),
    })
    assert.ok(created.ok, `crear ${sectionId} (${created.status})`)
    const id = (await created.json()).instance.id
    const pub = await fetch(`${API}/api/hosted/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ draftProps: props, domains: [], publish: true }),
    })
    assert.ok(pub.ok, `publicar ${sectionId} (${pub.status})`)
    const inst = (await pub.json()).instance
    assert.ok(inst.key, `key de ${sectionId}`)
    return { id, key: inst.key, published: inst.publishedProps }
  }
  async function unseed(id) {
    await fetch(`${API}/api/hosted/${id}`, { method: 'DELETE', headers }).catch(() => {})
  }

  async function openHost(key, { url = HOST_URL, viewport = { width: 1280, height: 900 } } = {}) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.route(url, async (route) => {
      const res = await route.fetch()
      const body = (await res.text()).replace('__E2E_KEY__', key)
      await route.fulfill({ response: res, body, contentType: 'text/html' })
    })
    await page.goto(url)
    return { context, page }
  }

  const frameOf = (page) => page.frames().find((f) => f.url().includes(':4179/'))
  async function waitFrame(page) {
    for (let i = 0; i < 40; i++) {
      const fr = frameOf(page)
      if (fr) {
        const txt = await fr
          .evaluate(() => document.getElementById('root')?.innerText || '')
          .catch(() => '')
        if (txt.trim()) return { frame: fr, text: txt }
      }
      await sleep(500)
    }
    throw new Error('el frame nunca renderió #root con texto')
  }

  // --- una por una: cada hosteable renderiza embebida con sus props ---
  for (const sectionId of HOSTABLE_SECTIONS) {
    it(`${sectionId} — se ve embebida en un sitio ajeno`, async () => {
      const c = CASES[sectionId]
      assert.ok(c, `falta un caso en CASES para '${sectionId}'`)

      const { id, key, published } = await seed(sectionId, c.props)
      // el server aceptó bg (hex) y lo persistió
      assert.equal(published.bg, c.props.bg, `${sectionId}: bg no persistió`)

      const { context, page } = await openHost(key)
      try {
        const { frame, text } = await waitFrame(page)
        assert.match(text, new RegExp(c.marker), `${sectionId}: no renderizó el marcador`)

        const iframe = page.locator('iframe[data-scrolllab-frame]')
        await iframe.waitFor({ state: 'attached', timeout: 15_000 })
        assert.equal(
          await iframe.evaluate((el) => el.contentDocument === null),
          true,
          `${sectionId}: el host puede leer el iframe`,
        )

        const oflow = await frame.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        assert.ok(oflow <= 2, `${sectionId}: scroll horizontal de ${oflow}px en el frame`)

        // bg aplicado por style inline (pisa el canvas del modelo)
        const bg = await frame.evaluate(() => {
          const el = document.querySelector('#root section, #root footer')
          return el ? getComputedStyle(el).backgroundColor : ''
        })
        assert.ok(/\d/.test(bg), `${sectionId}: sección sin background computado`)

        let h = 0
        for (let i = 0; i < 20; i++) {
          h = await iframe.evaluate((el) => el.getBoundingClientRect().height)
          if (h > 50) break
          await sleep(400)
        }
        assert.ok(h > 50, `${sectionId}: alto del iframe = ${h}`)
      } finally {
        await context.close()
        await unseed(id)
      }
    })
  }

  // --- responsive: mobile / tablet / desktop sobre host plano ---
  for (const sectionId of RESPONSIVE_SECTIONS) {
    for (const vp of VIEWPORTS) {
      it(`${sectionId} — ${vp.name} ${vp.width}px: sin overflow y visible`, async () => {
        const c = CASES[sectionId]
        const { id, key } = await seed(sectionId, c.props)
        const { context, page } = await openHost(key, {
          url: PLAIN_URL,
          viewport: { width: vp.width, height: vp.height },
        })
        try {
          const { frame, text } = await waitFrame(page)
          assert.match(text, new RegExp(c.marker), `${sectionId} @${vp.name}: no renderizó`)

          const m = await frame.evaluate(() => ({
            sw: document.documentElement.scrollWidth,
            cw: document.documentElement.clientWidth,
            rootH: document.getElementById('root').getBoundingClientRect().height,
          }))
          assert.ok(
            m.sw - m.cw <= 2,
            `${sectionId} @${vp.name}: overflow horizontal de ${m.sw - m.cw}px (cw=${m.cw})`,
          )
          assert.ok(m.cw <= vp.width + 1, `${sectionId} @${vp.name}: frame más ancho que el viewport`)
          assert.ok(m.rootH > 40, `${sectionId} @${vp.name}: #root muy bajo (${m.rootH}px)`)

          // el puente de altura converge en un par de frames tras el reveal
          const iframeLoc = page.locator('iframe[data-scrolllab-frame]')
          let iframeH = 0
          for (let i = 0; i < 15; i++) {
            iframeH = await iframeLoc.evaluate((el) => el.getBoundingClientRect().height)
            if (iframeH >= m.rootH - 8) break
            await sleep(300)
          }
          assert.ok(iframeH > 50, `${sectionId} @${vp.name}: iframe casi sin alto (${iframeH}px)`)
          if (!SKIP_HEIGHT_FOLLOW.has(sectionId)) {
            assert.ok(
              iframeH >= m.rootH * 0.85,
              `${sectionId} @${vp.name}: iframe (${iframeH}px) no sigue al contenido (${m.rootH}px)`,
            )
          }
        } finally {
          await context.close()
          await unseed(id)
        }
      })
    }
  }
})
