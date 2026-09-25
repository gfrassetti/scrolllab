/**
 * Genera una tarjeta para compartir (1200×630) por cada demo pública →
 * public/og/<sku>.jpg. Misma identidad que public/og.png (gen-brand-assets.mjs):
 * ink + bone + naranja, wordmark en Bricolage, poster de public/catalog a la derecha.
 *
 * Uso: npm run gen:og            (todas)
 *      npm run gen:og nocturne   (solo esa)
 * Necesita red: las tipografías vienen de Google Fonts, igual que en gen-brand-assets.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { OG_IMAGE_SIZE, publicDemoSkus } from '../src/lib/sharePages.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'og')
const en = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/locales/en.json'), 'utf8'))

const INK = '#161412'
const BONE = '#f2efe9'
const ACCENT = '#ff4b00'
const SITE = 'scrolllab.com.ar'
const JPEG_QUALITY = 88
/** WhatsApp descarta previews de más de ~300 kB. */
const MAX_KB = 300

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function cardHtml({ name, vibe, tags, poster }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Space+Grotesk:wght@300..700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    position: relative; overflow: hidden;
    width: ${OG_IMAGE_SIZE.width}px; height: ${OG_IMAGE_SIZE.height}px;
    background: ${INK}; color: ${BONE};
    font-family: 'Space Grotesk', system-ui, sans-serif;
  }
  .poster {
    position: absolute; top: 0; right: 0; width: 452px; height: 100%;
    background: url("${poster}") center top / cover no-repeat;
    border-left: 1px solid rgba(242,239,233,.18);
  }
  .col {
    position: absolute; top: 0; bottom: 0; left: 0; width: 748px;
    padding: 64px 0 58px 72px;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .eyebrow {
    font-size: 19px; letter-spacing: .3em; text-transform: uppercase;
    color: rgba(242,239,233,.55);
  }
  .name {
    width: 604px; white-space: nowrap;
    font-family: 'Bricolage Grotesque', 'Space Grotesk', sans-serif;
    font-weight: 600; line-height: .84; letter-spacing: -.045em;
    text-transform: uppercase;
  }
  .vibe {
    margin-top: 28px;
    font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400;
    font-size: 54px; line-height: 1.05; color: ${ACCENT};
  }
  .tags {
    margin-top: 26px; width: 604px; overflow: hidden; white-space: nowrap;
    font-size: 19px; line-height: 1.7; letter-spacing: .14em; text-transform: uppercase;
    color: rgba(242,239,233,.62);
  }
  .foot {
    display: flex; align-items: center; justify-content: space-between;
    width: 604px; padding-top: 20px;
    border-top: 1px solid rgba(242,239,233,.18);
    font-size: 17px; letter-spacing: .2em; text-transform: uppercase;
    color: rgba(242,239,233,.6);
  }
  .dot { display: inline-block; width: 13px; height: 13px; margin-right: 12px; background: ${ACCENT}; }
</style>
</head>
<body>
  <div class="col">
    <p class="eyebrow">Scroll Lab · Web template</p>
    <div>
      <h1 class="name" id="name">${escapeHtml(name)}</h1>
      <p class="vibe">${escapeHtml(vibe)}</p>
      <p class="tags" id="tags"></p>
    </div>
    <div class="foot">
      <span><span class="dot"></span>${SITE}</span>
      <span>React · GSAP · Source</span>
    </div>
  </div>
  <div class="poster"></div>
  <script>
    // Ajusta el nombre al ancho de la columna (FIZZ vs. CHAPTERS) y deja solo los tags
    // que entran en una línea, una vez cargadas las fuentes.
    // En una IIFE: setContent reusa el window y un const global choca en la 2da tarjeta.
    ;(() => {
      const TAGS = ${JSON.stringify(tags).replace(/</g, '\\u003c')}
      const FONTS = ['600 100px "Bricolage Grotesque"', 'italic 54px "Instrument Serif"', '400 19px "Space Grotesk"']
      Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => {
        const el = document.getElementById('name')
        let size = 156
        el.style.fontSize = size + 'px'
        while (el.scrollWidth > el.clientWidth && size > 60) {
          size -= 2
          el.style.fontSize = size + 'px'
        }
        const tagsEl = document.getElementById('tags')
        let n = TAGS.length
        tagsEl.textContent = TAGS.slice(0, n).join(' · ')
        while (tagsEl.scrollWidth > tagsEl.clientWidth && n > 1) {
          n -= 1
          tagsEl.textContent = TAGS.slice(0, n).join(' · ')
        }
        document.body.dataset.fonts = FONTS.every((f) => document.fonts.check(f)) ? 'ok' : 'missing'
        document.body.dataset.ready = '1'
      })
    })()
  </script>
</body>
</html>`
}

/** Primer canal disponible: Chromium de Playwright, o el Edge/Chrome del sistema. */
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

const wanted = process.argv.slice(2)
const skus = wanted.length ? wanted : publicDemoSkus()
for (const sku of skus) {
  if (!publicDemoSkus().includes(sku)) throw new Error(`"${sku}" no es una demo pública`)
}

fs.mkdirSync(outDir, { recursive: true })
const browser = await launchBrowser()

for (const sku of skus) {
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: OG_IMAGE_SIZE })
  const meta = en.templates?.[sku]
  if (!meta?.vibe) throw new Error(`Falta templates.${sku}.vibe en en.json`)
  const posterFile = path.join(root, 'public', 'catalog', `${sku}.jpg`)
  const poster = `data:image/jpeg;base64,${fs.readFileSync(posterFile).toString('base64')}`

  await page.setContent(
    cardHtml({
      name: sku.toUpperCase(),
      vibe: meta.vibe,
      tags: (meta.tags || []).slice(0, 4),
      poster,
    }),
    { waitUntil: 'load' },
  )
  await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 })
  const fonts = await page.evaluate(() => document.body.dataset.fonts)
  if (fonts !== 'ok') {
    throw new Error(`${sku}: no cargaron las tipografías (¿sin red?). No escribo una tarjeta con fuentes de respaldo.`)
  }

  const jpg = await page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY })
  const file = path.join(outDir, `${sku}.jpg`)
  fs.writeFileSync(file, jpg)
  const kb = jpg.length / 1024
  console.log(`  og/${sku}.jpg — ${kb.toFixed(1)} kB${kb > MAX_KB ? `  ⚠ supera ${MAX_KB} kB` : ''}`)
  await page.close()
}

await browser.close()
