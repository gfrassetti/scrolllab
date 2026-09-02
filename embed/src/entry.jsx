import React from 'react'
import { createRoot } from 'react-dom/client'
import { ScrollTrigger } from './gsap'
import rawCss from './embed.css?inline'
import { loadSection } from './registry'

// Solo para el harness de prueba (pane oculto = rAF congelado): permite
// forzar ScrollTrigger.update() a mano. Inofensivo en prod.
if (typeof window !== 'undefined') window.__scrolllabST = ScrollTrigger

/*
 * Tailwind v4 declara sus tokens sobre :root. Dentro de un shadow root esa
 * regla no matchea nada (el shadow root no es un elemento), así que los
 * reapuntamos a :host. Runtime por ahora; TODO moverlo a un plugin de build.
 */
const EMBED_CSS = rawCss.replace(/:root\b/g, ':host')

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Space+Grotesk:wght@300..700&display=swap'

/** Las @font-face viven en el documento host: una vez cargadas sirven dentro del shadow. */
function ensureFonts() {
  if (document.querySelector('link[data-scrolllab-fonts]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = FONTS_HREF
  link.setAttribute('data-scrolllab-fonts', '')
  document.head.appendChild(link)
}

/*
 * Sin esto las secciones con pin/scrub calculan posiciones antes de que asiente
 * el layout (fuentes async, imágenes, resize del host) y el pin no engancha.
 * En el sitio esto lo hace SmoothScrollProvider; el embed no lo tiene.
 */
function orchestrateScrollTrigger(shadow) {
  const refresh = () => ScrollTrigger.refresh()

  requestAnimationFrame(() => requestAnimationFrame(refresh))

  if (document.fonts?.ready) document.fonts.ready.then(refresh)

  // imágenes dentro del shadow que carguen después
  shadow.querySelectorAll('img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', refresh, { once: true })
  })

  let t
  const onResize = () => {
    clearTimeout(t)
    t = setTimeout(refresh, 150)
  }
  window.addEventListener('resize', onResize, { passive: true })

  // último barrido cuando ya cargó todo
  window.addEventListener('load', refresh, { once: true })
}

async function fetchConfig(script, key) {
  const override = script.dataset.configUrl // solo para test local
  const api = script.dataset.api || 'https://cdn.scrolllab.com.ar'
  const url = override || `${api}/api/embed/${encodeURIComponent(key)}/config`
  const res = await fetch(url, { credentials: 'omit' })
  if (!res.ok) throw new Error(`config HTTP ${res.status}`)
  return res.json()
}

async function mount(script) {
  if (script.dataset.scrolllabReady) return
  script.dataset.scrolllabReady = '1'

  const key = script.dataset.key
  if (!key) {
    console.error('[scrolllab] <script> sin data-key')
    return
  }

  const host = document.createElement('div')
  host.setAttribute('data-scrolllab-embed', key)
  script.parentNode.insertBefore(host, script.nextSibling)

  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = EMBED_CSS
  shadow.appendChild(style)

  const mountPoint = document.createElement('div')
  mountPoint.className = 'scrolllab-root'
  shadow.appendChild(mountPoint)

  ensureFonts()

  let config
  try {
    config = await fetchConfig(script, key)
  } catch (err) {
    console.error('[scrolllab] no se pudo cargar la config:', err)
    return
  }

  const Section = await loadSection(config.sectionId)
  if (!Section) {
    console.error('[scrolllab] sección desconocida:', config.sectionId)
    return
  }

  createRoot(mountPoint).render(
    React.createElement(Section, config.props || {}),
  )

  orchestrateScrollTrigger(shadow)
}

function boot() {
  document
    .querySelectorAll('script[data-scrolllab][data-key]')
    .forEach((s) => {
      mount(s).catch((err) => console.error('[scrolllab] mount falló', err))
    })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
