import { h, render } from 'preact'
import './main.css'
import { loadSection } from '../src/registry'
import { ScrollTrigger } from '../src/gsap'

const params = new URLSearchParams(location.hash.slice(1))
const key = params.get('key')
// El loader la pasa desde el snippet (`data-api`). Sin eso no sabemos dónde
// está la API — abortamos en vez de adivinar un dominio.
const api = (params.get('api') || '').replace(/\/$/, '')

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
  scrollMax = Math.max(0, document.documentElement.scrollHeight - hostVh)
  const next = scrollMax > 8 ? 'pin' : 'flow'
  if (next !== mode) mode = next

  if (mode === 'pin') {
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
    if (m.viewportHeight) hostVh = m.viewportHeight
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

  let config
  try {
    const res = await fetch(`${api}/api/embed/${encodeURIComponent(key)}/config`, {
      credentials: 'omit',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    config = await res.json()
  } catch (err) {
    console.error('[scrolllab] no se pudo cargar la config:', err)
    return
  }

  const Section = await loadSection(config.sectionId)
  if (!Section) {
    console.error('[scrolllab] sección desconocida:', config.sectionId)
    return
  }

  render(h(Section, config.props || {}), root)

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
