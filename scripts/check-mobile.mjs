/**
 * Auditoría mobile/tablet de los templates en venta, sección por sección.
 *
 * check:responsive saca capturas de todo el market; esto baja al detalle que
 * pide un template «impecable» en un teléfono: recorre cada sección de cada
 * template en 12 anchos (320 → 1280), con motion normal y con reduced motion,
 * y reporta por sección:
 *
 * - overflow: algo se sale del viewport y solo lo tapa el `overflow-x: clip`
 *   del body (el borde de la pantalla corta contenido);
 * - clipped: texto cortado por un contenedor con overflow oculto (un titular
 *   que no entra en un alto fijo, una palabra que no entra a 320);
 * - broken-word: una palabra de un titular (≥18 px) partida en dos líneas
 *   (`break-words`, SplitText por letras sin palabras, columnas angostas);
 * - text<11: texto de menos de 11 px (micro-labels incluidos);
 * - body<14: párrafos de menos de 14 px en mobile (aviso);
 * - target: controles con zona de toque menor a 44 px en táctil (24 px en
 *   desktop). La zona se mide tocando alrededor del control, así que cuentan
 *   los `::before` que la agrandan (`tpl-hit`). Los links dentro de un
 *   párrafo quedan exentos, como en WCAG;
 * - image: imágenes deformadas, rotas o que se ven a más de 1,5× su
 *   resolución en una pantalla DPR 2 habiendo una versión más grande en el
 *   srcset (el `sizes` está corto);
 * - image-master: lo mismo, pero ya con la versión más grande: hace falta un
 *   original de más resolución (aviso, no error);
 * - hidden: con reduced motion, texto que queda invisible (una animación que
 *   solo arranca con motion y deja el contenido en opacidad 0);
 * - error: errores de consola y de página;
 * - bytes de imagen transferidos por ancho (para comparar antes/después).
 *
 * En mobile además abre el menú de la nav y audita el panel.
 *
 * Salida en storage/responsive-check/mobile/: capturas JPEG por sección, un
 * report.json, un report.txt y una hoja de contacto HTML por template
 * (secciones × anchos) para revisar a ojo.
 *
 * Corre contra el dev server (lo levanta solo en un puerto libre) para que los
 * nombres de componente de React sirvan de etiqueta de cada sección. Con
 * `--snapshot` compila una copia sin minificar y la sirve con `vite preview`:
 * los nombres se conservan y se puede seguir editando el código mientras
 * corre (el dev server recargaría la página a mitad de la auditoría). Con
 * BASE apunta a un server ya levantado.
 *
 * Uso:
 *   npm run check:mobile                          # 10 templates, 12 anchos
 *   npm run check:mobile -- chapters nocturne     # solo esos
 *   npm run check:mobile -- --quick               # 320 · 390 · 768 · 1280
 *   npm run check:mobile -- --snapshot            # build sin minificar + preview
 *   WIDTHS=375,768 MOTION=reduce npm run check:mobile -- unity
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium …  # sin `playwright install`
 *
 * Variables: BASE, WIDTHS, REDUCED_WIDTHS, MOTION (normal|reduce|both),
 * WORKERS (páginas en paralelo, default 2), SETTLE (ms de espera tras cada
 * scroll, default 1100), CHROMIUM_ARGS (flags extra para Chromium, separados
 * por espacios; p. ej. para confiar en el CA de un proxy corporativo),
 * FONTS_VIA_CURL=1 (las fuentes de Google las baja `curl` y se las entrega al
 * navegador: para un proxy cuyo CA Chromium no reconoce, sin tocar TLS).
 *
 * Ojo: las fuentes vienen de Google Fonts. Si Chromium no las puede bajar
 * (proxy, sin red), el texto se mide con la fuente de reemplazo y los anchos
 * no son los reales (salen recortes que en un teléfono no existen y se pueden
 * esconder otros): el reporte lo avisa. Con las reales, FONTS_VIA_CURL=1.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSnapshot, freePort, launchChromium, routeGoogleFonts, routePicsum, startPreview, startVite } from './lib/servers.mjs'
import { IGNORED_CONSOLE, IGNORED_URLS, installBlockHelpers } from './lib/page-helpers.mjs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(REPO, 'storage', 'responsive-check', 'mobile')

/** Los templates en venta que cubre el pulido mobile (MERIDIAN queda afuera). */
const TEMPLATES = [
  'chapters',
  'nocturne',
  'monolith',
  'velocity',
  'fizz',
  'atelier',
  'comic',
  'unity',
  'atrium',
  'meridian',
  'kin',
]

const ALL_WIDTHS = [320, 360, 375, 390, 414, 430, 480, 600, 768, 834, 1024, 1280]
const QUICK_WIDTHS = [320, 390, 768, 1280]

/** Altura por ancho, aproximada a dispositivos reales. */
const HEIGHT_FOR = (w) => {
  if (w <= 320) return 568
  if (w <= 360) return 740
  if (w <= 430) return 844
  if (w <= 480) return 900
  if (w <= 600) return 960
  if (w < 1024) return w === 834 ? 1194 : 1024
  return w === 1024 ? 768 : 800
}

