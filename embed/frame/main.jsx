import { h, render } from 'preact'
import './main.css'
import { loadSection, canvasFor } from '../src/registry'
import { ScrollTrigger } from '../src/gsap'

const params = new URLSearchParams(location.hash.slice(1))
const key = params.get('key')
// El loader la pasa desde el snippet (`data-api`). Sin eso no sabemos dónde
// está la API — abortamos en vez de adivinar un dominio.
const api = (params.get('api') || '').replace(/\/$/, '')

/**
 * Origen de la página donde está embebida la sección: para el domain-lock y
 * para resolver sus links relativos. El fetch de la config sale de este iframe
 * (nuestro origen): sin esto el server veía siempre embed.scrolllab… y una
 * instancia con dominios cargados daba 403 también en el sitio autorizado.
 * Primero `ancestorOrigins` (lo fija el navegador, la página no lo puede
 * falsear; Chromium/WebKit), después el referrer (Firefox) y por último lo
 * que manda el loader. Es un freno para que nadie reuse la key, no un DRM.
 */
function hostOrigin() {
  try {
    const ancestors = location.ancestorOrigins
    if (ancestors && ancestors.length) return new URL(ancestors[0]).origin
  } catch {
    /* sigue */
  }
  try {
    if (document.referrer) return new URL(document.referrer).origin
  } catch {
    /* sigue */
  }
  try {
    return new URL(params.get('origin') || '').origin
  } catch {
    return ''
  }
}

function hostName(origin) {
  try {
    return new URL(origin).hostname
  } catch {
    return ''
  }
}

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i
const APP_LINK_RE = /^(mailto|tel|sms):/i

/**
 * Los links relativos (`/contacto`) son del sitio del cliente, no de
 * embed.scrolllab…: se reescriben a su URL absoluta para que un ctrl+click,
 * el botón del medio o «abrir en pestaña nueva» vayan al lugar correcto.
 */
function absolutizeLinks(origin) {
  if (!origin) return
  for (const a of root.querySelectorAll('a[href]')) {
    const href = (a.getAttribute('href') || '').trim()
    if (!href || href.startsWith('#') || href.startsWith('//') || SCHEME_RE.test(href)) continue
    try {
      a.setAttribute('href', new URL(href, `${origin}/`).href)
    } catch {
      /* queda como está */
    }
  }
}

/**
 * Click en un link dentro del embed. El iframe no puede navegar la página del
 * cliente (sandbox sin allow-top-navigation): antes un link externo cargaba el
 * otro sitio ADENTRO del iframe y un #ancla o «Back to top» no hacía nada.
 *  - `#ancla` → el loader hace scroll en la página del cliente.
 *  - un link del mismo sitio (relativo o con su dominio) → el loader navega,
 *    en la misma pestaña, como un link normal de su página.
 *  - mailto: / tel: → el navegador abre la app; el iframe no navega.
 *  - otro sitio → pestaña nueva.
 */
function routeLinks(origin) {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null
    if (!a) return
    const href = (a.getAttribute('href') || '').trim()
    if (href.startsWith('#')) {
      e.preventDefault()
      post({ type: 'scrolllab:anchor', hash: href })
      return
    }
    if (APP_LINK_RE.test(href)) return
    const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
    if (!href.startsWith('//') && !SCHEME_RE.test(href)) {
      // Relativo sin origen conocido: lo resuelve el loader contra su URL.
      e.preventDefault()
      if (!modified) post({ type: 'scrolllab:navigate', href })
      return
    }
    let url
    try {
      url = new URL(href, location.href)
    } catch {
      e.preventDefault()
      return
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      e.preventDefault() // javascript:, data:… — nada
      return
    }
    if (origin && url.origin === origin && !modified) {
      e.preventDefault()
      post({ type: 'scrolllab:navigate', href: url.href })
      return
    }
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
  })
}

// Por qué la API no entrega la sección (ver /api/embed/:key/config).
const WHY = {
  402: 'está pausada: el plan de LAB no la cubre',
  403: 'este dominio no está en los dominios permitidos de la sección (LAB → editor)',
  404: 'la key no existe (¿se borró la sección?)',
  409: 'todavía no se publicó',
}

const root = document.getElementById('root')

/*
 * Dos modos:
 *  - FLOW: la sección mide su alto natural. El loader dimensiona el iframe a eso
 *    y avisa `inView` para revelar la entrada. (FooterCTA, heroes, etc.)
 *  - PIN: la sección crea un pin-spacer (ScrollTrigger `pin: true`) que agranda
 *    el documento del frame. El loader lo pinea en el host con `position:sticky`
 *    y le manda `progress` 0→1, que el frame traduce a `window.scrollTo`. Así el
 *    pin/scrub de la sección corre nativo, sin tocarla.
 *
 * La decisión PIN/FLOW se toma contra el alto del viewport DEL HOST (que manda
 * el loader), no contra `window.innerHeight`: mientras el iframe está en
 * `height:0` su innerHeight es 0 y cualquier contenido parecería PIN.
 */
let mode = null // null = todavía sin decidir
let hostVh = 0

