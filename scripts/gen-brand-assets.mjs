/**
 * Genera los assets de marca (og:image, favicons, apple-touch-icon) desde
 * public/logo.svg con Chromium, así el ícono es idéntico al logo del sitio.
 *
 * Uso: node scripts/gen-brand-assets.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')

const INK = '#161412'
const BONE = '#f2efe9'
const ACCENT = '#ff4b00'
const SITE = 'scrolllab.com.ar'

const logoSvg = fs.readFileSync(path.join(publicDir, 'logo.svg'), 'utf8')

/** Barras del logo sin el fondo, para componer sobre el ink de la og:image. */
const logoMarkSvg = `
<svg viewBox="0 0 32 32" width="118" height="118" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="5" width="24" height="4.5" fill="${BONE}"/>
  <rect x="4" y="13.75" width="14" height="4.5" fill="${BONE}"/>
  <rect x="22.5" y="13.75" width="5.5" height="4.5" fill="${ACCENT}"/>
  <rect x="4" y="22.5" width="19" height="4.5" fill="${BONE}"/>
</svg>`

const ogHtml = `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Space+Grotesk:wght@300..700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    background: ${INK}; color: ${BONE};
    font-family: 'Space Grotesk', system-ui, sans-serif;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 68px 72px;
  }
  .eyebrow {
    font-size: 20px; letter-spacing: .3em; text-transform: uppercase;
    color: rgba(242,239,233,.55);
  }
  .lockup { display: flex; align-items: center; gap: 30px; }
  .wordmark {
    font-family: 'Bricolage Grotesque', 'Space Grotesk', sans-serif;
    font-weight: 600; font-size: 152px; line-height: .84;
    letter-spacing: -.045em; text-transform: uppercase;
  }
  .claim {
    margin-top: 30px; font-size: 33px; line-height: 1.3;
    color: rgba(242,239,233,.78);
  }
  .claim em {
    font-family: 'Instrument Serif', serif; font-style: italic;
    font-weight: 400; color: ${ACCENT};
  }
  .foot {
    display: flex; align-items: center; justify-content: space-between;
    border-top: 1px solid rgba(242,239,233,.18); padding-top: 22px;
    font-size: 19px; letter-spacing: .22em; text-transform: uppercase;
    color: rgba(242,239,233,.6);
  }
  .dot { display: inline-block; width: 15px; height: 15px; background: ${ACCENT}; margin-right: 14px; vertical-align: -1px; }
</style>
</head>
<body>
  <p class="eyebrow">Plantillas web · Web templates</p>

  <div>
    <div class="lockup">
      ${logoMarkSvg}
      <span class="wordmark">Scroll Lab</span>
    </div>
    <p class="claim">Elegí un modelo completo o <em>armá el tuyo</em><br />y descargá el código fuente.</p>
  </div>

  <div class="foot">
    <span><span class="dot"></span>${SITE}</span>
    <span>Código fuente + licencia</span>
  </div>
</body>
</html>`

/** Envuelve un PNG en un contenedor .ico (soportado por todos los navegadores actuales). */
function pngToIco(png, size) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // image count

  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0) // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
  entry.writeUInt8(0, 2) // palette
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(header.length + entry.length, 12)

  return Buffer.concat([header, entry, png])
}

async function shotSvg(page, size) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px">
     ${logoSvg.replace('<svg', `<svg width="${size}" height="${size}"`)}
     </body></html>`,
  )
  return page.screenshot({ omitBackground: false })
}

/**
 * Primer canal disponible. Sirve el Chromium de Playwright si está bajado, o
 * el Edge/Chrome del sistema (evita `npx playwright install` solo para esto).
 */
async function launchBrowser() {
  const channels = [undefined, 'chromium', 'msedge', 'chrome']
  let lastError
  for (const channel of channels) {
    try {
      return await chromium.launch(channel ? { channel } : {})
    } catch (err) {
      lastError = err
    }
  }
  throw new Error(
    `No hay Chromium/Edge disponible. Corré "npx playwright install chromium".\n${lastError?.message || ''}`,
  )
}

const browser = await launchBrowser()
const page = await browser.newPage({ deviceScaleFactor: 1 })

await page.setViewportSize({ width: 1200, height: 630 })
await page.setContent(ogHtml, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(400)
const og = await page.screenshot()
fs.writeFileSync(path.join(publicDir, 'og.png'), og)

const touch = await shotSvg(page, 180)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), touch)

const icon192 = await shotSvg(page, 192)
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192)

const icon512 = await shotSvg(page, 512)
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512)

const icon32 = await shotSvg(page, 32)
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pngToIco(icon32, 32))

await browser.close()

console.log('Assets generados en public/:')
for (const f of [
  'og.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'favicon.ico',
]) {
  const { size } = fs.statSync(path.join(publicDir, f))
  console.log(`  ${f} — ${(size / 1024).toFixed(1)} kB`)
}
