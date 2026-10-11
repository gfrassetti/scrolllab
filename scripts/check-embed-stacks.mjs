/**
 * check:embed-stacks — el embed de LAB instalado como lo instala un cliente,
 * en los cuatro stacks que documentamos: HTML (el <script> del snippet),
 * React (Vite, con StrictMode), Next (App Router, la página es Server
 * Component) y Vue (Vite).
 *
 * El paquete `@scrolllab/embed` sale de packages/embed tal como lo publicaría
 * npm (package.json + `files`), no del registro: así se prueba ANTES de
 * publicarlo. Los proyectos viven en storage/embed-stacks/ y sus dependencias
 * se instalan una vez (se reinstalan solo si cambia su package.json).
 *
 * El paquete y el snippet apuntan a producción (embed.scrolllab.com.ar y
 * www.scrolllab.com.ar): Chromium redirige esos dominios al embed recién
 * buildeado y a la API de e2e local. Nada sale a internet salvo el `npm
 * install` de React / Vue / Next / Vite la primera vez.
 *
 * Por stack: cada widget monta UN iframe (StrictMode monta dos veces: el
 * cleanup tiene que andar), muestra el texto editado y tiene alto; el pack
 * monta un iframe por widget; sin errores de consola (una hidratación rota de
 * Next sale acá). En React y Vue, desmontar saca los iframes y volver a montar
 * los repone.
 *
 * Uso: npm run check:embed-stacks [-- html react next vue] [--no-build]
 */
import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(REPO)

const args = process.argv.slice(2)
const ALL_STACKS = ['html', 'react', 'next', 'vue']
const STACKS = args.filter((a) => ALL_STACKS.includes(a))
const stacks = STACKS.length ? STACKS : ALL_STACKS
const WORK = path.join(REPO, 'storage', 'embed-stacks')
const PKG_DIR = path.join(REPO, 'packages', 'embed')

const { HOSTABLE_SECTIONS } = await import('../server/sections.js')
const { SECTION_FIELDS } = await import('../src/lib/sectionFields.js')

// localhost ↔ 127.0.0.1 entre puertos dispara los chequeos de red local de
// Chromium; en producción todo va por HTTPS público.
const LAUNCH_ARGS = [
  '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
]
const IGNORED_CONSOLE = [/favicon/i, /React DevTools/i, /Download the Vue Devtools/i, /GL Driver/i, /Failed to load resource/i]
const PROD_LOADER = 'https://embed.scrolllab.com.ar'
const PROD_API = 'https://www.scrolllab.com.ar'

// Tres widgets de modelos distintos (FLOW, reveals con el scroller del sitio,
// tipografía grande) y un pack con dos de ellos.
const WANTED = ['chapters/FooterCTA', 'nocturne/SplitReveals', 'atrium/ManifestoType']

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

async function waitUp(url, tries = 240) {
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
function editProps(sectionId, marker) {
  const fields = SECTION_FIELDS[sectionId] || []
  const top = fields.find((f) => f.type === 'text' || f.type === 'textarea')
  if (top) return { [top.key]: marker }
  const list = fields.find((f) => f.type === 'list' && f.item?.some((s) => s.type === 'text'))
  if (!list) return null
  return { [list.key]: [{ [list.item.find((s) => s.type === 'text').key]: marker }] }
}

const write = (file, body) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, body)
}

/**
 * Lo que npm instalaría del paquete: package.json, README/LICENSE y `files`.
 * Si algo de `files` no existe, el paquete publicado saldría roto.
 */
function installEmbedPackage(projectDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(PKG_DIR, 'package.json'), 'utf8'))
  const dest = path.join(projectDir, 'node_modules', '@scrolllab', 'embed')
  fs.rmSync(dest, { recursive: true, force: true })
  for (const rel of ['package.json', 'README.md', 'LICENSE', ...(pkg.files || [])]) {
    const from = path.join(PKG_DIR, rel)
    if (!fs.existsSync(from)) {
      if (pkg.files?.includes(rel)) throw new Error(`packages/embed: «${rel}» está en files pero no existe`)
      continue
    }
    fs.cpSync(from, path.join(dest, rel), { recursive: true })
  }
  return pkg.version
}

