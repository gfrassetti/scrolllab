/**
 * Piezas para el perfil de Instagram. La grilla muestra rectángulos verticales
 * 3:4, así que todo sale en 1080×1440.
 *
 *   mosaico-claro/  el logo entero, con el nombre dentro de las barras (SCROLL / LAB /
 *   mosaico-oscuro/ .COM.AR), partido en 3×3: 9 posts que en la grilla se leen como una
 *                   sola imagen. Dos versiones, se sube una. Van numerados en el orden
 *                   en que se suben (01 → 09), porque Instagram pone lo último arriba
 *                   a la izquierda.
 *   info/           3 carruseles de 4 láminas (Templates, Builder, LAB). Las 3
 *                   portadas forman un tríptico: una barra de "scroll" que cruza las
 *                   tres piezas. Se fijan arriba del perfil.
 *   asi-se-ve.jpg   la grilla armada (fila fija con las 3 portadas + cada mosaico).
 *   info-vista.jpg  las 12 láminas juntas, para revisarlas de una mirada.
 *   LEEME.txt       orden de subida, cómo fijar y el texto de cada post.
 *
 * Los precios, el % del cupón y lo que incluye el plan gratis salen de las
 * constantes del sitio: los posts no se desactualizan solos. Necesita red
 * (tipografías de Google Fonts).
 *
 * Uso: npm run gen:instagram
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { publicDemoSkus } from '../src/lib/sharePages.js'
import {
  CUSTOM_BASE_PRICE_USD,
  CUSTOM_BASE_SECTIONS,
  CUSTOM_EXTRA_SECTION_USD,
  TEMPLATE_PRICES_USD,
  WELCOME_COUPON_PERCENT,
} from '../src/lib/pricing.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'media', 'instagram')
const TILE = { w: 1080, h: 1440 }

const INK = '#161412'
const BONE = '#f2efe9'
const ACCENT = '#ff4b00'
const SITE = 'scrolllab.com.ar'
// Eslogan del texto de los 9 posts del mosaico (la imagen lleva su propia frase).
const SLOGAN = 'Scroll inmersivo, webs que se mueven'

// Lo que LAB da hoy (defaults de server/config.js: hostedFreeQuota y hostedTrialDays).
const LAB_FREE_SECTIONS = 1
const LAB_TRIAL_DAYS = 7

const skus = publicDemoSkus()
const minTemplateUsd = Math.min(...skus.map((sku) => TEMPLATE_PRICES_USD[sku]))
const OFFER = `${WELCOME_COUPON_PERCENT}% menos en tu primera compra`

/** Los tres productos. Cada uno: portada (tríptico) + 3 láminas. */
const SECTIONS = [
  {
    key: 'templates',
    tag: 'Templates',
    title: 'TEMPLATES',
    coverText: `${skus.length} modelos con el código incluido`,
    slides: [
      {
        title: `Los ${skus.length} modelos`,
        text: 'Cada uno es una web completa que se mueve al scrollear.',
        visual: 'posters',
      },
      {
        title: 'Código incluido',
        text: 'Editalo y usalo en tus proyectos y en los de tus clientes. No se puede revender.',
        visual: 'files',
      },
      {
        title: `Desde USD ${minTemplateUsd}`,
        list: [
          'Pago único, sin suscripción',
          'El código completo, listo para editar',
          'Para tus proyectos y los de tus clientes',
          OFFER,
        ],
        cta: true,
      },
    ],
    caption: `Templates: ${skus.length} modelos de webs que se mueven al scrollear, con el código incluido. Desde USD ${minTemplateUsd}, pago único. ${OFFER}. Link en la bio.`,
  },
  {
    key: 'builder',
    tag: 'Builder',
    title: 'BUILDER',
    coverText: 'Armá tu página con las secciones que elijas',
    slides: [
      {
        title: 'Elegís las secciones',
        text: 'Mezclá secciones de todos los modelos: menú, portada, galería, contacto y más.',
        visual: 'stack',
      },
      {
        title: 'Mirá cómo se mueve',
        text: 'Vista previa del scroll en vivo, antes de comprar.',
        visual: 'preview',
      },
      {
        title: `Desde USD ${CUSTOM_BASE_PRICE_USD}`,
        list: [
          `Incluye ${CUSTOM_BASE_SECTIONS} secciones`,
          `Cada sección extra suma USD ${CUSTOM_EXTRA_SECTION_USD}`,
          'Te llevás el código',
          OFFER,
        ],
        cta: true,
      },
    ],
    caption: `Builder: armá tu página eligiendo secciones de todos los modelos, con vista previa del scroll en vivo. Te llevás el código. Desde USD ${CUSTOM_BASE_PRICE_USD}. ${OFFER}. Link en la bio.`,
  },
  {
    key: 'lab',
    tag: 'LAB',
    title: 'LAB',
    coverText: 'Una sección tuya, alojada por nosotros',
    slides: [
      {
        title: 'La mostrás en cualquier sitio',
        text: 'Pegás una línea de código y aparece: en Webflow, WordPress o donde puedas pegar código.',
        visual: 'snippet',
      },
      {
        title: 'La editás desde un panel',
        text: 'Cambiás el texto, publicás y se actualiza donde la pegaste, sin tocar tu sitio.',
        visual: 'panel',
      },
      {
        title: 'Empezá gratis',
        visual: 'plans',
        cta: true,
      },
    ],
    caption: `LAB: una sección tuya alojada por nosotros. La mostrás en cualquier sitio con una línea de código y la editás desde un panel. Plan gratis y ${LAB_TRIAL_DAYS} días de prueba en los planes pagos. Link en la bio.`,
  },
]
const SLIDES_PER_POST = 4

