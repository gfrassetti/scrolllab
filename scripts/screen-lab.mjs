/**
 * screen:lab — ¿esta sección anda como widget de LAB? Screening en el iframe
 * real (loader → iframe cross-origin → frame), no lectura de código.
 *
 * Para cada sección (las que se pasan por argumento, o todas las de
 * HOSTABLE_SECTIONS), con movimiento completo, en un sitio ajeno con una
 * pantalla de texto arriba y otra abajo, a 1280 y a 390 px:
 *
 *  - scrollea el sitio de a poco, como alguien que lee;
 *  - anota el modo (FLOW / PIN), el alto del iframe contra el del contenido, el
 *    scroll horizontal y los errores del frame;
 *  - por cada texto de la sección, la opacidad máxima que llegó a tener
 *    mientras estaba en pantalla: un texto que nunca se ve es un reveal que en
 *    el iframe queda a medias (marca `texto-oculto`);
 *  - saca 4 capturas por ancho mientras la sección cruza la pantalla y las
 *    junta en una lámina: storage/lab-screen/<modelo>-<Sección>.png.
 *
 * La sección tiene que estar en HOSTABLE_SECTIONS y en embed/src/registry.js
 * (para probar candidatas, sumarlas a los dos mientras dura el screening).
 *
 * Uso: npm run screen:lab -- [modelo/Sección …] [--reduce] [--no-build]
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(REPO)
const OUT = path.join(REPO, 'storage', 'lab-screen')
fs.mkdirSync(OUT, { recursive: true })

const { HOSTABLE_SECTIONS } = await import('../server/sections.js')
const ids = process.argv.slice(2).filter((a) => !a.startsWith('-'))
// --reduce: con «reducir movimiento» (la versión calma de cada sección).
const REDUCE = process.argv.includes('--reduce')
const SECTIONS = ids.length ? ids : HOSTABLE_SECTIONS
const unknown = SECTIONS.filter((id) => !HOSTABLE_SECTIONS.includes(id))
if (unknown.length) {
  console.error(`✖ no están en HOSTABLE_SECTIONS: ${unknown.join(', ')}`)
  process.exit(1)
}

const LAUNCH_ARGS = [
  '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
]
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 780 },
]

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

if (!process.argv.includes('--no-build')) {
  console.log('Buildeando el embed…')
  const built = spawnSync('npm', ['run', 'build:embed'], { cwd: REPO, stdio: 'ignore', shell: process.platform === 'win32' })
  if (built.status !== 0) {
    console.error('✖ npm run build:embed falló')
    process.exit(1)
  }
}

const [apiPort, staticPort] = await Promise.all([freePort(), freePort()])
const API = `http://localhost:${apiPort}`
const FRAME_HOST = `http://127.0.0.1:${staticPort}`
const SITE = `http://localhost:${staticPort}`
const children = [
  spawn(process.execPath, ['embed/test/e2e-api.mjs'], {
    cwd: REPO,
    stdio: 'ignore',
    env: { ...process.env, E2E_API_PORT: String(apiPort), E2E_CLIENT_URL: SITE, E2E_EMBED_CDN_URL: `${FRAME_HOST}/embed-dist` },
  }),
  spawn(process.execPath, ['embed/test/static-server.mjs', String(staticPort)], { cwd: REPO, stdio: 'ignore' }),
]
const stop = () => children.forEach((c) => c.kill())
process.on('exit', stop)

await Promise.all([waitUp(`${API}/api/embed/loader`), waitUp(`${FRAME_HOST}/embed-dist/v1/loader.js`)])
const login = await fetch(`${API}/api/auth/dev-login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'screen-lab@test.com' }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
const headers = { 'content-type': 'application/json', cookie }

async function publish(sectionId) {
  const created = await fetch(`${API}/api/hosted`, { method: 'POST', headers, body: JSON.stringify({ sectionId }) })
  if (!created.ok) throw new Error(`crear ${sectionId}: ${created.status}`)
  const id = (await created.json()).instance.id
  const pub = await fetch(`${API}/api/hosted/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ draftProps: {}, domains: [], publish: true }),
  })
  if (!pub.ok) throw new Error(`publicar ${sectionId}: ${pub.status}`)
  return { id, key: (await pub.json()).instance.key }
}

const filler = (n) =>
  `<div style="min-height:100vh;padding:48px 24px;font:16px/1.5 system-ui;color:#333;background:#f3f1ec">${'<p>Texto del sitio del cliente.</p>'.repeat(n)}</div>`
const hostPage = (key) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0">${filler(4)}
<script src="${FRAME_HOST}/embed-dist/v1/loader.js" data-scrolllab data-key="${key}" data-api="${API}" async></script>
${filler(4)}</body></html>`

/** Una medición que tarda más de 8 s (el frame trabado) devuelve `fallback`. */
const capped = (promise, fallback) => Promise.race([promise, sleep(8000).then(() => fallback)])