/** npm install solo si cambió el package.json del proyecto (o nunca se instaló). */
function ensureDeps(projectDir, label) {
  const pkgJson = fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')
  const stamp = crypto.createHash('sha1').update(pkgJson).digest('hex')
  const stampFile = path.join(projectDir, 'node_modules', '.deps-stamp')
  if (fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') === stamp) return
  console.log(`  ${label}: npm install (una vez)…`)
  const res = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], {
    cwd: projectDir,
    stdio: 'inherit',
    shell: true,
  })
  if (res.status !== 0) throw new Error(`${label}: npm install falló`)
  fs.writeFileSync(stampFile, stamp)
}

// --- proyectos --------------------------------------------------------------

const H2 = 'font:600 14px system-ui;margin:24px 16px 8px'

function writeProjects(slots) {
  // HTML: el snippet crudo, como lo copia el cliente.
  write(
    path.join(WORK, 'html', 'index.html'),
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>embed html</title></head>
<body style="margin:0;background:#fff">
${slots
  .map(
    (s) => `<h2 style="${H2}">${s.label}</h2>
<div class="qa-slot" data-slot="${s.id}">
<script src="${PROD_LOADER}/v1/loader.js" data-scrolllab ${s.pack ? `data-pack="${s.pack}"` : `data-key="${s.key}"`} data-api="${PROD_API}" async></script>
</div>`,
  )
  .join('\n')}
</body></html>
`,
  )

  const SLOTS = JSON.stringify(slots.map(({ id, label, key, pack }) => ({ id, label, key, pack })))

  // React (Vite) con StrictMode: monta, desmonta y vuelve a montar.
  write(
    path.join(WORK, 'react', 'package.json'),
    JSON.stringify(
      {
        name: 'embed-react',
        private: true,
        type: 'module',
        dependencies: { react: '19.1.0', 'react-dom': '19.1.0' },
        devDependencies: { vite: '6.3.5', '@vitejs/plugin-react': '4.5.0' },
      },
      null,
      2,
    ),
  )
  write(path.join(WORK, 'react', 'vite.config.js'), `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })\n`)
  write(
    path.join(WORK, 'react', 'index.html'),
    `<!doctype html><html><head><meta charset="utf-8"><title>embed react</title></head><body style="margin:0"><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>\n`,
  )
  write(
    path.join(WORK, 'react', 'main.jsx'),
    `import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ScrollLabEmbed from '@scrolllab/embed'
