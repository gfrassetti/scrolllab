const FALLBACK_LOADER_URL = 'https://embed.scrolllab.com.ar/v1/loader.js'
const FALLBACK_API = 'https://www.scrolllab.com.ar'

/** Stacks para los que hay un snippet listo. `html` es el default. */
export const EMBED_VARIANTS = ['html', 'react', 'next', 'vue']

function loaderUrl(loader) {
  return loader?.url || FALLBACK_LOADER_URL
}

function apiBase(loader) {
  return loader?.api || FALLBACK_API
}

/** El <script> crudo — para HTML, Webflow, WordPress, etc. */
function htmlSnippet(key, loader) {
  const url = loaderUrl(loader)
  const sri = loader?.integrity
    ? `\n  integrity="${loader.integrity}" crossorigin="anonymous"`
    : ''
  const apiAttr = loader?.api ? `\n  data-api="${loader.api}"` : ''
  return `<script src="${url}"${sri}\n  data-scrolllab data-key="${key}"${apiAttr} async></script>`
}

/**
 * Componente que carga el loader una vez y monta el embed vía
 * `window.ScrollLab.render`. Sirve igual en React, Preact y Next (client).
 */
function reactComponent(key, loader, { clientDirective = false } = {}) {
  const url = loaderUrl(loader)
  const api = apiBase(loader)
  const head = clientDirective ? "'use client'\n\n" : ''
  return `${head}import { useEffect, useRef } from 'react'

const LOADER = '${url}'
const API = '${api}'

export default function ScrollLabEmbed({ embedKey = '${key}' }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false
    const mount = () => {
      if (!cancelled) window.ScrollLab?.render?.(el, { key: embedKey, api: API })
    }

    if (window.ScrollLab?.render) {
      mount()
    } else {
      let s = document.querySelector('script[data-scrolllab-loader]')
      if (!s) {
        s = document.createElement('script')
        s.src = LOADER
        s.async = true
        s.dataset.scrolllabLoader = ''
        document.head.appendChild(s)
      }
      s.addEventListener('load', mount)
    }

    return () => {
      cancelled = true
      el.querySelector('iframe')?.remove()
      el.removeAttribute('data-scrolllab-done')
    }
  }, [embedKey])

  return <div ref={ref} />
}

// uso:  <ScrollLabEmbed embedKey="${key}" />`
}

/** Vue 3 (<script setup>). */
function vueComponent(key, loader) {
  const url = loaderUrl(loader)
  const api = apiBase(loader)
  return `<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'

const el = ref(null)
const embedKey = '${key}'
const LOADER = '${url}'
const API = '${api}'

onMounted(() => {
  const mount = () =>
    window.ScrollLab?.render?.(el.value, { key: embedKey, api: API })
  if (window.ScrollLab?.render) {
    mount()
  } else {
    const s = document.createElement('script')
    s.src = LOADER
    s.async = true
    s.addEventListener('load', mount)
    document.head.appendChild(s)
  }
})

onBeforeUnmount(() => {
  el.value?.querySelector('iframe')?.remove()
})
</script>

<template>
  <div ref="el" />
</template>`
}

/**
 * Snippet que el usuario pega en su sitio.
 *  - `html` (default): el <script> crudo. `data-api` lo manda el server en
 *    GET /api/embed/loader; SRI+crossorigin solo si `EMBED_SRI=true`.
 *  - `react` / `next` / `vue`: un componente que usa `window.ScrollLab.render`.
 */
export function embedSnippet(key, loader, variant = 'html') {
  switch (variant) {
    case 'react':
      return reactComponent(key, loader)
    case 'next':
      return reactComponent(key, loader, { clientDirective: true })
    case 'vue':
      return vueComponent(key, loader)
    default:
      return htmlSnippet(key, loader)
  }
}