const HASHTAGS = '#diseñoweb #paginasweb #webdesign #scrollytelling #templatesweb'

// ---------- HTML ----------

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Space+Grotesk:wght@300..700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />`

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: ${INK}; color: ${BONE}; font-family: 'Space Grotesk', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  body { position: relative; overflow: hidden; }
  .abs { position: absolute; }
  .title { font-family: 'Bricolage Grotesque', 'Space Grotesk', sans-serif; font-weight: 600; letter-spacing: -.035em; }
  .eyebrow { text-transform: uppercase; letter-spacing: .28em; font-weight: 500; }
  .accent { color: ${ACCENT}; }
`

const doc = (width, height, body, bg = INK) => `<!doctype html><html lang="es"><head><meta charset="utf-8" />${FONTS}
<style>${CSS} html, body { background: ${bg}; } body { width: ${width}px; height: ${height}px; }</style></head><body>${body}</body></html>`

const mark = (size) => `<svg viewBox="4 5 24 22" width="${size}" height="${size * (22 / 24)}" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="5" width="24" height="4.5" fill="${BONE}"/>
  <rect x="4" y="13.75" width="14" height="4.5" fill="${BONE}"/>
  <rect x="22.5" y="13.75" width="5.5" height="4.5" fill="${ACCENT}"/>
  <rect x="4" y="22.5" width="19" height="4.5" fill="${BONE}"/>
</svg>`

/** Geometría del logo sobre el lienzo del mosaico (3×3 piezas). */
const MOSAIC = (() => {
  const W = TILE.w * 3
  const H = TILE.h * 3
  // 120 px por unidad del logo (24×22 unidades): 2880 px de ancho, centrado.
  // Las tres barras quedan una por fila y los cortes caen dentro de las barras.
  const S = 120
  const X0 = (W - 24 * S) / 2
  const Y0 = (H - 22 * S) / 2
  return { W, H, S, px: (ux) => X0 + (ux - 4) * S, py: (uy) => Y0 + (uy - 5) * S }
})()

/** Las barras del logo llevan el nombre y el dominio: SCROLL / LAB / .COM.AR. */
const LOGO_BARS = [
  { ux: 4, uy: 5, uw: 24, uh: 4.5, word: 'SCROLL' },
  { ux: 4, uy: 13.75, uw: 14, uh: 4.5, word: 'LAB' },
  { ux: 4, uy: 22.5, uw: 19, uh: 4.5, word: '.COM.AR' },
]
const LOGO_BLOCK = { ux: 22.5, uy: 13.75, uw: 5.5, uh: 4.5 }