const tierOf = (w) => (w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop')

/** DPR que se emula y con el que se juzga la resolución de las imágenes. */
const DPR = 2

/**
 * Excepciones documentadas: `<template>/<Componente>:<check>` → motivo.
 * Como NOT_IN_DOM en check-builder: una por una y con el porqué, para que la
 * lista no sea un lugar donde esconder problemas.
 */
const ALLOW = {
  'atelier/NavAtelier:hidden': 'la marca se oculta a propósito al scrollear en mobile y vuelve arriba de todo',
  'fizz/NavFizz:clipped':
    'las líneas del menú a pantalla completa entran con máscara de SplitText: el recorte medido es la máscara de la animación, el texto se ve entero (captura menu-open)',
  'chapters/QuoteBreak:clipped':
    'las líneas de la cita entran con una máscara de SplitText atada al scroll: la auditoría frena a mitad del reveal (BigNumbers:top, con la cita asomando abajo) y el recorte medido es la máscara en movimiento; en QuoteBreak:top las líneas están enteras (transform identidad)',
  'comic/ChapterBond:clipped':
    'cada página sube desde abajo del escenario (yPercent 108 → 0 con scrub): en `mid` la que entra todavía está cortada por el borde del escenario; en reposo el texto entra con 48 px o más de margen, de 320 a 834 de ancho (sonda de reposo)',
  'meridian/Location:clipped':
    'el mapa es más ancho que la pantalla y se desplaza al tocar una tarjeta o un pin (`data-pan`): lo que queda junto al borde del recuadro se corta por diseño',
  'meridian/Location:target':
    'dos pines vecinos se pisan la zona de toque de 44 px (`tpl-hit`) y la de arriba gana: el dibujo es de 32 px y cada pin tiene su zona de 44 px',
}


const ERROR_CHECKS = new Set(['overflow', 'clipped', 'broken-word', 'text<11', 'target', 'image', 'hidden', 'error'])

function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')))
  const names = argv.filter((a) => !a.startsWith('--')).map((a) => a.toLowerCase())
  const unknown = names.filter((n) => !TEMPLATES.includes(n))
  if (unknown.length) {
    console.error(`Templates desconocidos: ${unknown.join(', ')}. Opciones: ${TEMPLATES.join(', ')}`)
    process.exit(2)
  }
  const list = (env, fallback) =>
    env
      ? env
          .split(',')
          .map((w) => Number(w.trim()))
          .filter(Boolean)
      : fallback
  const quick = flags.has('--quick')
  const widths = list(process.env.WIDTHS, quick ? QUICK_WIDTHS : ALL_WIDTHS)
  const reducedWidths = list(
    process.env.REDUCED_WIDTHS,
    process.env.WIDTHS ? widths : quick ? [390] : [320, 390, 768, 1280],
  )
  const motion = process.env.MOTION || 'both'
  return {
    templates: names.length ? names : TEMPLATES,
    widths,
    reducedWidths,
    motion,
    snapshot: flags.has('--snapshot'),
    workers: Math.max(1, Number(process.env.WORKERS) || 2),
    settle: Number(process.env.SETTLE) || 1100,
  }
}

// ---------------------------------------------------------------------------
// Código que corre dentro de la página
// ---------------------------------------------------------------------------

/**
 * Instala helpers en window.__mc: bloques de primer nivel (las secciones del
 * template, con el nombre del componente de React) y la auditoría de lo que
 * está a la vista. Se inyecta con addInitScript.
 */
