/*
 * ScrollLab embed loader — lo que el cliente pega en su página.
 *
 * Su ÚNICO trabajo: crear un <iframe> cross-origin que apunta a nuestra página
 * /frame y ahí adentro se renderiza la sección. El loader NO toca el DOM del
 * cliente más allá de insertar el iframe (y, para secciones con pin, un div
 * contenedor). Toda la lógica pesada vive dentro del iframe, en NUESTRO origen,
 * aislada por el navegador de las cookies / formularios / storage del host.
 *
 * Modos:
 *  - FLOW: el frame manda su alto (`scrolllab:height`) y el loader dimensiona
 *    el iframe. El loader avisa `inView` para la animación de entrada.
 *  - PIN: el frame manda cuánto scroll necesita (`scrolllab:pinlength`). El
 *    loader mete el iframe en un contenedor alto y lo hace `position:sticky`,
 *    y en cada frame le manda `progress` 0→1 según cuánto scrolleó el host.
 *
 * <script src="https://embed.scrolllab.com.ar/embed/v1/loader.js"
 *         integrity="sha384-…" crossorigin="anonymous"
 *         data-scrolllab data-key="pub_xxxxx" async></script>
 */
import { clamp, resolveFrameBase } from './lib.js'

;(function () {
  'use strict'

  // Último recurso: si no se puede leer el `src` del propio <script> (inline,
  // navegador raro), el frame se sirve desde acá.
  var FRAME_BASE_FALLBACK = 'https://embed.scrolllab.com.ar/embed/v1'

  var nodes = document.querySelectorAll(
    'script[data-scrolllab][data-key]:not([data-scrolllab-done])',
  )
  for (var i = 0; i < nodes.length; i++) mount(nodes[i])

  function mount(script) {
    script.setAttribute('data-scrolllab-done', '1')

    var key = script.getAttribute('data-key')
    if (!key) {
      console.error('[scrolllab] <script> sin data-key')
      return
    }

    var frameBase = resolveFrameBase(script, FRAME_BASE_FALLBACK)
    var api = script.getAttribute('data-api') || ''
    var src =
      frameBase +
      '/frame/index.html#key=' +
      encodeURIComponent(key) +
      (api ? '&api=' + encodeURIComponent(api) : '')

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
    // ni allow-top-navigation: no puede navegar la página del cliente.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups')
    iframe.setAttribute('data-scrolllab-frame', key)
    iframe.style.cssText =
      'display:block;width:100%;border:0;overflow:hidden;height:0;' +
      'transition:height .18s ease;background:transparent'

    script.parentNode.insertBefore(iframe, script.nextSibling)

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

    window.addEventListener('message', function (e) {
      if (frameOrigin && e.origin !== frameOrigin) return
      if (e.source !== iframe.contentWindow) return
      var m = e.data
      if (!m || typeof m !== 'object') return
      if (m.type === 'scrolllab:hello') {
        push() // el frame ya está listo: mandale su posición en el viewport
      } else if (m.type === 'scrolllab:height' && !pinMode && typeof m.px === 'number') {
        iframe.style.height = Math.max(0, Math.round(m.px)) + 'px'
      } else if (m.type === 'scrolllab:pinlength' && typeof m.px === 'number') {
        if (m.px > 8) enterPinMode(m.px)
      }
    })

    // Puente host → iframe: el frame no puede leer su posición en el viewport
    // del host, así que se la mandamos cada frame.
    var ticking = false
    function push() {
      ticking = false
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
          inView: r.top < vh && r.top + r.height > 0,
        },
        frameOrigin || '*',
      )
    }
    function schedule() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(push)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', function () {
      sizeWrap()
      schedule()
    })
    iframe.addEventListener('load', push)
  }
})()