/** El logo entero sobre un lienzo de 3×3 piezas: cada barra cae en su fila. */
function mosaicHtml({ dark }) {
  const { W, H, S, px, py } = MOSAIC
  const ink = dark ? BONE : INK
  const rect = ({ ux, uy, uw, uh }, color) =>
    `<div class="abs" style="left:${px(ux)}px;top:${py(uy)}px;width:${uw * S}px;height:${uh * S}px;background:${color}"></div>`
  return doc(
    W,
    H,
    `${LOGO_BARS.map((bar) => rect(bar, ink)).join('')}${rect(LOGO_BLOCK, ACCENT)}
    <p class="abs title" style="left:${TILE.w}px;width:${TILE.w}px;text-align:center;top:380px;font-size:66px;line-height:1.08;color:${ink}">Templates web<br />con scroll cinematográfico</p>`,
    dark ? INK : BONE,
  )
}

/**
 * Escribe el nombre dentro de las barras. Se mide en el navegador, con la tipografía ya
 * cargada, para que las tres palabras tengan el mismo tamaño, entren en la barra más
 * angosta y queden centradas por la tinta y no por la caja de la línea.
 */
async function addLogoWords(page, color) {
  const { W, H, S, px, py } = MOSAIC
  const bars = LOGO_BARS.map(({ ux, uy, uw, uh, word }) => ({
    word,
    x: px(ux) + 140,
    cy: py(uy) + (uh * S) / 2,
    maxW: uw * S - 280,
  }))
  await page.evaluate(
    ({ bars, color, cap, W, H }) => {
      const ctx = document.createElement('canvas').getContext('2d')
      ctx.font = '700 100px "Bricolage Grotesque"'
      ctx.letterSpacing = '-3px'
      const measured = bars.map((b) => ctx.measureText(b.word))
      const size = Math.min(cap, ...bars.map((b, i) => (100 * b.maxW) / measured[i].width))
      const k = size / 100
      const NS = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(NS, 'svg')
      svg.setAttribute('width', W)
      svg.setAttribute('height', H)
      svg.style.cssText = 'position:absolute;left:0;top:0'
      bars.forEach((b, i) => {
        const m = measured[i]
        const text = document.createElementNS(NS, 'text')
        text.textContent = b.word
        text.setAttribute('x', b.x + m.actualBoundingBoxLeft * k)
        text.setAttribute('y', b.cy + ((m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * k) / 2)
        text.setAttribute('fill', color)
        text.style.cssText = `font:700 ${size}px "Bricolage Grotesque";letter-spacing:-0.03em`
        svg.appendChild(text)
      })
      document.body.appendChild(svg)
    },
    { bars, color, cap: 500, W, H },
  )
}

/** Tríptico: las 3 portadas son una sola imagen ancha con una barra de "scroll" que las cruza. */
function coversHtml() {
  const W = TILE.w * 3
  const tiles = SECTIONS.map((s, i) => {
    const x = i * TILE.w + 90
    return `
      <span class="abs eyebrow accent" style="left:${x}px;top:96px;font-size:30px">0${i + 1}</span>
      <span class="abs eyebrow" style="left:${x}px;width:900px;top:98px;text-align:right;font-size:26px;color:rgba(242,239,233,.55)">Deslizá →</span>
      <p class="abs title" style="left:${x}px;width:900px;top:520px;font-size:140px;line-height:.9">${esc(s.title)}</p>
      <p class="abs" style="left:${x}px;width:880px;top:1035px;font-size:46px;line-height:1.3;color:rgba(242,239,233,.82)">${esc(s.coverText)}</p>`
  }).join('')
  return doc(
    W,
    TILE.h,
    `<div class="abs" style="left:90px;top:840px;width:${W - 180}px;height:120px;background:${BONE}"></div>
     <div class="abs" style="left:${W - 90 - 240}px;top:840px;width:240px;height:120px;background:${ACCENT}"></div>
     ${tiles}`,
  )
}

const posterDataUrl = (sku) =>
  `data:image/jpeg;base64,${fs.readFileSync(path.join(ROOT, 'public', 'catalog', `${sku}.jpg`)).toString('base64')}`

function gridBody() {
  const cells = skus
    .map(
      (sku) => `<div style="position:relative;aspect-ratio:4/2.9;overflow:hidden;background:#000">
        <img src="${posterDataUrl(sku)}" style="width:100%;height:100%;object-fit:cover;object-position:top" />
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72),rgba(0,0,0,0) 55%)"></div>
        <span class="eyebrow" style="position:absolute;left:14px;bottom:11px;font-size:20px;letter-spacing:.16em">${esc(sku)}</span>
      </div>`,
    )
    .join('')
  return `<div style="margin-top:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${cells}</div>`
}

const MONO = "'JetBrains Mono', ui-monospace, Consolas, monospace"
const LINE = 'rgba(242,239,233,.18)'
const DIM = 'rgba(242,239,233,.55)'
const card = (inner, style = '') =>
  `<div style="border:2px solid ${LINE};background:rgba(242,239,233,.04);${style}">${inner}</div>`
const dot = `<i style="width:14px;height:14px;background:${LINE}"></i>`

/** Imagen de cada lámina. Son maquetas dibujadas con la misma paleta, no capturas. */
const VISUALS = {
  posters: gridBody,

  // Lo que trae el ZIP: los archivos reales que arma server/packaging.js.
  files: () => {
    const rows = [
      ['src/', 'el proyecto completo'],
      ['index.html', ''],
      ['package.json', ''],
      ['README.md', 'cómo arrancarlo'],
      ['LICENSE.txt', 'tu licencia de uso'],
    ]
    const lines = rows
      .map(
        ([name, note], i) => `<div style="display:flex;align-items:baseline;gap:22px;height:66px;font-family:${MONO};font-size:34px">
          <span style="color:${DIM}">${i === rows.length - 1 ? '└─' : '├─'}</span><span>${name}</span>
          <span style="margin-left:auto;font-family:'Space Grotesk',sans-serif;font-size:28px;color:${DIM}">${note}</span></div>`,
      )
      .join('')
    return card(
      `<div class="eyebrow accent" style="font-size:22px;margin-bottom:18px">Lo que descargás</div>${lines}`,
      'padding:34px 40px 22px',
    )
  },

  // Las secciones del builder, apiladas como en la página que se arma.
  stack: () => {
    const rows = ['Menú', 'Portada', 'Galería', 'Contacto', 'Pie']
      .map((label, i) => {
        const on = label === 'Portada'
        return `<div style="display:flex;align-items:center;justify-content:space-between;height:62px;padding:0 28px;border:2px solid ${on ? ACCENT : LINE};background:${on ? ACCENT : 'rgba(242,239,233,.04)'};color:${on ? INK : BONE};font-size:32px;font-weight:500">
          <span>${label}</span><span style="font-family:${MONO};font-size:24px;opacity:.6">0${i + 1}</span></div>`
      })
      .join('')
    return `<div style="display:flex;flex-direction:column;gap:10px">${rows}
      <div style="display:flex;align-items:center;justify-content:center;height:62px;border:2px dashed ${ACCENT};color:${ACCENT};font-size:30px;font-weight:500;letter-spacing:.04em">+ Agregar sección</div></div>`
  },

  // Ventana con una demo, cortada a mitad de scroll, y su barra de avance a un costado.
  preview: () =>
    card(
      `<div style="display:flex;align-items:center;gap:10px;height:48px;padding:0 20px;border-bottom:2px solid ${LINE}">
         ${dot}${dot}${dot}<span style="margin-left:auto;font-family:${MONO};font-size:22px;color:${DIM}">vista previa en vivo</span></div>
       <div style="position:relative;height:380px;overflow:hidden">
         <img src="${posterDataUrl('chapters')}" style="display:block;width:100%;height:100%;object-fit:cover;object-position:top" />
         <div style="position:absolute;right:16px;top:16px;bottom:16px;width:10px;background:rgba(22,20,18,.14)">
           <div style="position:absolute;left:0;right:0;top:24%;height:36%;background:${ACCENT}"></div></div></div>`,
      'overflow:hidden',
    ),

  // El <script> real de LAB (el mismo de la demo del sitio) y lo que aparece.
  snippet: () =>
    `${card(
      `<div class="eyebrow" style="font-size:20px;color:${DIM};margin-bottom:14px">Pegás esto en tu sitio</div>
       <pre style="font-family:${MONO};font-size:23px;line-height:1.55;white-space:pre-wrap">&lt;script src="https://embed.scrolllab.com.ar/v1/loader.js"
  data-scrolllab data-key="pub_3f9a…" async&gt;&lt;/script&gt;</pre>`,
      'padding:26px 32px',
    )}
    <div style="height:38px;display:flex;justify-content:center;align-items:center;color:${ACCENT};font-size:30px">↓</div>
    ${card(
      `<div class="eyebrow" style="font-size:20px;color:${DIM};margin-bottom:10px">Y aparece la sección</div>
       <div class="title" style="font-size:72px;line-height:1">EMPECEMOS</div>
       <div style="font-family:${MONO};font-size:24px;color:${DIM};margin-top:8px">hola@estudio.film</div>`,
      'padding:26px 32px',
    )}`,

  // Los campos del panel de LAB (los de su demo) y sus dos botones.
  panel: () => {
    const field = (label, value) => `<div style="margin-bottom:14px">
      <div style="font-size:21px;color:${DIM};margin-bottom:6px;letter-spacing:.04em">${label}</div>
      <div style="height:50px;display:flex;align-items:center;padding:0 20px;border:2px solid ${LINE};background:${INK};font-size:28px">${value}</div></div>`
    const button = (label, style) =>
      `<div style="flex:1;height:60px;display:flex;align-items:center;justify-content:center;font-size:26px;${style}">${label}</div>`
    return card(
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px">
         <span class="eyebrow" style="font-size:22px">Mi sección</span>
         <span class="eyebrow" style="font-size:20px;padding:6px 14px;border:2px solid ${BONE}">Publicada</span></div>
       ${field('Palabra CTA', 'EMPECEMOS')}${field('Email', 'hola@estudio.film')}
       <div style="display:flex;gap:14px;margin-top:22px">
         ${button('Guardar borrador', `border:2px solid ${LINE}`)}${button('Publicar', `background:${ACCENT};color:${INK};font-weight:600`)}</div>`,
      'padding:28px 32px',
    )
  },

  // Plan gratis y planes con prueba (locale es.json: freeTierNote, planTrialNote).
  plans: () =>
    `<div style="display:flex;flex-direction:column;gap:20px">
      ${card(
        `<div class="eyebrow accent" style="font-size:24px">Gratis</div>
         <div class="title" style="font-size:64px;line-height:1.05;margin:12px 0 10px">${LAB_FREE_SECTIONS} sección publicada</div>
         <div style="font-size:32px;color:${DIM}">Sin tarjeta ni vencimiento</div>`,
        'padding:34px 40px',
      )}
      ${card(
        `<div class="eyebrow" style="font-size:24px;color:${DIM}">Planes Starter y Pro</div>
         <div class="title" style="font-size:64px;line-height:1.05;margin:12px 0 10px">${LAB_TRIAL_DAYS} días gratis</div>
         <div style="font-size:32px;color:${DIM}">Y más secciones publicadas</div>`,
        'padding:34px 40px',
      )}
    </div>`,
}

/** Lista de puntos (láminas de precio): cada línea con el cuadradito del logo. */
function listBody(items) {
  const rows = items
    .map((item, i) => {
      const last = i === items.length - 1
      return `<div style="display:flex;align-items:center;gap:26px;height:118px;border-top:2px solid ${i ? 'rgba(242,239,233,.16)' : 'transparent'};font-size:40px;color:${last ? ACCENT : BONE}">
        <i style="flex:none;width:22px;height:22px;background:${last ? ACCENT : BONE}"></i><span>${esc(item)}</span></div>`
    })
    .join('')
  return `<div style="margin-top:8px">${rows}</div>`
}

/** Lámina de detalle: título, una línea de texto, una imagen y una barra de progreso de scroll. */
function slideHtml(section, slide, n) {
  const visual = slide.visual
    ? `<div style="margin-top:${slide.cta ? '8px' : 'auto'}">${VISUALS[slide.visual]()}</div>`
    : ''
  const list = slide.list ? listBody(slide.list) : ''
  const cta = slide.cta
    ? `<p class="title accent" style="margin-top:auto;font-size:96px;line-height:1">${SITE}</p>`
    : ''
  const extra = visual + list + cta
  return doc(
    TILE.w,
    TILE.h,
    `<div class="abs" style="left:90px;right:90px;top:88px;display:flex;justify-content:space-between;align-items:center">
       <div style="display:flex;align-items:center;gap:18px">${mark(46)}<span class="eyebrow" style="font-size:24px">Scroll Lab</span></div>
       <span class="eyebrow accent" style="font-size:24px">${esc(section.tag)} · ${n}/${SLIDES_PER_POST}</span>
     </div>
     <div class="abs" style="left:90px;right:90px;top:230px;height:990px;display:flex;flex-direction:column">
       <h2 class="title" style="font-size:${slide.visual === 'posters' ? 104 : 118}px;line-height:.98">${esc(slide.title)}</h2>
       <div style="flex:none;width:120px;height:10px;background:${ACCENT};margin:44px 0 40px"></div>
       ${slide.text ? `<p style="font-size:46px;line-height:1.34;color:rgba(242,239,233,.8);max-width:880px">${esc(slide.text)}</p>` : ''}
       ${extra}
     </div>
     <div class="abs" style="left:90px;right:90px;top:1268px;height:22px;background:rgba(242,239,233,.16)">
       <div style="position:relative;width:${(n / SLIDES_PER_POST) * 100}%;height:100%;background:${BONE}">
         <div style="position:absolute;right:0;top:0;height:100%;width:64px;background:${ACCENT}"></div>
       </div>
     </div>
     <p class="abs" style="left:90px;top:1318px;font-size:28px;color:rgba(242,239,233,.6)">${SITE}</p>`,
  )
}

// ---------- render ----------

const FONT_CHECKS = [
  '600 100px "Bricolage Grotesque"',
  '500 30px "Space Grotesk"',
  '400 30px "Space Grotesk"',
  '400 30px "JetBrains Mono"',
]

async function openPage(browser, html, size) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(async (fonts) => {
    await Promise.all(fonts.map((f) => document.fonts.load(f)))
    await document.fonts.ready
  }, FONT_CHECKS)
  const ok = await page.evaluate((fonts) => fonts.every((f) => document.fonts.check(f)), FONT_CHECKS)
  if (!ok) throw new Error('No cargaron las tipografías (¿sin red?): no genero piezas con fuentes de respaldo.')
  return page
}

const jpeg = (file, clip) => ({ path: file, type: 'jpeg', quality: 95, ...(clip ? { clip } : {}) })

/** Corta un lienzo ancho/alto en piezas de 1080×1440 (de izquierda a derecha, de arriba abajo). */
async function renderSliced(browser, html, cols, rows, fileFor, prepare) {
  const page = await openPage(browser, html, { width: TILE.w * cols, height: TILE.h * rows })
  if (prepare) await prepare(page)
  const files = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const file = fileFor(r, c)
      await page.screenshot(jpeg(file, { x: c * TILE.w, y: r * TILE.h, width: TILE.w, height: TILE.h }))
      files.push(file)
    }
  }
  await page.close()
  return files
}

/** Junta imágenes en grillas (vista previa); si hay varios grupos, van lado a lado con su título. */
async function sheet(browser, groups, { cols, tileW, tileH, gap, out }) {
  const rows = Math.ceil(Math.max(...groups.map((g) => g.files.length)) / cols)
  const gridW = cols * tileW + (cols - 1) * gap
  const gridH = rows * tileH + (rows - 1) * gap
  const multi = groups.length > 1
  const pad = multi ? 24 : 0
  const between = 40
  const labelH = multi ? 52 : 0
  const width = pad * 2 + groups.length * gridW + (groups.length - 1) * between
  const height = pad * 2 + labelH + gridH
  const grid = (files) =>
    `<div style="display:grid;grid-template-columns:repeat(${cols},${tileW}px);gap:${gap}px">${files
      .map((f) => `<img src="${pathToFileURL(f).href}" style="width:${tileW}px;height:${tileH}px;display:block" />`)
      .join('')}</div>`
  const blocks = groups
    .map(
      ({ label, files }) =>
        `<div style="width:${gridW}px">${multi ? `<p style="margin:0;height:${labelH}px;font:600 24px system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#f2efe9">${label}</p>` : ''}${grid(files)}</div>`,
    )
    .join('')
  const html = `<!doctype html><html><body style="margin:0;padding:${pad}px;background:#0b0a09"><div style="display:flex;gap:${between}px;align-items:flex-start">${blocks}</div></body></html>`
  const tmp = path.join(OUT, '.vista.html')
  fs.writeFileSync(tmp, html)
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' })
  await page.screenshot(jpeg(out))
  await page.close()
  fs.rmSync(tmp, { force: true })
}

const VARIANTS = [
  { dir: 'mosaico-claro', label: 'A · Fondo claro', dark: false },
  { dir: 'mosaico-oscuro', label: 'B · Fondo oscuro', dark: true },
]
const MOSAIC_CAPTION = `${SLOGAN}. Templates con el código incluido. Link en la bio.`

function readme() {
  const captions = SECTIONS.map((s) => `${s.title}\n${s.caption}`).join('\n\n')
  return `INSTAGRAM · SCROLL LAB
(todas las piezas son 1080×1440, el formato vertical de la grilla actual)

1) MOSAICO (9 posts): elegí UNA carpeta, mosaico-claro/ o mosaico-oscuro/
   Subí las 9 piezas de la 01 a la 09: el número del archivo es el orden. Instagram
   pone lo último arriba a la izquierda, por eso la 09 tiene que ser la última.
   Cada pieza es un post aparte (no un carrusel). No las subas todas juntas:
   repartilas en 2 días.
   Texto: el mismo en las 9, con hashtags y sin nombrar LAB ni el Builder:
   ${MOSAIC_CAPTION}
   ${HASHTAGS}

2) INFO (3 posts con 4 fotos cada uno, carpeta info/)
   Subí primero LAB, después BUILDER y al final TEMPLATES, cada uno con sus 4
   láminas en orden (1 a 4). Así, de izquierda a derecha, la grilla dice
   Templates | Builder | LAB.

3) FIJAR
   Abrí cada uno de los 3 posts de info, tocá los tres puntos y elegí "Fijar en tu
   perfil". Fijalos en el mismo orden: LAB, BUILDER y al final TEMPLATES. Si en la
   fila quedan en otro orden, desfijá y volvé a fijar. Quedan siempre arriba.

4) LOS VIDEOS
   Van entre esa fila y el mosaico, y con el tiempo lo empujan hacia abajo.