function installPageHelpers() {
  const mc = window.__mc

  const ids = new WeakMap()
  let nextId = 1
  const idOf = (el) => {
    if (!ids.has(el)) ids.set(el, nextId++)
    return ids.get(el)
  }

  const visible = (el) =>
    el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !el.closest('[inert]')

  /**
   * Un fundido o una escala a medias (el reveal de un scrub todavía corriendo):
   * la zona de toque de un botón que entra con `scale: 0.5 → 1` mide la mitad
   * hasta que termina. Se mide con la geometría de reposo, que aparece en otra
   * posición de scroll de la misma auditoría.
   */
  const midTween = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (parseFloat(cs.opacity) < 0.9) return true
      if (cs.transform && cs.transform !== 'none') {
        const m = new DOMMatrix(cs.transform)
        if (Math.hypot(m.a, m.b) < 0.95) return true
      }
    }
    return false
  }

  const shortText = (s, n = 48) => {
    const t = (s || '').replace(/\s+/g, ' ').trim()
    return t.length > n ? `${t.slice(0, n - 1)}…` : t
  }

  const describe = (el) => {
    const tag = el.tagName.toLowerCase()
    const label =
      el.getAttribute('aria-label') ||
      shortText(el.innerText || el.textContent, 40) ||
      el.getAttribute('alt') ||
      (el.currentSrc || el.src || '').split('/').pop()?.split('?')[0] ||
      ''
    return { tag, label }
  }

  const inView = (r) => r.bottom > 0 && r.top < innerHeight && r.width > 0 && r.height > 0

  /** Texto propio (nodos de texto directos) no vacío. */
  const ownText = (el) => {
    let s = ''
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue
    return s.trim()
  }

  /** Unidad de copy: sube mientras el ancestro tenga la misma tipografía y poco texto. */
  const copyUnit = (el) => {
    let unit = el
    const fs0 = getComputedStyle(el).fontSize
    for (let i = 0; i < 5; i++) {
      const p = unit.parentElement
      if (!p || p.matches('section, footer, main, header, nav, body, #top')) break
      if (getComputedStyle(p).fontSize !== fs0) break
      if ((p.textContent || '').trim().length > 220) break
      unit = p
    }
    return unit
  }

  const overflowsX = (cs) => cs.overflowX !== 'visible'
  const overflowsY = (cs) => cs.overflowY !== 'visible'

  /** Rect del texto propio del elemento (más preciso que la caja). */
  const textRect = (el) => {
    const range = document.createRange()
    let rect = null
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.nodeValue.trim()) continue
      range.selectNodeContents(n)
      const r = range.getBoundingClientRect()
      if (!r.width || !r.height) continue
      rect = rect
        ? {
            left: Math.min(rect.left, r.left),
            top: Math.min(rect.top, r.top),
            right: Math.max(rect.right, r.right),
            bottom: Math.max(rect.bottom, r.bottom),
          }
        : { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    }
    return rect
  }

  /**
   * Marquesinas y tracks horizontales: anchos a propósito. Una fila flex con
   * ítems `shrink-0` desborda su propia caja sin agrandarla, así que además
   * del ancho se mira el contenido (scrollWidth).
   */
  const inTrack = (el, stop, clip = { left: 0, right: innerWidth }) => {
    for (let a = el.parentElement; a && a !== stop && a !== document.body; a = a.parentElement) {
      const r = a.getBoundingClientRect()
      if (r.width > innerWidth * 1.45 || a.scrollWidth > Math.max(a.clientWidth, 1) * 1.45) return true
      // Una fila que GSAP corre en x (xPercent) y se sale del recorte es un
      // track aunque no sea tan ancha. Un `-translate-x-1/2` de centrado no:
      // queda adentro.
      const t = getComputedStyle(a).transform
      if (t && t !== 'none' && Math.abs(new DOMMatrixReadOnly(t).m41) > 1) {
        if (r.left < clip.left - 1 || r.right > clip.right + 1 || a.scrollWidth > a.clientWidth + 2) return true
      }
    }
    return false
  }

  const truncates = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')) return true
    }
    return false
  }

  /**
   * Zona de toque efectiva: toca alrededor del centro (cuentan ::before y
   * ::after). Si algún punto cae fuera del viewport no se puede medir acá:
   * devuelve null y el control se mide en otra posición de scroll.
   */
  const hitSize = (el, r, min) => {
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const half = min / 2 - 1
    const probes = []
    if (r.width < min) probes.push([cx - half, cy], [cx + half, cy])
    if (r.height < min) probes.push([cx, cy - half], [cx, cy + half])
    if (probes.some(([x, y]) => x < 0 || y < 0 || x >= innerWidth || y >= innerHeight)) return null
    // Un elemento fijo (el botón flotante del menú) tapando el punto no es un
    // defecto del control: al scrollear sale de abajo. No se puede medir ahí.
    let coveredByFixed = false
    const hits = (x, y) => {
      const h = document.elementFromPoint(x, y)
      if (!h) return false
      if (h === el || el.contains(h)) return true
      for (let a = h; a && a !== document.body; a = a.parentElement) {
        if (getComputedStyle(a).position === 'fixed') coveredByFixed = true
      }
      return false
    }
    const w = r.width >= min || (hits(cx - half, cy) && hits(cx + half, cy))
    const h = r.height >= min || (hits(cx, cy - half) && hits(cx, cy + half))
    if (coveredByFixed && (!w || !h)) return null
    return { w: w ? Math.max(min, r.width) : r.width, h: h ? Math.max(min, r.height) : r.height }
  }

  const isInlineLink = (el) => {
    if (el.tagName !== 'A') return false
    if (getComputedStyle(el).display !== 'inline') return false
    const p = el.parentElement
    if (!p) return false
    const around = ownText(p)
    return around.length > 12 // es parte de una oración
  }

  const SVG_TEXT = new Set(['text', 'textpath', 'tspan'])

  // Los <label for> no cuentan: el control es el campo, que se mide aparte.
  const CONTROLS =
    'a[href], button, [role=button], [role=tab], [role=link], input:not([type=hidden]), select, textarea, summary'

  const blockIndexOf = (blocks, el) => {
    for (let i = 0; i < blocks.length; i++) if (blocks[i].el.contains(el)) return i
    return -1
  }

  /**
   * Tamaño real del recurso de una imagen (srcset con `w` corrige
   * naturalWidth) y si es la versión más grande que ofrece el srcset.
   */
  const resourceSize = (img) => {
    const src = img.currentSrc || img.src
    const set = img.getAttribute('srcset')
    if (set) {
      let current = null
      let maxW = 0
      for (const part of set.split(',')) {
        const [u, d] = part.trim().split(/\s+/)
        if (!u || !d) continue
        const w = d.endsWith('w') ? Number(d.slice(0, -1)) : null
        if (w) maxW = Math.max(maxW, w)
        let abs
        try {
          abs = new URL(u, location.href).href
        } catch {
          continue
        }
        if (abs !== src) continue
        if (w) current = { w, h: (w * img.naturalHeight) / img.naturalWidth }
        else if (d.endsWith('x')) {
          const x = Number(d.slice(0, -1))
          current = { w: img.naturalWidth * x, h: img.naturalHeight * x }
        }
      }
      if (current) return { ...current, largest: !maxW || current.w >= maxW }
    }
    return { w: img.naturalWidth, h: img.naturalHeight, largest: true }
  }

  const imageIssue = (img, r, dpr) => {
    if (img.complete && img.naturalWidth === 0) {
      if (!(img.currentSrc || img.src)) return null
      return { kind: 'broken', detail: 'no cargó' }
    }
    if (!img.naturalWidth) return null
    const cs = getComputedStyle(img)
    const res = resourceSize(img)
    const nwc = img.naturalWidth
    const nhc = img.naturalHeight
    const fit = cs.objectFit
    let W = r.width
    let H = r.height
    if (fit === 'cover' || fit === 'contain' || fit === 'scale-down' || fit === 'none') {
      const sCover = Math.max(r.width / nwc, r.height / nhc)
      const sContain = Math.min(r.width / nwc, r.height / nhc)
      const s = fit === 'cover' ? sCover : fit === 'contain' ? sContain : fit === 'none' ? 1 : Math.min(1, sContain)
      W = nwc * s
      H = nhc * s
    } else {
      const ar = r.width / r.height / (nwc / nhc)
      if (Math.abs(ar - 1) > 0.03 && r.width > 24 && r.height > 24)
        return { kind: 'distorted', detail: `aspecto ${Math.round((ar - 1) * 100)}%` }
    }
    const up = Math.max((W * dpr) / res.w, (H * dpr) / res.h)
    if (up > 1.5 && r.width > 80) {
      const detail = `${up.toFixed(1)}× (${Math.round(res.w)}px → ${Math.round(W)}px css)`
      // Si había una versión más grande en el srcset, el `sizes` está corto
      // (se arregla en el código). Si ya es la más grande, falta un original
      // de más resolución: se avisa aparte y no cuenta como error.
      return res.largest ? { kind: 'master', detail } : { kind: 'low-res', detail: `${detail}, sizes corto` }
    }
    return null
  }

  /**
   * Audita lo que está a la vista (o dentro de `scopeSel`). Devuelve issues
   * con el bloque al que pertenecen. `seen` evita repetir el mismo elemento
   * entre posiciones de scroll.
   */
  const INLINE_DISPLAY = /^(inline|inline-block|inline-flex|inline-grid|contents)$/
  const nearestBlock = (node) => {
    for (let el = node.parentElement; el && el !== document.body; el = el.parentElement) {
      if (!INLINE_DISPLAY.test(getComputedStyle(el).display)) return el
    }
    return null
  }

  /**
   * Palabras de titulares partidas en dos líneas. Junta los nodos de texto de
   * cada bloque (SplitText reparte una palabra en varios nodos) y mira si el
   * rango de cada palabra cae en más de una línea.
   */
  const brokenWords = (root) => {
    const groups = new Map()
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    // Los nodos que son solo un espacio también cuentan: `{' '}` de React
    // separa palabras que si no se leerían pegadas («a» + «direction»).
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.nodeValue) continue
      const parent = n.parentElement
      if (!parent || parent.closest('svg, [aria-hidden="true"], [inert]')) continue
      const r = parent.getBoundingClientRect()
      if (!inView(r)) continue
      const block = nearestBlock(n)
      if (!block) continue
      if (!groups.has(block)) groups.set(block, [])
      groups.get(block).push(n)
    }
    const out = []
    const range = document.createRange()
    for (const [block, nodes] of groups) {
      const size = parseFloat(getComputedStyle(nodes[0].parentElement).fontSize)
      if (size < 18 || !visible(nodes[0].parentElement)) continue
      let text = ''
      const spans = []
      for (const n of nodes) {
        spans.push({ n, start: text.length })
        text += n.nodeValue
      }
      const at = (offset) => {
        let i = spans.length - 1
        while (i > 0 && spans[i].start > offset) i--
        return [spans[i].n, offset - spans[i].start]
      }
      for (const m of text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’-]{2,}/gu)) {
        const [sn, so] = at(m.index)
        const [en, eo] = at(m.index + m[0].length - 1)
        try {
          range.setStart(sn, so)
          range.setEnd(en, eo + 1)
        } catch {
          continue
        }
        const centers = [...range.getClientRects()].filter((q) => q.width > 0.5).map((q) => q.top + q.height / 2)
        if (centers.length < 2) continue
        if (Math.max(...centers) - Math.min(...centers) > size * 0.6) out.push({ block, word: m[0] })
      }
    }
    return out
  }

  mc.audit = ({ minTarget, tier, dpr, reduced, scopeSel }) => {
    mc.seen = mc.seen || new Set()
    const blocks = mc.blocks()
    const root = scopeSel ? document.querySelector(scopeSel) : document.getElementById('top') || document.body
    if (!root) return []
    const issues = []
    const report = (el, check, data) => {
      const key = `${idOf(el)}:${check}`
      if (mc.seen.has(key)) return
      mc.seen.add(key)
      const bi = blockIndexOf(blocks, el)
      issues.push({
        check,
        block: bi >= 0 ? blocks[bi].name : scopeSel ? 'menu' : '(fuera de sección)',
        component: mc.componentOf(el),
        ...describe(el),
        ...data,
      })
    }

    const vw = innerWidth
    const overflowed = new Set()
    const ancestorOverflowed = (el) => {
      for (let a = el.parentElement; a; a = a.parentElement) if (overflowed.has(a)) return true
      return false
    }
    for (const el of root.querySelectorAll('*')) {
      if (el.closest('svg') && !SVG_TEXT.has(el.tagName.toLowerCase())) continue
      const r = el.getBoundingClientRect()
      if (!inView(r)) continue
      const cs = getComputedStyle(el)
      if (cs.pointerEvents === 'none' && cs.position === 'fixed') continue

      // overflow: se sale del viewport y ningún ancestro lo recorta antes que el body.
      const over = Math.max(r.right - vw, -r.left)
      if (over > 2 && visible(el)) {
        let L = r.left
        let R = r.right
        for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
          const acs = getComputedStyle(a)
          if (overflowsX(acs)) {
            const ar = a.getBoundingClientRect()
            L = Math.max(L, ar.left)
            R = Math.min(R, ar.right)
          }
          if (acs.position === 'fixed') break
        }
        const visibleOver = Math.max(R - vw, -L)
        const straddles = L < vw && R > 0
        if (visibleOver > 2 && straddles && R - L > 0) {
          const track = r.width > vw * 1.45 || inTrack(el, null)
          if (!track && !ancestorOverflowed(el)) {
            overflowed.add(el)
            report(el, 'overflow', { detail: `+${Math.round(visibleOver)}px` })
          }
        }
      }

      const text = ownText(el)
      if (text && visible(el)) {
        const unit = copyUnit(el)
        let size = parseFloat(cs.fontSize)
        if (SVG_TEXT.has(el.tagName.toLowerCase()) && el.getScreenCTM) {
          const m = el.getScreenCTM()
          if (m) size *= Math.hypot(m.a, m.b)
        }
        if (size < 10.95) {
          report(unit, 'text<11', { detail: `${+size.toFixed(1)}px`, size: +size.toFixed(1) })
        } else if (tier === 'mobile' && size < 13.95 && (unit.textContent || '').trim().length > 90) {
          report(unit, 'body<14', { detail: `${+size.toFixed(1)}px`, size: +size.toFixed(1) })
        }

        // clipped: el texto sobresale de un ancestro que recorta, y se ve a medias.
        // En alto se compara la caja de línea (con interlineado apretado el
        // área de contenido de la fuente sobresale sin que se corte ningún
        // glifo) y se tolera ~1/5 del cuerpo.
        const tr0 = textRect(el)
        const lh = cs.lineHeight === 'normal' ? size * 1.2 : parseFloat(cs.lineHeight)
        const shrink = Math.max(0, (size * 1.15 - lh) / 2)
        const tr = tr0 && { ...tr0, top: tr0.top + shrink, bottom: tr0.bottom - shrink }
        const tolY = Math.max(4, size * 0.2)
        if (tr && tr.bottom > tr.top && !truncates(el)) {
          for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
            const acs = getComputedStyle(a)
            const cx = overflowsX(acs)
            const cy = overflowsY(acs)
            if (!cx && !cy) {
              if (acs.position === 'fixed') break
              continue
            }
            const ar = a.getBoundingClientRect()
            const outX = cx ? Math.max(tr.right - ar.right, ar.left - tr.left) : 0
            const outY = cy ? Math.max(tr.bottom - ar.bottom, ar.top - tr.top) : 0
            const partial =
              tr.left < ar.right && tr.right > ar.left && tr.top < ar.bottom && tr.bottom > ar.top
            if (partial && (outX > 3 || outY > tolY)) {
              if (outY <= tolY && inTrack(el, a.parentElement, ar)) break
              report(unit, 'clipped', {
                detail: outY > tolY ? `${Math.round(outY)}px en alto` : `${Math.round(outX)}px en ancho`,
              })
              break
            }
            if (acs.position === 'fixed') break
          }
        }
      }

      // hidden: con reduced motion todo el copy tiene que quedar visible, salvo lo que
      // el scroll revela a propósito (`data-scrub-tail`: el CTA del hero de MERIDIAN,
      // que sigue el scroll también en calma).
      if (reduced && text && !visible(el) && !el.closest('[inert],[aria-hidden="true"],[hidden],[data-scrub-tail]')) {
        if (cs.display !== 'none' && r.width > 4 && r.height > 4) {
          let why = cs.visibility === 'hidden' ? 'visibility hidden' : null
          for (let a = el; !why && a && a !== document.body; a = a.parentElement) {
            if (parseFloat(getComputedStyle(a).opacity) < 0.05) why = 'opacidad 0'
          }
          if (why) report(copyUnit(el), 'hidden', { detail: `${why} con reduced motion` })
        }
      }

      if (el.matches(CONTROLS) && visible(el)) {
        if (r.width <= 1 || r.height <= 1) continue // sr-only
        if (isInlineLink(el)) continue
        if (midTween(el)) continue
        const eff = hitSize(el, r, minTarget)
        if (eff && (eff.w < minTarget - 0.5 || eff.h < minTarget - 0.5)) {
          report(el, 'target', {
            detail: `${Math.round(eff.w)}×${Math.round(eff.h)} (mín ${minTarget})`,
          })
        }
      }

      if (el.tagName === 'IMG') {
        const issue = imageIssue(el, r, dpr)
        if (issue) {
          report(el, issue.kind === 'master' ? 'image-master' : 'image', { detail: `${issue.kind}: ${issue.detail}` })
        }
      }
    }
    for (const { block, word } of brokenWords(root)) {
      report(block, 'broken-word', { detail: `«${word}» partida en dos líneas` })
    }
    return issues
  }

  /** Imágenes cargadas: tamaño mostrado máximo por URL (para cruzar con los bytes). */
  mc.images = () => {
    const out = []
    for (const img of document.images) {
      const r = img.getBoundingClientRect()
      if (!img.naturalWidth) continue
      out.push({
        src: img.currentSrc || img.src,
        cssW: Math.round(r.width),
        cssH: Math.round(r.height),
        natW: img.naturalWidth,
        srcset: img.hasAttribute('srcset'),
        lazy: img.loading === 'lazy',
      })
    }
    return out
  }

  /** Canvas WebGL/2D: resolución del buffer vs. tamaño en pantalla. */
  mc.canvases = () =>
    [...document.querySelectorAll('canvas')]
      .map((c) => {
        const r = c.getBoundingClientRect()
        if (!r.width || !r.height) return null
        return { ratio: +(c.width / r.width).toFixed(2), cssW: Math.round(r.width), cssH: Math.round(r.height) }
      })
      .filter(Boolean)

  /**
   * Botón que abre el menú mobile (useMobileMenu pone aria-controls +
   * aria-expanded). Devuelve el id del panel tal cual: hay navs que montan el
   * panel recién al abrirlo, así que todavía puede no existir.
   */
  mc.menuTrigger = () => {
    for (const b of document.querySelectorAll('button[aria-controls][aria-expanded]')) {
      const r = b.getBoundingClientRect()
      if (r.width && r.height && visible(b) && r.top < innerHeight) return b.getAttribute('aria-controls')
    }
    return null
  }
}

