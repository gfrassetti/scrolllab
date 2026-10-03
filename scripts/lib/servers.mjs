/**
 * Servidor y navegador para los chequeos con Chromium (check:mobile,
 * check:motion): un puerto libre, el dev server de Vite o un build sin
 * minificar servido con `vite preview`, y el reemplazo de picsum cuando no
 * hay red (y, opcional, Google Fonts bajadas con curl).
 */
import { execFile, execFileSync, spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { chromium } from 'playwright'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const VITE_BIN = path.join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')

/** Puerto efímero: un vite zombi de una corrida anterior no rompe esta. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

/** Mismo arranque que check:builder: el bin de vite con node, IPv4 explícito. */
export function startVite(port) {
  const proc = spawn(process.execPath, [VITE_BIN, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: REPO,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
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

/** Build sin minificar (los nombres de componente sobreviven) en una carpeta aparte. */
export function buildSnapshot(dir) {
  console.log('Compilando snapshot sin minificar…')
  execFileSync(process.execPath, [VITE_BIN, 'build', '--minify', 'false', '--outDir', dir, '--emptyOutDir', '--logLevel', 'warn'], {
    cwd: REPO,
    stdio: 'inherit',
  })
}

/** `vite preview` de esa carpeta; resuelve cuando responde. */
export async function startPreview(port, dir) {
  const proc = spawn(
    process.execPath,
    [VITE_BIN, 'preview', '--outDir', dir, '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    { cwd: REPO, stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`)
      if (res.ok) return proc
    } catch {
      /* todavía no */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  proc.kill()
  throw new Error('vite preview no respondió')
}

/**
 * picsum (fotos de ejemplo de NOCTURNE) puede no estar al alcance (proxy, CI
 * sin red): se sirve un SVG del mismo tamaño pedido, así el encuadre y la
 * resolución se miden igual. No cuenta en los bytes.
 */
export function picsumPlaceholder(url) {
  const m = url.match(/\/(\d+)\/(\d+)(?:[/?#]|$)/)
  const w = m ? Number(m[1]) : 1200
  const h = m ? Number(m[2]) : 800
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3f4a"/><stop offset="1" stop-color="#11131a"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.62}" cy="${h * 0.4}" r="${Math.min(w, h) * 0.22}" fill="#6b7280" opacity=".5"/></svg>`
}

/**
 * Chromium con WebGL por software (SwiftShader) y los flags extra de
 * CHROMIUM_ARGS (p. ej. para confiar en el CA de un proxy corporativo; para las
 * fuentes de Google en un entorno con proxy ver FONTS_VIA_CURL). Sin
 * `playwright install`: PLAYWRIGHT_CHROMIUM_PATH apunta al binario.
 */
export function launchChromium() {
  return chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    args: [
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--ignore-gpu-blocklist',
      ...(process.env.CHROMIUM_ARGS || '').split(/\s+/).filter(Boolean),
    ],
  })
}

/** Sirve el placeholder de picsum en un contexto de Playwright. */
export function routePicsum(context) {
  return context.route(/^https:\/\/picsum\.photos\//, (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: picsumPlaceholder(route.request().url()) }),
  )
}

const execFileAsync = promisify(execFile)
const fontCache = new Map()

/**
 * Google Fonts para un Chromium que no confía en el CA del proxy del entorno
 * (`net::ERR_CERT_AUTHORITY_INVALID`): con `FONTS_VIA_CURL=1` las baja `curl`, que
 * sí usa el bundle de CA del entorno, y se las entrega al navegador con
 * `route.fulfill`. No toca la verificación TLS. Sin esto el texto se mide con la
 * fuente de reemplazo y salen recortes (o faltan) que en un teléfono real no pasan.
 */
export async function routeGoogleFonts(context) {
  if (!process.env.FONTS_VIA_CURL) return
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (route) => {
    const request = route.request()
    const url = request.url()
    const ua = request.headers()['user-agent'] || ''
    // El CSS de Google cambia con el user agent (formatos de fuente): va en la clave.
    const key = `${url}|${ua}`
    if (!fontCache.has(key)) {
      fontCache.set(
        key,
        execFileAsync('curl', ['-sS', '-f', '-m', '40', '-A', ua, url], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }).then((r) => r.stdout),
      )
    }
    try {
      await route.fulfill({
        status: 200,
        contentType: url.includes('googleapis') ? 'text/css; charset=utf-8' : 'font/woff2',
        headers: { 'access-control-allow-origin': '*' },
        body: await fontCache.get(key),
      })
    } catch {
      fontCache.delete(key)
      await route.abort()
    }
  })
}