/** En el frame: opacidad efectiva de cada texto visible en la pantalla del sitio. */
function sampleText([iframeTop, vh, seen]) {
  const effective = (el) => {
    let o = 1
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.visibility === 'hidden' || cs.display === 'none') return 0
      o *= Number(cs.opacity)
      if (/inset\([^)]*100%/.test(cs.clipPath)) return 0
    }
    return o
  }
  const out = seen || {}
  // Texto que se ve: no el CSS de un <style> de la sección ni un <script>.
  const leaves = [...document.querySelectorAll('#root *')].filter(
    (el) =>
      !/^(STYLE|SCRIPT|TEMPLATE|NOSCRIPT)$/.test(el.tagName) &&
      [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim().length > 1),
  )
  leaves.forEach((el, i) => {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const top = r.top + iframeTop
    const bottom = r.bottom + iframeTop
    if (bottom < 0 || top > vh) return
    const key = `${i}:${el.textContent.trim().slice(0, 40)}`
    out[key] = Math.max(out[key] || 0, effective(el))
  })
  // Los que nunca entraron a pantalla también cuentan (con 0).
  leaves.forEach((el, i) => {
    const key = `${i}:${el.textContent.trim().slice(0, 40)}`
    if (!(key in out)) out[key] = -1
  })
  return out
}