// ---------------------------------------------------------------------------
// Orquestación
// ---------------------------------------------------------------------------

const slugOf = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()

async function auditJob(browser, base, job, opts) {
  const { template, width, reduced } = job
  const height = HEIGHT_FOR(width)
  const tier = tierOf(width)
  const minTarget = width < 1024 ? 44 : 24
  const mode = reduced ? 'reduce' : 'normal'
  const shotDir = path.join(OUT, template, mode, String(width))
  fs.rmSync(shotDir, { recursive: true, force: true })
  fs.mkdirSync(shotDir, { recursive: true })

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: DPR,
    isMobile: width < 1024,
    hasTouch: width < 1024,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  })
  await context.addInitScript(installBlockHelpers)
  await context.addInitScript(installPageHelpers)
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('scrolllab-splash-seen', '1')
      // El aviso «Ver con animaciones» (MotionNotice) tapa controles y capturas.
      localStorage.setItem('scrolllab-motion-notice', '1')
    } catch {
      /* ignore */
    }
  })
  await routePicsum(context)
  await routeGoogleFonts(context)

  const page = await context.newPage()
  const errors = []
  let fontsFailed = false
  const bytes = { img: 0, model: 0, byUrl: new Map() }
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return
    errors.push(text.slice(0, 240))
  })
  const ignoredUrl = (u) => IGNORED_URLS.some((re) => re.test(u))
  page.on('requestfailed', (req) => {
    const u = req.url()
    if (ignoredUrl(u) || req.failure()?.errorText === 'net::ERR_ABORTED') return
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) fontsFailed = true
    errors.push(`no cargó ${u.slice(0, 140)} (${req.failure()?.errorText})`)
  })
  page.on('response', (res) => {
    const u = res.url()
    if (res.status() >= 400 && !ignoredUrl(u)) errors.push(`HTTP ${res.status()} ${u.slice(0, 140)}`)
  })
  page.on('requestfinished', async (req) => {
    const url = req.url()
    if (url.startsWith('https://picsum.photos/')) return
    const type = req.resourceType()
    const isModel = /\.(glb|gltf|hdr|ktx2|bin)(\?|$)/i.test(url)
    if (type !== 'image' && !isModel) return
    try {
      const { responseBodySize } = await req.sizes()
      if (isModel) bytes.model += responseBodySize
      else {
        bytes.img += responseBodySize
        bytes.byUrl.set(url, (bytes.byUrl.get(url) || 0) + responseBodySize)
      }
    } catch {
      /* request cancelada */
    }
  })
  let reloaded = false
  let loaded = false
  page.on('framenavigated', (frame) => {
    if (loaded && frame === page.mainFrame()) reloaded = true
  })

  const url = `${base}/templates/${template}`
  const shots = []
  const issues = []
  let slowLoad = false
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    try {
      await page.waitForLoadState('load', { timeout: 30000 })
    } catch {
      slowLoad = true
    }
    await page.evaluate(() => document.fonts?.ready)
    // MERIDIAN abre con una pantalla de carga a pantalla completa (8 s la primera
    // vez): mientras está, tapa el hero y las zonas de toque no se pueden medir.
    // La ruta es lazy: se le da un respiro para que monte antes de esperar que se vaya.
    await page.waitForTimeout(1200)
    await page
      .waitForFunction(() => !document.querySelector('[role="status"][aria-label="Loading"]'), null, {
        timeout: 25000,
      })
      .catch(() => {})
    await page.waitForTimeout(1800)
    loaded = true

    const meta = await page.evaluate(() => window.__mc.blockMeta())
    const vh = height
    const positions = []
    meta.forEach((b, i) => {
      if (b.fixed) return
      const top = Math.max(0, Math.round(b.top))
      positions.push({ block: i, name: b.name, label: 'top', y: top })
      if (b.height > vh * 1.6) positions.push({ block: i, name: b.name, label: 'mid', y: Math.round(top + b.height / 2 - vh / 2) })
      if (b.height > vh * 4) positions.push({ block: i, name: b.name, label: 'end', y: Math.round(top + b.height - vh) })
    })

    let n = 0
    const shoot = async (name, label) => {
      const file = `${String(n++).padStart(2, '0')}-${slugOf(name)}-${label}.jpg`
      await page.screenshot({ path: path.join(shotDir, file), type: 'jpeg', quality: 62, scale: 'css', timeout: 60000 })
      shots.push({ name, label, file: path.relative(OUT, path.join(shotDir, file)) })
    }
    const auditHere = async (where, scopeSel) => {
      const found = await page.evaluate(
        (args) => window.__mc.audit(args),
        { minTarget, tier, dpr: DPR, reduced, scopeSel },
      )
      for (const f of found) issues.push({ ...f, where })
    }

    // Menú mobile: se abre arriba de todo, antes de scrollear.
    const menuId = await page.evaluate(() => window.__mc.menuTrigger())
    if (menuId) {
      try {
        // Click programático: con WebGL por software el botón puede no quedar
        // «estable» a tiempo para Playwright, y acá solo interesa abrir el panel.
        const menuSel = await page.evaluate((id) => {
          const button = [...document.querySelectorAll('button[aria-controls]')].find(
            (b) => b.getAttribute('aria-controls') === id,
          )
          if (!button) throw new Error(`sin botón para ${id}`)
          button.click()
          return `#${CSS.escape(id)}`
        }, menuId)
        await page.waitForTimeout(1500)
        await shoot('menu', 'open')
        await auditHere('menu', menuSel)
        await page.keyboard.press('Escape')
        // Cerrar con Escape devuelve el foco (visible) al botón: se saca para
        // que el anillo de foco no aparezca en todas las capturas.
        await page.evaluate(() => document.activeElement?.blur?.())
        await page.waitForTimeout(700)
      } catch (err) {
        issues.push({ check: 'error', block: 'menu', detail: `no se pudo abrir el menú: ${String(err).slice(0, 120)}`, where: 'menu' })
      }
    }

    let widened = false
    for (const pos of positions) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), pos.y)
      // El primer salto largo puede frenar el hilo principal más de un segundo
      // (decodificar fotos, dibujar por software): los fundidos de la calma
      // recién arrancan cuando vuelven los cuadros. Se espera a 3 cuadros
      // seguidos normales antes de contar el `settle`.
      await page
        .evaluate(
          () =>
            new Promise((resolve) => {
              const t0 = performance.now()
              let ok = 0
              let last = t0
              const loop = (t) => {
                ok = t - last < 80 ? ok + 1 : 0
                last = t
                if (ok >= 3 || t - t0 > 6000) resolve()
                else requestAnimationFrame(loop)
              }
              requestAnimationFrame(loop)
            }),
        )
        .catch(() => {})
      await page.waitForTimeout(opts.settle)
      // En un teléfono, algo que se sale por la derecha hace que el navegador
      // ensanche la pantalla (la página se ve achicada) y todas las medidas de
      // abajo se toman contra ese ancho inflado: no se ve como `overflow`.
      if (!widened && job.width < 1024) {
        const iw = await page.evaluate(() => window.innerWidth)
        if (iw > width + 1) {
          widened = true
          issues.push({
            check: 'overflow',
            block: pos.name,
            detail: `la pantalla se ensanchó a ${iw}px (el teléfono es de ${width}px): algo se sale por la derecha`,
            where: `${pos.name}:${pos.label}`,
          })
        }
      }
      // Con varias páginas en paralelo (y WebGL por software) una foto lazy
      // puede tardar más que el settle: se espera a las que están a la vista.
      await page
        .waitForFunction(
          () =>
            [...document.images].every((i) => {
              const r = i.getBoundingClientRect()
              const inView = r.bottom > 0 && r.top < innerHeight && r.width > 0 && r.height > 0
              return !inView || i.complete
            }),
          null,
          { timeout: 4000 },
        )
        .catch(() => {})
      await shoot(pos.name, pos.label)
      await auditHere(`${pos.name}:${pos.label}`)
    }

    const images = await page.evaluate(() => window.__mc.images())
    const canvases = await page.evaluate(() => window.__mc.canvases())
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)

    for (const e of errors) issues.push({ check: 'error', block: '(página)', detail: e, where: 'console' })
    if (slowLoad) issues.push({ check: 'error', block: '(página)', detail: 'el evento load tardó más de 30 s', where: 'load' })

    const imgSizes = new Map()
    for (const im of images) {
      const prev = imgSizes.get(im.src)
      if (!prev || im.cssW > prev.cssW) imgSizes.set(im.src, im)
    }
    const heaviest = [...bytes.byUrl.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([u, b]) => {
        const im = imgSizes.get(u)
        return {
          file: decodeURIComponent(u.split('/').pop().split('?')[0]),
          kb: Math.round(b / 1024),
          cssW: im?.cssW ?? null,
          natW: im?.natW ?? null,
        }
      })

    return {
      ...job,
      mode,
      tier,
      height,
      reloaded,
      fontsFailed,
      pageHeight,
      sections: meta.map((b) => b.name),
      shots,
      issues,
      bytes: { img: bytes.img, model: bytes.model },
      heaviest,
      images: {
        count: images.length,
        withSrcset: images.filter((i) => i.srcset).length,
        lazy: images.filter((i) => i.lazy).length,
      },
      canvases,
    }
  } catch (err) {
    issues.push({ check: 'error', block: '(página)', detail: `falló la auditoría: ${String(err).slice(0, 200)}`, where: 'job' })
    return { ...job, mode, tier, height, reloaded, pageHeight: 0, sections: [], shots, issues, bytes, heaviest: [], images: {}, canvases: [] }
  } finally {
    await context.close()
  }
}

