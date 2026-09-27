/*
 * ScrollLab embed loader — lo que el cliente pega en su página.
 *
 * Su ÚNICO trabajo: crear un <iframe> cross-origin que apunta a nuestra página
 * /frame y ahí adentro se renderiza la sección. El loader NO toca el DOM del
 * cliente más allá de insertar el iframe (y, para secciones con pin, un div
 * contenedor). Toda la lógica pesada vive dentro del iframe, en NUESTRO origen,
 * aislada por el navegador de las cookies / formularios / storage del host.
 *
 * Dos formas de usarlo:
 *
 *  1. HTML — pegás el <script>; al cargar escanea los tags y monta cada uno.
 *
 *       <script src="https://embed.scrolllab.com.ar/v1/loader.js"
 *               data-scrolllab data-key="pub_xxxxx" async></script>
 *
 *  2. Framework (React/Vue/Next/…) — el <script> se carga una vez y el
 *     componente monta cuando quiere:
 *
 *       window.ScrollLab.render(elemento, { key: 'pub_xxxxx', api, frame })
 *       window.ScrollLab.scan()   // re-escanea <script data-scrolllab> nuevos
 *
 * Modos de render (idénticos en las dos formas):
 *  - FLOW: el frame manda su alto (`scrolllab:height`) y el loader dimensiona
 *    el iframe. El loader avisa `inView` para la animación de entrada.
 *  - PIN: el frame manda cuánto scroll necesita (`scrolllab:pinlength`). El
 *    loader mete el iframe en un contenedor alto y lo hace `position:sticky`,
 *    y en cada frame le manda `progress` 0→1 según cuánto scrolleó el host.
 */
import { anchorTarget, clamp, resolveFrameBase, sameOriginUrl } from './lib.js'