TEXTOS DE LOS 3 POSTS (pegalos y agregá las etiquetas al final)

${captions}

${HASHTAGS}
`
}

async function main() {
  // Se vacían las carpetas, no se borran: en Windows (y con OneDrive) una carpeta
  // abierta en el explorador o tomada por el sincronizador no se puede eliminar.
  for (const dir of [...VARIANTS.map((v) => v.dir), 'info']) {
    const folder = path.join(OUT, dir)
    fs.mkdirSync(folder, { recursive: true })
    for (const name of fs.readdirSync(folder)) fs.rmSync(path.join(folder, name), { force: true })
  }

  const browser = await chromium.launch()
  try {
    // Mosaico: se numera en el orden de subida (la pieza de abajo a la derecha primero).
    const uploadNumber = (r, c) => (2 - r) * 3 + (2 - c) + 1
    const mosaics = []
    for (const variant of VARIANTS) {
      const file = (r, c) =>
        path.join(OUT, variant.dir, `${String(uploadNumber(r, c)).padStart(2, '0')}-fila${r + 1}-col${c + 1}.jpg`)
      const tiles = await renderSliced(browser, mosaicHtml(variant), 3, 3, file, (page) =>
        addLogoWords(page, variant.dark ? INK : BONE),
      )
      mosaics.push({ label: variant.label, tiles })
    }

    // Portadas (tríptico) y láminas de detalle.
    const covers = await renderSliced(browser, coversHtml(), 3, 1, (_r, c) =>
      path.join(OUT, 'info', `${SECTIONS[c].key}-1.jpg`),
    )
    const slides = []
    for (const section of SECTIONS) {
      slides.push(path.join(OUT, 'info', `${section.key}-1.jpg`))
      for (const [i, slide] of section.slides.entries()) {
        const n = i + 2
        const file = path.join(OUT, 'info', `${section.key}-${n}.jpg`)
        const page = await openPage(browser, slideHtml(section, slide, n), { width: TILE.w, height: TILE.h })
        await page.screenshot(jpeg(file))
        await page.close()
        slides.push(file)
      }
    }

    // Vistas previas
    const grids = mosaics.map(({ label, tiles }) => ({ label, files: [...covers, ...tiles] }))
    await sheet(browser, grids, { cols: 3, tileW: 300, tileH: 400, gap: 3, out: path.join(OUT, 'asi-se-ve.jpg') })
    await sheet(browser, [{ files: slides }], { cols: 4, tileW: 270, tileH: 360, gap: 8, out: path.join(OUT, 'info-vista.jpg') })

    fs.writeFileSync(path.join(OUT, 'LEEME.txt'), readme())
  } finally {
    await browser.close()
  }
  console.log(`Listo → ${path.relative(ROOT, OUT)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