/** Agrupa los issues de un template entre anchos: mismo bloque + check + elemento. */
function groupIssues(results) {
  const groups = new Map()
  for (const r of results) {
    for (const i of r.issues) {
      const key = [r.mode === 'reduce' && i.check === 'hidden' ? 'reduce' : '', i.block, i.check, i.tag, i.label].join('|')
      const allowKey = `${r.template}/${i.block.replace(/ \(\d+\)$/, '')}:${i.check}`
      if (ALLOW[allowKey]) continue
      if (!groups.has(key)) groups.set(key, { ...i, widths: new Set(), modes: new Set(), details: new Set() })
      const g = groups.get(key)
      g.widths.add(r.width)
      g.modes.add(r.mode)
      g.details.add(i.detail)
    }
  }
  const order = ['error', 'overflow', 'clipped', 'broken-word', 'hidden', 'image', 'text<11', 'target', 'body<14', 'image-master']
  return [...groups.values()].sort(
    (a, b) => order.indexOf(a.check) - order.indexOf(b.check) || a.block.localeCompare(b.block),
  )
}

const fmtWidths = (set) => {
  const ws = [...set].sort((a, b) => a - b)
  return ws.join(',')
}

const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`

function htmlEscape(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
}

/** Hoja de contacto: una fila por sección/posición, una columna por ancho. */
function writeSheet(template, results) {
  for (const mode of ['normal', 'reduce']) {
    const rs = results.filter((r) => r.mode === mode).sort((a, b) => a.width - b.width)
    if (!rs.length) continue
    const rowKeys = []
    for (const r of rs) {
      for (const s of r.shots) {
        const k = `${s.name} · ${s.label}`
        if (!rowKeys.includes(k)) rowKeys.push(k)
      }
    }
    const cell = (r, k) => {
      const s = r.shots.find((x) => `${x.name} · ${x.label}` === k)
      if (!s) return '<td class="empty"></td>'
      const name = s.name
      const n = r.issues.filter((i) => i.block === name && ERROR_CHECKS.has(i.check)).length
      const badge = n ? `<span class="badge">${n}</span>` : ''
      const rel = path.relative(path.join(OUT, template), path.join(OUT, s.file)).split(path.sep).join('/')
      return `<td><a href="${rel}">${badge}<img loading="lazy" src="${rel}" style="height:${
        r.width < 1024 ? 420 : 300
      }px"></a></td>`
    }
    const issuesHtml = groupIssues(rs)
      .map(
        (g) =>
          `<li class="${ERROR_CHECKS.has(g.check) ? 'err' : 'warn'}"><b>[${htmlEscape(g.block)}]</b> ${htmlEscape(
            g.check,
          )} · ${htmlEscape([...g.details].slice(0, 3).join(' / '))} · &lt;${htmlEscape(g.tag || '')}&gt; «${htmlEscape(
            g.label || '',
          )}» · <span class="w">@${fmtWidths(g.widths)}</span></li>`,
      )
      .join('\n')
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${template} · ${mode}</title>
<style>
:root{color-scheme:dark;--bg:#111;--fg:#eee;--mute:#999;--err:#ff6b5b;--warn:#e8c14a}
body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.45 ui-sans-serif,system-ui,sans-serif}
header{padding:16px}h1{margin:0 0 4px;font-size:18px}p{margin:0;color:var(--mute)}
.wrap{overflow-x:auto;padding:0 16px 24px}table{border-collapse:separate;border-spacing:8px}
th{position:sticky;top:0;background:var(--bg);text-align:left;font-weight:600;padding:4px 0}
th.row{position:sticky;left:0;z-index:1;max-width:160px;vertical-align:top;color:var(--mute);font-weight:500}
td{vertical-align:top;position:relative}td img{display:block;border:1px solid #333}
.badge{position:absolute;top:6px;left:6px;background:var(--err);color:#111;border-radius:99px;padding:1px 7px;font-weight:700}
ul{padding:0 16px 32px 32px}li.err{color:var(--err)}li.warn{color:var(--warn)}.w{color:var(--mute)}
</style></head><body>
<header><h1>${template.toUpperCase()} · motion ${mode}</h1>
<p>${rs.map((r) => `${r.width}px: img ${mb(r.bytes.img)}, alto ${r.pageHeight}px`).join(' · ')}</p></header>
<div class="wrap"><table><thead><tr><th></th>${rs.map((r) => `<th>${r.width}px</th>`).join('')}</tr></thead><tbody>
${rowKeys.map((k) => `<tr><th class="row">${htmlEscape(k)}</th>${rs.map((r) => cell(r, k)).join('')}</tr>`).join('\n')}
</tbody></table></div>
<ul>${issuesHtml || '<li>Sin issues.</li>'}</ul>
</body></html>`
    fs.writeFileSync(path.join(OUT, template, `sheet-${mode}.html`), html)
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  fs.mkdirSync(OUT, { recursive: true })

  let vite = null
  let base = process.env.BASE
  if (!base) {
    const port = await freePort()
    if (opts.snapshot) {
      const dir = path.join(REPO, 'storage', 'responsive-check', 'dist')
      buildSnapshot(dir)
      vite = await startPreview(port, dir)
    } else {
      vite = await startVite(port)
    }
    base = `http://127.0.0.1:${port}`
  }

  const jobs = []
  for (const template of opts.templates) {
    if (opts.motion !== 'reduce') for (const width of opts.widths) jobs.push({ template, width, reduced: false })
    if (opts.motion !== 'normal') for (const width of opts.reducedWidths) jobs.push({ template, width, reduced: true })
  }

  const browser = await launchChromium()

  const results = []
  const started = Date.now()
  let done = 0
  try {
    // Precalienta el dev server: la primera visita a un template puede hacer
    // que vite optimice dependencias y recargue la página.
    if (vite && !opts.snapshot) {
      const warm = await browser.newPage()
      for (const t of opts.templates) {
        await warm.goto(`${base}/templates/${t}`, { waitUntil: 'load', timeout: 90000 }).catch(() => {})
        await warm.waitForTimeout(1500)
      }
      await warm.close()
    }

    const queue = [...jobs]
    const worker = async () => {
      while (queue.length) {
        const job = queue.shift()
        let result = await auditJob(browser, base, job, opts)
        if (result.reloaded) result = await auditJob(browser, base, job, opts)
        results.push(result)
        done++
        const errs = result.issues.filter((i) => ERROR_CHECKS.has(i.check)).length
        console.log(
          `[${done}/${jobs.length}] ${job.template} ${job.width}px ${result.mode}: ${errs} issues · img ${mb(result.bytes.img)}`,
        )
      }
    }
    await Promise.all(Array.from({ length: Math.min(opts.workers, jobs.length) }, worker))
  } finally {
    await browser.close()
    vite?.kill()
  }

  // Reporte
  const lines = []
  let totalErrors = 0
  for (const template of opts.templates) {
    const rs = results.filter((r) => r.template === template).sort((a, b) => a.mode.localeCompare(b.mode) || a.width - b.width)
    if (!rs.length) continue
    writeSheet(template, rs)
    lines.push(`\n${template.toUpperCase()}`)
    for (const r of rs) {
      const count = (c) => r.issues.filter((i) => i.check === c).length
      const canvas = r.canvases.length ? ` · canvas ×${r.canvases.map((c) => c.ratio).join('/')}` : ''
      lines.push(
        `  ${String(r.width).padStart(4)} ${r.mode.padEnd(6)} alto ${String(r.pageHeight).padStart(6)} · img ${mb(r.bytes.img).padStart(8)}` +
          `${r.bytes.model ? ` · 3D ${mb(r.bytes.model)}` : ''}${canvas} · overflow ${count('overflow')} · clipped ${count('clipped')}` +
          ` · broken ${count('broken-word')}` +
          ` · text<11 ${count('text<11')} · body<14 ${count('body<14')} · target ${count('target')} · image ${count('image')}` +
          ` · master ${count('image-master')}` +
          ` · hidden ${count('hidden')} · error ${count('error')}`,
      )
    }
    const groups = groupIssues(rs)
    const errGroups = groups.filter((g) => ERROR_CHECKS.has(g.check))
    totalErrors += errGroups.length
    if (groups.length) lines.push('  —')
    for (const g of groups) {
      const modes = g.modes.size === 2 ? '' : ` (${[...g.modes][0]})`
      lines.push(
        `  ${ERROR_CHECKS.has(g.check) ? '✗' : '·'} [${g.block}] ${g.check} ${[...g.details].slice(0, 3).join(' / ')}` +
          ` <${g.tag || ''}> «${g.label || ''}»${g.component && g.component !== g.block.replace(/ \(\d+\)$/, '') ? ` {${g.component}}` : ''}` +
          ` @${fmtWidths(g.widths)}${modes}`,
      )
    }
    const r390 = rs.find((r) => r.width === 390 && r.mode === 'normal') || rs[0]
    if (r390?.heaviest?.length) {
      lines.push(`  pesadas @${r390.width}: ${r390.heaviest.map((h) => `${h.file} ${h.kb}KB (${h.natW}px→${h.cssW}css)`).join(', ')}`)
    }
  }
  if (results.some((r) => r.fontsFailed)) {
    lines.push('\n⚠ Google Fonts no cargó en Chromium: el texto se midió con la fuente de reemplazo (ver FONTS_VIA_CURL y CHROMIUM_ARGS).')
  }
  const secs = Math.round((Date.now() - started) / 1000)
  lines.push(`\n${totalErrors} grupos de issues · ${results.length} corridas · ${secs}s`)
  lines.push(`Hojas de contacto: ${path.relative(REPO, OUT)}/<template>/sheet-normal.html`)
  const text = lines.join('\n')
  console.log(text)
  fs.writeFileSync(path.join(OUT, 'report.txt'), `${text}\n`)
  fs.writeFileSync(
    path.join(OUT, 'report.json'),
    JSON.stringify(
      results.map(({ reloaded: _r, ...r }) => r),
      null,
      2,
    ),
  )
  process.exitCode = totalErrors ? 1 : 0
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