const browser = await chromium.launch({ args: LAUNCH_ARGS, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
const report = []
try {
  for (const sectionId of SECTIONS) {
    const started = Date.now()
    const { id, key } = await publish(sectionId)
    const row = { sectionId, marks: [], views: {} }
    const shots = {}
    for (const vp of VIEWPORTS) {
      if (Date.now() - started > 4 * 60 * 1000) {
        row.marks.push(`${vp.name}:sin-tiempo`)
        continue
      }
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: REDUCE ? 'reduce' : 'no-preference' })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/i.test(m.text()) && errors.push(m.text()))
      await page.route(`${SITE}/__host.html`, (route) => route.fulfill({ contentType: 'text/html', body: hostPage(key) }))
      await page.goto(`${SITE}/__host.html`)
      let frame = null
      for (let i = 0; i < 60 && !frame; i++) {
        const fr = page.frames().find((f) => f.url().includes(`127.0.0.1:${staticPort}`))
        if (fr && (await fr.evaluate(() => document.getElementById('root')?.childElementCount || 0).catch(() => 0))) frame = fr
        else await sleep(250)
      }
      if (!frame) {
        row.marks.push(`${vp.name}:no-monta`)
        await context.close()
        continue
      }
      await sleep(1200)
      const iframe = page.locator('iframe[data-scrolllab-frame]')
      const pinned = await page.evaluate(() => !!document.querySelector('[data-scrolllab-pin]'))
      const box = async () => page.evaluate(() => {
        const host = document.querySelector('[data-scrolllab-pin]') || document.querySelector('iframe[data-scrolllab-frame]')
        const r = host.getBoundingClientRect()
        return { top: r.top + scrollY, height: r.height }
      })
      const { top, height } = await box()
      const start = Math.max(0, top - vp.height)
      const end = top + height
      let seen = {}
      const shotAt = [0.25, 0.45, 0.65, 0.85].map((f) => start + vp.height * 0.5 + (end - start - vp.height * 0.5) * f)
      const views = []
      // Una sección muy alta no puede trabar el screening: a lo sumo ~160 pasos.
      const step = Math.max(80, Math.ceil((end - start) / 160))
      row.views[vp.name] = { range: Math.round(end - start) }
      const deadline = Date.now() + 120_000
      let stuck = false
      for (let y = start; y <= end + 40; y += step) {
        if (Date.now() > deadline) {
          stuck = true
          break
        }
        await page.evaluate((v) => window.scrollTo(0, v), y)
        await sleep(70)
        const iframeTop = await capped(iframe.evaluate((el) => el.getBoundingClientRect().top), 0)
        seen = await capped(frame.evaluate(sampleText, [iframeTop, vp.height, seen]).catch(() => seen), seen)
        if (shotAt.length && y >= shotAt[0]) {
          shotAt.shift()
          await sleep(450)
          views.push((await page.screenshot()).toString('base64'))
        }
      }
      await sleep(800)
      if (stuck) row.marks.push(`${vp.name}:trabada`)
      const m = await capped(frame.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        content: document.getElementById('root').getBoundingClientRect().height + (document.querySelector('.sl-badge-row')?.getBoundingClientRect().height || 0),
      })), { overflow: 0, content: 0 })
      const iframeH = await capped(iframe.evaluate((el) => el.getBoundingClientRect().height), 0)
      const hidden = Object.entries(seen).filter(([, o]) => o < 0.5).map(([k, o]) => `${k.split(':').slice(1).join(':')}${o < 0 ? ' (nunca en pantalla)' : ` (${o.toFixed(2)})`}`)
      row.views[vp.name] = { mode: pinned ? 'pin' : 'flow', iframeH: Math.round(iframeH), content: Math.round(m.content), hostRange: Math.round(height), overflow: m.overflow, hidden, errors }
      if (m.overflow > 2) row.marks.push(`${vp.name}:overflow ${m.overflow}px`)
      if (!pinned && iframeH - m.content > 40) row.marks.push(`${vp.name}:iframe-alto (${Math.round(iframeH)} vs ${Math.round(m.content)})`)
      if (iframeH < 80) row.marks.push(`${vp.name}:sin-alto`)
      if (hidden.length) row.marks.push(`${vp.name}:texto-oculto ×${hidden.length}`)
      if (errors.length) row.marks.push(`${vp.name}:errores ×${errors.length}`)
      shots[vp.name] = views
      await context.close()
    }
    await fetch(`${API}/api/hosted/${id}`, { method: 'DELETE', headers }).catch(() => {})

    // Lámina: una fila por ancho.
    const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 } })
    const rowHtml = (name, w) =>
      `<div style="display:flex;gap:8px;margin-bottom:8px">${(shots[name] || [])
        .map((b) => `<img src="data:image/png;base64,${b}" style="width:${w}px;border:1px solid #999">`)
        .join('')}</div>`
    const v = row.views
    await sheet.setContent(`<body style="margin:8px;background:#222;color:#eee;font:13px system-ui">
      <div>${sectionId} — ${Object.entries(v).map(([n, x]) => `${n}: ${x.mode} ${x.iframeH}px`).join(' · ')} — ${row.marks.join(' · ') || 'sin marcas'}</div>
      ${rowHtml('desktop', 390)}${rowHtml('mobile', 150)}</body>`)
    await sleep(300)
    await sheet.screenshot({ path: path.join(OUT, `${sectionId.replace('/', '-')}.png`), fullPage: true })
    await sheet.close()

    report.push(row)
    console.log(`${row.marks.length ? '·' : '✓'} ${sectionId.padEnd(28)} ${Object.entries(v).map(([n, x]) => `${n[0]}:${x.mode}/${x.iframeH}`).join(' ')}  ${row.marks.join(' · ')}`)
  }
} finally {
  await browser.close()
  stop()
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
console.log(`\nLáminas y report.json en ${path.relative(REPO, OUT)}`)
process.exit(0)