const SLOTS = ${SLOTS}
function App() {
  const [on, setOn] = useState(true)
  return (
    <>
      <button id="qa-toggle" onClick={() => setOn((v) => !v)}>toggle</button>
      {on && SLOTS.map((s) => (
        <section key={s.id} className="qa-slot" data-slot={s.id}>
          <h2 style={{ font: '600 14px system-ui', margin: '24px 16px 8px' }}>{s.label}</h2>
          {s.pack ? <ScrollLabEmbed packKey={s.pack} /> : <ScrollLabEmbed embedKey={s.key} />}
        </section>
      ))}
    </>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
`,
  )

  // Vue (Vite).
  write(
    path.join(WORK, 'vue', 'package.json'),
    JSON.stringify(
      {
        name: 'embed-vue',
        private: true,
        type: 'module',
        dependencies: { vue: '3.5.16' },
        devDependencies: { vite: '6.3.5', '@vitejs/plugin-vue': '5.2.4' },
      },
      null,
      2,
    ),
  )
  write(path.join(WORK, 'vue', 'vite.config.js'), `import { defineConfig } from 'vite'\nimport vue from '@vitejs/plugin-vue'\nexport default defineConfig({ plugins: [vue()] })\n`)
  write(
    path.join(WORK, 'vue', 'index.html'),
    `<!doctype html><html><head><meta charset="utf-8"><title>embed vue</title></head><body style="margin:0"><div id="app"></div><script type="module" src="/main.js"></script></body></html>\n`,
  )
  write(path.join(WORK, 'vue', 'main.js'), `import { createApp } from 'vue'\nimport App from './App.vue'\ncreateApp(App).mount('#app')\n`)
  write(
    path.join(WORK, 'vue', 'App.vue'),
    `<script setup>
import { ref } from 'vue'
import ScrollLabEmbed from '@scrolllab/embed/vue'
const SLOTS = ${SLOTS}
const on = ref(true)
</script>

<template>
  <button id="qa-toggle" @click="on = !on">toggle</button>
  <template v-if="on">
    <section v-for="s in SLOTS" :key="s.id" class="qa-slot" :data-slot="s.id">
      <h2 style="font: 600 14px system-ui; margin: 24px 16px 8px">{{ s.label }}</h2>
      <ScrollLabEmbed v-if="s.pack" :pack-key="s.pack" />
      <ScrollLabEmbed v-else :embed-key="s.key" />
    </section>
  </template>
</template>
`,
  )

  // Next (App Router): la página es Server Component y usa el tag tal cual.
  write(
    path.join(WORK, 'next', 'package.json'),
    JSON.stringify(
      {
        name: 'embed-next',
        private: true,
        dependencies: { next: '15.3.3', react: '19.1.0', 'react-dom': '19.1.0' },
      },
      null,
      2,
    ),
  )
  write(
    path.join(WORK, 'next', 'app', 'layout.js'),
    `export const metadata = { title: 'embed next' }\nexport default function RootLayout({ children }) {\n  return <html lang="en"><body style={{ margin: 0 }}>{children}</body></html>\n}\n`,
  )
  write(
    path.join(WORK, 'next', 'app', 'page.js'),
    `import ScrollLabEmbed from '@scrolllab/embed'
const SLOTS = ${SLOTS}
export default function Page() {
  return SLOTS.map((s) => (
    <section key={s.id} className="qa-slot" data-slot={s.id}>
      <h2 style={{ font: '600 14px system-ui', margin: '24px 16px 8px' }}>{s.label}</h2>
      {s.pack ? <ScrollLabEmbed packKey={s.pack} /> : <ScrollLabEmbed embedKey={s.key} />}
    </section>
  ))
}
`,
  )
  write(path.join(WORK, 'next', 'next.config.mjs'), `export default { devIndicators: false }\n`)
}

// --- servidores ---------------------------------------------------------------

if (!args.includes('--no-build')) {
  console.log('Buildeando el embed…')
  const built = spawnSync('npm', ['run', 'build:embed'], { cwd: REPO, stdio: 'ignore', shell: true })
  if (built.status !== 0) {
    console.error('✖ npm run build:embed falló')
    process.exit(1)
  }
}

const [apiPort, staticPort] = await Promise.all([freePort(), freePort()])
const API = `http://localhost:${apiPort}`
const STATIC = `http://127.0.0.1:${staticPort}`

const children = [
  spawn(process.execPath, ['embed/test/e2e-api.mjs'], {
    cwd: REPO,
    stdio: 'ignore',
    env: {
      ...process.env,
      E2E_API_PORT: String(apiPort),
      E2E_CLIENT_URL: 'http://localhost:5173',
      E2E_EMBED_CDN_URL: `${PROD_LOADER}`,
    },
  }),
  spawn(process.execPath, ['embed/test/static-server.mjs', String(staticPort)], { cwd: REPO, stdio: 'ignore' }),
]
const problems = []
let browser
let htmlServer

async function shutdown() {
  await browser?.close().catch(() => {})
  htmlServer?.close()
  for (const child of children) {
    // npm / next en Windows corren detrás de un shell: matar el árbol entero.
    if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else child.kill('SIGTERM')
  }
}

try {
  await Promise.all([waitUp(`${API}/api/embed/loader`), waitUp(`${STATIC}/embed-dist/v1/loader.js`)])

  // --- widgets publicados (store de archivo temporal del e2e) -----------------
  const jar = []
  const call = async (method, url, body) => {
    const res = await fetch(`${API}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', cookie: jar.join('; ') },
      body: body ? JSON.stringify(body) : undefined,
    })
    const set = res.headers.getSetCookie?.() || []
    for (const c of set) jar.push(c.split(';')[0])
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`${method} ${url} → HTTP ${res.status} ${data.error || ''}`)
    return data
  }
  await call('POST', '/api/auth/dev-login', { email: 'embed-stacks@test.com' })
  // Los packs son de los planes pagos: alta con el mock de MP.
  const sub = await call('POST', '/api/subscriptions', { plan: 'hosted_studio', cycle: 'monthly' })
  await call('POST', sub.activateUrl)

  const hostable = new Set(HOSTABLE_SECTIONS.map((s) => (typeof s === 'string' ? s : s.id)))
  const sections = WANTED.filter((id) => hostable.has(id) && editProps(id, 'x'))
  if (sections.length < 2) throw new Error(`faltan secciones hosteables: ${WANTED.join(', ')}`)
  const widgets = []
  for (const [i, sectionId] of sections.entries()) {
    const marker = `STACKOK${i + 1}X`
    const { instance } = await call('POST', '/api/hosted', { sectionId })
    await call('PUT', `/api/hosted/${instance.id}`, { draftProps: editProps(sectionId, marker), publish: true })
    widgets.push({ id: `w${i + 1}`, label: sectionId, key: instance.key, instanceId: instance.id, markers: [marker] })
  }
  const { pack } = await call('POST', '/api/hosted-packs', {
    name: 'stacks',
    items: widgets.slice(0, 2).map((w) => w.instanceId),
  })
  const slots = [
    ...widgets,
    { id: 'pack', label: `pack (${widgets.slice(0, 2).map((w) => w.label).join(' + ')})`, pack: pack.key, markers: widgets.slice(0, 2).flatMap((w) => w.markers) },
  ]

  // --- proyectos e instalación -------------------------------------------------
  writeProjects(slots)
  let version = ''
  for (const stack of stacks.filter((s) => s !== 'html')) {
    const dir = path.join(WORK, stack)
    ensureDeps(dir, stack)
    version = installEmbedPackage(dir)
  }

  browser = await chromium.launch({ args: LAUNCH_ARGS, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })

  /** Un contexto donde los dominios de producción van a los servidores locales. */
  async function newContext() {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'es-AR' })
    await context.route(`${PROD_LOADER}/**`, async (route) => {
      const u = new URL(route.request().url())
      const response = await route.fetch({ url: `${STATIC}/embed-dist${u.pathname}${u.search}` })
      await route.fulfill({ response })
    })
    await context.route(`${PROD_API}/**`, async (route) => {
      const u = new URL(route.request().url())
      const response = await route.fetch({ url: `${API}${u.pathname}${u.search}` })
      await route.fulfill({ response })
    })
    return context
  }

  /** Iframes del embed dentro de un slot y el texto de cada uno. */
  async function readSlot(page, slotId) {
    const slot = page.locator(`.qa-slot[data-slot="${slotId}"]`)
    const frames = slot.locator('iframe')
    const count = await frames.count()
    const out = []
    for (let i = 0; i < count; i++) {
      const handle = await frames.nth(i).elementHandle()
      const frame = await handle?.contentFrame()
      const text = frame
        ? await frame.evaluate(() => document.getElementById('root')?.textContent || '').catch(() => '')
        : ''
      const box = await handle?.boundingBox()
      out.push({ text: text.replace(/\s+/g, ''), height: Math.round(box?.height || 0) })
    }
    return out
  }

  /** Espera a que cada slot tenga sus iframes con el texto editado. */
  async function checkSlots(page, stack, phase) {
    for (const slot of slots) {
      const want = slot.pack ? slot.markers.length : 1
      let frames = []
      for (let i = 0; i < 80; i++) {
        await page.locator(`.qa-slot[data-slot="${slot.id}"]`).scrollIntoViewIfNeeded().catch(() => {})
        frames = await readSlot(page, slot.id)
        const ready =
          frames.length >= want &&
          slot.markers.every((m) => frames.some((f) => f.text.includes(m))) &&
          frames.every((f) => f.height > 60)
        if (ready) break
        await sleep(250)
      }
      const where = `${stack}${phase ? ` (${phase})` : ''} · ${slot.label}`
      if (frames.length !== want) problems.push(`${where}: ${frames.length} iframes, esperaba ${want}`)
      for (const m of slot.markers) {
        if (!frames.some((f) => f.text.includes(m))) problems.push(`${where}: no muestra el texto editado (${m})`)
      }
      for (const f of frames) if (f.height <= 60) problems.push(`${where}: iframe sin alto (${f.height}px)`)
    }
  }

  // --- cada stack ---------------------------------------------------------------
  for (const stack of stacks) {
    console.log(`${stack}…`)
    let url
    let server = null
    if (stack === 'html') {
      const port = await freePort()
      const page = fs.readFileSync(path.join(WORK, 'html', 'index.html'))
      htmlServer = http.createServer((_req, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page))
      await new Promise((resolve) => htmlServer.listen(port, '127.0.0.1', resolve))
      url = `http://localhost:${port}/`
    } else {
      const port = await freePort()
      const dir = path.join(WORK, stack)
      const cmd =
        stack === 'next'
          ? ['next', 'dev', '-p', String(port)]
          : ['vite', '--port', String(port), '--strictPort', '--host', 'localhost']
      server = spawn('npx', cmd, { cwd: dir, stdio: 'ignore', shell: true })
      children.push(server)
      url = `http://localhost:${port}/`
      await waitUp(url)
    }

    const context = await newContext()
    const page = await context.newPage()
    const errors = []
    page.on('console', (m) => {
      if (m.type() === 'error' && !IGNORED_CONSOLE.some((re) => re.test(m.text()))) errors.push(m.text().slice(0, 200))
    })
    page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`))
    await page.goto(url, { waitUntil: 'load', timeout: 180000 })
    await page.waitForSelector('.qa-slot', { timeout: 180000 })
    await checkSlots(page, stack, '')

    // Desmontar saca todo lo que montó el loader; volver a montar lo repone.
    if (stack === 'react' || stack === 'vue') {
      await page.click('#qa-toggle')
      await sleep(400)
      const left = await page.locator('iframe').count()
      if (left) problems.push(`${stack}: al desmontar quedaron ${left} iframes`)
      await page.click('#qa-toggle')
      await checkSlots(page, stack, 'remontado')
    }

    for (const e of [...new Set(errors)]) problems.push(`${stack}: consola: ${e}`)
    // Captura de toda la página, para revisar a ojo (storage/embed-stacks/<stack>.png).
    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(300)
    await page.screenshot({ path: path.join(WORK, `${stack}.png`), fullPage: true }).catch(() => {})
    await context.close()
    if (server) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
      else server.kill('SIGTERM')
    }
    if (stack === 'html') {
      htmlServer.close()
      htmlServer = null
    }
  }
  console.log(`  paquete @scrolllab/embed ${version || '(sin instalar)'} desde packages/embed`)
} catch (err) {
  problems.push(`excepción: ${err.message}`)
} finally {
  await shutdown()
}

if (problems.length) {
  console.error(`\n✖ ${problems.length} problema(s):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`\n✓ El embed monta, muestra lo editado y se limpia en ${stacks.join(', ')}`)