/**
 * `--sl-vh` = 1vh del SITIO del cliente. El build reescribe `vh`/`svh` de las
 * secciones a `calc(var(--sl-vh) * N)` (embed/hostViewportUnits.js): dentro
 * del iframe esas unidades medían el propio iframe, que en FLOW mide lo que su
 * contenido, y una sección con `pt-[30svh]` crecía sin fin. Como `svh`, no
 * sigue los cambios chicos (la barra del navegador en mobile): solo rotación
 * o un resize grande.
 */
let slVh = 0
function setHostVh(px) {
  const next = Number(px) / 100
  if (!(next > 0)) return
  if (slVh && Math.abs(next - slVh) / slVh < 0.2) return
  slVh = next
  document.documentElement.style.setProperty('--sl-vh', `${next}px`)
}
let scrollMax = 0
let revealed = false

function post(msg) {
  parent.postMessage(msg, '*')
}

function postHeight() {
  post({ type: 'scrolllab:height', px: Math.ceil(document.documentElement.scrollHeight) })
}

function reveal() {
  if (revealed) return
  revealed = true
  root.setAttribute('data-inview', '')
}

function decide() {
  if (!hostVh) return
  // PIN solo si la sección REALMENTE se pinea: ScrollTrigger inserta un
  // `<div class="pin-spacer">` cuando hace `pin: true`. Una sección estática
  // alta (FooterCTA, un hero largo) NO tiene pin-spacer → va en FLOW y el
  // iframe crece a su alto. (Antes: `scrollHeight > viewport` → cualquier
  // sección alta caía en PIN por error y se veía cortada.)
  const pinned = !!document.querySelector('.pin-spacer')
  const next = pinned ? 'pin' : 'flow'
  if (next !== mode) mode = next

  if (mode === 'pin') {
    scrollMax = Math.max(0, document.documentElement.scrollHeight - hostVh)
    reveal() // en PIN el "estar en pantalla" lo maneja el sticky del loader
    post({ type: 'scrolllab:pinlength', px: scrollMax })
  } else {
    postHeight()
  }
}

function onMessage(e) {
  const m = e.data
  if (!m || typeof m !== 'object') return

  if (m.type === 'scrolllab:viewport') {
    if (m.viewportHeight) {
      hostVh = m.viewportHeight
      setHostVh(m.viewportHeight)
    }
    if (mode === null) decide()
    if (mode === 'flow' && m.inView && !revealed) {
      reveal()
      ScrollTrigger.refresh()
      requestAnimationFrame(postHeight)
    }
    return
  }

  if (m.type === 'scrolllab:progress' && mode === 'pin') {
    window.scrollTo(0, (Number(m.progress) || 0) * scrollMax)
    ScrollTrigger.update()
  }
}

async function main() {
  if (!key) {
    console.error('[scrolllab] frame sin key')
    return
  }
  if (!api) {
    console.error('[scrolllab] frame sin api (falta data-api en el <script>)')
    return
  }

  // Embebido: las unidades de viewport miden el sitio desde el primer render.
  if (window.parent !== window) setHostVh(params.get('vh'))

  const origin = hostOrigin()
  let config
  try {
    const host = hostName(origin)
    const res = await fetch(
      `${api}/api/embed/${encodeURIComponent(key)}/config${host ? `?host=${encodeURIComponent(host)}` : ''}`,
      { credentials: 'omit' },
    )
    if (!res.ok) throw new Error(`${WHY[res.status] || 'error'} (HTTP ${res.status})`)
    config = await res.json()
  } catch (err) {
    // El iframe queda en alto 0: en el sitio del cliente no se ve nada roto.
    // El motivo queda en la consola para quien lo está instalando.
    console.error('[scrolllab] la sección no se muestra:', err.message || err)
    return
  }

  const Section = await loadSection(config.sectionId)
  if (!Section) {
    console.error('[scrolllab] sección desconocida:', config.sectionId)
    return
  }

  // Canvas del modelo: fuera del sitio la sección no hereda `wrapperClass`.
  const canvas = canvasFor(config.sectionId)
  if (canvas) root.className = canvas

  render(h(Section, config.props || {}), root)

  // Abierto directo (sin loader / fuera de un iframe): no va a llegar
  // `scrolllab:viewport`, así que nos revelamos solos para que la URL del
  // frame sirva de preview. Dentro del embed real `parent !== window`.
  if (window.parent === window) {
    hostVh = window.innerHeight
    reveal()
    requestAnimationFrame(() => {
      ScrollTrigger.refresh()
      decide()
    })
    return
  }

  absolutizeLinks(origin)
  routeLinks(origin)
  window.addEventListener('message', onMessage)
  // Handshake: el loader manda `viewport` en load/scroll/resize; si el load ya
  // pasó cuando montamos, se perdió. Pedímoslo.
  post({ type: 'scrolllab:hello' })
  ScrollTrigger.addEventListener('refresh', () => {
    if (mode !== null) decide()
  })

  requestAnimationFrame(() => {
    ScrollTrigger.refresh()
    decide()
  })

  const ro = new ResizeObserver(() => {
    if (mode === 'flow') postHeight()
  })
  ro.observe(document.documentElement)

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh())
  }
  window.addEventListener('load', () => ScrollTrigger.refresh())
  window.addEventListener('resize', () => ScrollTrigger.refresh())
}

main()