;(function () {
  'use strict'

  // Último recurso: si no se puede leer el `src` del propio <script> (inline,
  // navegador raro), el frame se sirve desde acá.
  var FRAME_BASE_FALLBACK = 'https://embed.scrolllab.com.ar/v1'

  // El `src` de este mismo loader — para derivar la base del frame cuando
  // `render()` se llama sin un <script> de referencia.
  var SELF_SRC =
    (document.currentScript && document.currentScript.src) ||
    (function () {
      var s = document.querySelector('script[data-scrolllab][src]')
      return s ? s.src : ''
    })()

  // ── API pública ──────────────────────────────────────────────────────
  if (!window.ScrollLab) window.ScrollLab = {}
  window.ScrollLab.render = render
  window.ScrollLab.scan = scan

  scan()
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan)
  }

  // Monta todo <script data-scrolllab data-key> que no se haya montado aún.
  function scan() {
    var nodes = document.querySelectorAll(
      'script[data-scrolllab][data-key]:not([data-scrolllab-done])',
    )
    for (var i = 0; i < nodes.length; i++) mountFromScript(nodes[i])
  }

  function mountFromScript(script) {
    script.setAttribute('data-scrolllab-done', '1')
    var key = script.getAttribute('data-key')
    if (!key) {
      console.error('[scrolllab] <script> sin data-key')
      return
    }
    mount({
      key: key,
      apiUrl: script.getAttribute('data-api') || '',
      frameBase: resolveFrameBase(script, FRAME_BASE_FALLBACK),
      parent: script.parentNode,
      before: script.nextSibling,
    })
  }

  /**
   * Monta un embed dentro de `target` (elemento o selector). Para frameworks.
   * `opts`: { key, api, frame }. Idempotente por `data-scrolllab-done`.
   */
  function render(target, opts) {
    opts = opts || {}
    var el = typeof target === 'string' ? document.querySelector(target) : target
    if (!el || !el.setAttribute) {
      console.error('[scrolllab] render: target inválido', target)
      return
    }
    var key = opts.key || el.getAttribute('data-key') || ''
    if (!key) {
      console.error('[scrolllab] render: falta `key`')
      return
    }
    if (el.getAttribute('data-scrolllab-done')) return // ya montado
    el.setAttribute('data-scrolllab-done', '1')

    // Shim con la forma que espera `resolveFrameBase` (getAttribute + src).
    var shim = {
      src: SELF_SRC,
      getAttribute: function (n) {
        return n === 'data-frame' ? opts.frame || null : null
      },
    }
    mount({
      key: key,
      apiUrl: opts.api || el.getAttribute('data-api') || '',
      frameBase: resolveFrameBase(shim, FRAME_BASE_FALLBACK),
      parent: el,
      before: null, // insertBefore(node, null) === appendChild
    })
  }

  // ── Montaje real ─────────────────────────────────────────────────────
  function mount(o) {
    var key = o.key
    // `origin`: el sitio del cliente (domain-lock, links relativos). El frame
    // usa primero lo que le da el navegador (ancestorOrigins / referrer); esto
    // es el respaldo. `vh`: alto del viewport, para que `vh`/`svh` de la
    // sección midan esta página y no el iframe desde el primer render.
    var src =
      o.frameBase +
      '/frame/index.html#key=' +
      encodeURIComponent(key) +
      (o.apiUrl ? '&api=' + encodeURIComponent(o.apiUrl) : '') +
      (/^https?:$/.test(location.protocol)
        ? '&origin=' + encodeURIComponent(location.origin)
        : '') +
      '&vh=' +
      Math.round(window.innerHeight || document.documentElement.clientHeight || 0)

    var frameOrigin
    try {
      frameOrigin = new URL(src, location.href).origin
    } catch {
      frameOrigin = null
    }

    var iframe = document.createElement('iframe')
    iframe.src = src
    iframe.title = 'ScrollLab'
    iframe.loading = 'lazy'
    iframe.setAttribute('scrolling', 'no')
    // allow-same-origin: el frame corre en NUESTRO origen (fetch a la config,
    // fuentes). Sigue aislado del host porque es otro origen. Sin allow-forms
    // ni allow-top-navigation: no puede navegar la página del cliente. Los
    // links abren en pestaña nueva (allow-popups) y esa pestaña es una página
    // normal, no un sandbox heredado donde el sitio de destino se rompe
    // (allow-popups-to-escape-sandbox).
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox',
    )
    iframe.setAttribute('data-scrolllab-frame', key)
    iframe.style.cssText =
      'display:block;width:100%;border:0;overflow:hidden;height:0;' +
      'transition:height .18s ease;background:transparent'

    o.parent.insertBefore(iframe, o.before || null)

    var pinMode = false
    var pinLen = 0
    var wrap = null

    function sizeWrap() {
      if (!wrap) return
      var vh = window.innerHeight || document.documentElement.clientHeight
      wrap.style.height = vh + pinLen + 'px'
    }

    function enterPinMode(px) {
      pinLen = Math.max(0, Math.round(px))
      if (pinMode) {
        sizeWrap()
        return
      }
      pinMode = true
      wrap = document.createElement('div')
      wrap.setAttribute('data-scrolllab-pin', key)
      wrap.style.cssText = 'position:relative;width:100%'
      iframe.parentNode.insertBefore(wrap, iframe)
      wrap.appendChild(iframe)
      iframe.style.cssText =
        'display:block;width:100%;border:0;overflow:hidden;background:transparent;' +
        'position:sticky;position:-webkit-sticky;top:0;height:100vh'
      sizeWrap()
      push()
    }

    function onMessage(e) {
      if (frameOrigin && e.origin !== frameOrigin) return
      if (e.source !== iframe.contentWindow) return
      var m = e.data
      if (!m || typeof m !== 'object') return
      if (m.type === 'scrolllab:hello') {
        push() // el frame ya está listo: mandale su posición en el viewport
      } else if (m.type === 'scrolllab:height' && !pinMode && typeof m.px === 'number') {
        iframe.style.height = Math.max(0, Math.round(m.px)) + 'px'
        // Cambió su rect: puede haber entrado en pantalla sin que nadie scrollee
        // (un embed arriba de todo, con alto 0 hasta acá, nunca se revelaba).
        schedule()
      } else if (m.type === 'scrolllab:pinlength' && typeof m.px === 'number') {
        if (m.px > 8) enterPinMode(m.px)
      } else if (m.type === 'scrolllab:anchor') {
        scrollHost(anchorTarget(m.hash))
      } else if (m.type === 'scrolllab:navigate') {
        navigateHost(m.href)
      }
    }

    // Puente host → iframe: el frame no puede leer su posición en el viewport
    // del host, así que se la mandamos cada frame.
    var ticking = false
    function push() {
      ticking = false
      // Un framework desmontó el embed (React/Vue sacan el iframe al
      // desmontar): se sueltan los listeners en vez de quedar colgados.
      if (!iframe.isConnected) return detach()
      var w = iframe.contentWindow
      if (!w) return
      var vh = window.innerHeight || document.documentElement.clientHeight

      if (pinMode && wrap) {
        var wr = wrap.getBoundingClientRect()
        var progress = pinLen > 0 ? clamp(-wr.top / pinLen, 0, 1) : 0
        w.postMessage(
          { type: 'scrolllab:progress', progress: progress },
          frameOrigin || '*',
        )
        return
      }

      var r = iframe.getBoundingClientRect()
      w.postMessage(
        {
          type: 'scrolllab:viewport',
          rectTop: r.top,
          rectHeight: r.height,
          viewportHeight: vh,
          inView: r.top < vh && r.top + r.height >= 0,
        },
        frameOrigin || '*',
      )
    }
    function schedule() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(push)
    }

    function onResize() {
      sizeWrap()
      schedule()
    }
    function detach() {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
    }

    window.addEventListener('message', onMessage)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    iframe.addEventListener('load', push)
  }

  // «Back to top» o un #ancla dentro del embed: el scroll es de la página del
  // cliente. No toca `location.hash` (un router del host podría reaccionar).
  function scrollHost(t) {
    if (!t) return
    var reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    var behavior = reduce ? 'auto' : 'smooth'
    var el = t.id ? document.getElementById(t.id) : null
    if (el) el.scrollIntoView({ behavior: behavior, block: 'start' })
    else if (t.top) window.scrollTo({ top: 0, behavior: behavior })
  }

  // Un link del propio sitio tocado dentro del embed: navega esta página, en la
  // misma pestaña. Solo a URLs de este mismo origen (nunca a otro sitio) y solo
  // justo después de un click (el del iframe activa también a esta página).
  function navigateHost(href) {
    var url = sameOriginUrl(href, location.href)
    if (!url) return
    var ua = navigator.userActivation
    if (ua && !ua.isActive) return
    location.assign(url)
  }
})()
