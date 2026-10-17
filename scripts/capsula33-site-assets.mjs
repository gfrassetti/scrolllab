/**
 * cāpsula33 — las piezas del sitio para buscadores y redes: la imagen para compartir (Open Graph,
 * 1200 × 630), los favicons (ICO 16/32/48, PNG 32, apple-touch 180) y los íconos del manifest
 * (192, 512 y la versión «maskable»). Salen a `public/studio/capsula33/site/` (gitignored, como el
 * resto de los medios) y el build los copia a la raíz del sitio.
 *
 *   node scripts/capsula33-site-assets.mjs
 *
 * Se dibujan con HTML en Chromium (Playwright) para usar las mismas tipografías del sitio.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MEDIA = path.join(ROOT, 'public/studio/capsula33')
const OUT = path.join(MEDIA, 'site')
fs.mkdirSync(OUT, { recursive: true })

const FONTS =
  'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600&family=Roboto+Mono:wght@300;400;500&family=Barlow:wght@400;500&display=block'
const C = { void: '#070708', orange: '#e4601d', neon: '#ff7a1a', cream: '#f2e9dc' }
const dataUrl = (file) => `data:image/webp;base64,${fs.readFileSync(path.join(MEDIA, file)).toString('base64')}`

// La imagen para compartir: el pasillo con la entrada naranja al fondo, y la marca.
const og = `<!doctype html><html><head><link rel="stylesheet" href="${FONTS}"><style>
  *{margin:0;box-sizing:border-box} body{width:1200px;height:630px;overflow:hidden;background:${C.void}}
  .bg{position:absolute;inset:0;background:url(${dataUrl('ship/corridor-1400.webp')}) 150px -400px / 1500px auto no-repeat}
  .veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,6,10,.92) 0%,rgba(5,6,10,.72) 34%,rgba(5,6,10,.08) 64%,rgba(5,6,10,0) 100%),linear-gradient(0deg,rgba(5,6,10,.55),rgba(5,6,10,0) 40%)}
  .t{position:absolute;left:72px;bottom:70px;color:${C.cream}}
  .k{font:500 17px 'Roboto Mono';letter-spacing:.22em;text-transform:uppercase;color:${C.neon};display:flex;align-items:center;gap:14px}
  .k:before{content:'';width:34px;height:1px;background:${C.neon}}
  .w{font:300 108px/1 'Roboto Mono';letter-spacing:-.04em;margin-top:22px} .w b{font-weight:300;color:${C.neon}}
  .d{font:600 30px/1.15 'Chakra Petch';text-transform:uppercase;margin-top:18px;max-width:560px}
  .a{font:400 20px 'Barlow';opacity:.75;margin-top:14px}
</style></head><body><div class="bg"></div><div class="veil"></div>
<div class="t"><p class="k">40°09′S · 71°21′O</p><p class="w">cāpsula<b>33</b></p>
<p class="d">Café de especialidad en San Martín de los Andes</p><p class="a">Av. Gral. Roca 1120 · Neuquén, Argentina</p></div></body></html>`

// El ícono: el ojo de buey del local, «c̄» sobre «33», en el anillo naranja.
const icon = (size, { pad = 0, bg = 'transparent' } = {}) => `<!doctype html><html><head><link rel="stylesheet" href="${FONTS}"><style>
  *{margin:0} html,body{width:${size}px;height:${size}px;overflow:hidden;background:${bg}}
  .p{position:absolute;inset:${pad}px;border-radius:50%;background:${C.orange};display:grid;place-items:center}
  .in{width:78%;height:78%;border-radius:50%;background:radial-gradient(circle at 50% 38%,#2a1608,#0c0806 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffd7a6;font-family:'Roboto Mono';text-shadow:0 0 ${size * 0.03}px rgba(255,140,40,.8)}
  .c{font-weight:500;font-size:${(size - pad * 2) * 0.36}px;line-height:.9;position:relative}
  .c:before{content:'';position:absolute;left:14%;right:14%;top:.1em;height:.08em;background:currentColor}
  .n{font-weight:500;font-size:${(size - pad * 2) * 0.2}px;line-height:1;margin-top:.1em}
</style></head><body><div class="p"><div class="in"><span class="c">c</span><span class="n">33</span></div></div></body></html>`

// Para tamaños chicos (16/32/48) el «33» no se lee: solo la «c̄», más grande.
const iconSmall = (size) => `<!doctype html><html><head><link rel="stylesheet" href="${FONTS}"><style>
  *{margin:0} html,body{width:${size}px;height:${size}px;overflow:hidden;background:transparent}
  .p{position:absolute;inset:0;border-radius:50%;background:${C.orange};display:grid;place-items:center}
  .in{width:74%;height:74%;border-radius:50%;background:#100a06;display:grid;place-items:center;color:#ffd7a6;font:500 ${size * 0.5}px/1 'Roboto Mono'}
  .c{position:relative;top:.04em} .c:before{content:'';position:absolute;left:10%;right:10%;top:.16em;height:.11em;background:currentColor}
</style></head><body><div class="p"><div class="in"><span class="c">c</span></div></div></body></html>`

const browser = await chromium.launch()
const shoot = async (html, w, h, file, type = 'png') => {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const buf = await page.screenshot({ type: 'png', omitBackground: true })
  await page.close()
  if (file) {
    if (type === 'jpg') await sharp(buf).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, file))
    else await sharp(buf).png({ compressionLevel: 9 }).toFile(path.join(OUT, file))
  }
  return buf
}

await shoot(og, 1200, 630, 'og.jpg', 'jpg')
await shoot(icon(180, { pad: 14, bg: C.void }), 180, 180, 'apple-touch-icon.png') // opaco (iOS no usa transparencia)
await shoot(icon(192), 192, 192, 'icon-192.png')
await shoot(icon(512), 512, 512, 'icon-512.png')
await shoot(icon(512, { pad: 92, bg: C.void }), 512, 512, 'icon-maskable-512.png') // con margen de seguridad
const smalls = []
for (const s of [16, 32, 48]) smalls.push([s, await shoot(iconSmall(s * 4), s * 4, s * 4)])
await browser.close()

// favicon-32.png y favicon.ico (el ICO lleva los PNG adentro: 16, 32 y 48)
const pngs = await Promise.all(smalls.map(async ([s, b]) => [s, await sharp(b).resize(s, s).png().toBuffer()]))
fs.writeFileSync(path.join(OUT, 'favicon-32.png'), pngs.find(([s]) => s === 32)[1])
const head = Buffer.alloc(6 + 16 * pngs.length)
head.writeUInt16LE(0, 0)
head.writeUInt16LE(1, 2)
head.writeUInt16LE(pngs.length, 4)
let offset = head.length
pngs.forEach(([s, b], i) => {
  const o = 6 + i * 16
  head.writeUInt8(s, o)
  head.writeUInt8(s, o + 1)
  head.writeUInt16LE(1, o + 4) // planos
  head.writeUInt16LE(32, o + 6) // bits por pixel
  head.writeUInt32LE(b.length, o + 8)
  head.writeUInt32LE(offset, o + 12)
  offset += b.length
})
fs.writeFileSync(path.join(OUT, 'favicon.ico'), Buffer.concat([head, ...pngs.map(([, b]) => b)]))

console.log('listo en', path.relative(ROOT, OUT), fs.readdirSync(OUT).join(', '))
