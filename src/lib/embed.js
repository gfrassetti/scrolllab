const FALLBACK_LOADER_URL = 'https://embed.scrolllab.com.ar/v1/loader.js'

/** Stacks para los que hay un snippet listo. `html` es el default. */
export const EMBED_VARIANTS = ['html', 'react', 'next', 'vue']

function loaderUrl(loader) {
  return loader?.url || FALLBACK_LOADER_URL
}

/** El <script> crudo — para HTML, Webflow, WordPress, etc. Autocontenido. */
function htmlSnippet(key, loader) {
  const url = loaderUrl(loader)
  const sri = loader?.integrity
    ? `\n  integrity="${loader.integrity}" crossorigin="anonymous"`
    : ''
  const apiAttr = loader?.api ? `\n  data-api="${loader.api}"` : ''
  return `<script src="${url}"${sri}\n  data-scrolllab data-key="${key}"${apiAttr} async></script>`
}

/**
 * Framework: solo el tag. El componente `<ScrollLabEmbed>` vive en el paquete
 * `@scrolllab/embed` (lo instala el dev); ya trae adentro el loader y el
 * endpoint. Acá no repetimos URLs ni el cableado — solo la key.
 */
function reactTag(key, { clientDirective = false } = {}) {
  const head = clientDirective ? "'use client'\n" : ''
  return `${head}import ScrollLabEmbed from '@scrolllab/embed'

<ScrollLabEmbed embedKey="${key}" />`
}

function vueTag(key) {
  return `<script setup>
import ScrollLabEmbed from '@scrolllab/embed/vue'
</script>

<template>
  <ScrollLabEmbed embed-key="${key}" />
</template>`
}

/**
 * Snippet que el usuario pega en su sitio.
 *  - `html` (default): el <script> crudo, autocontenido. `data-api` lo manda el
 *    server en GET /api/embed/loader; SRI+crossorigin solo si `EMBED_SRI=true`.
 *  - `react` / `next` / `vue`: solo el tag `<ScrollLabEmbed embedKey=…>`. El
 *    componente lo trae `@scrolllab/embed` (npm i @scrolllab/embed).
 */
export function embedSnippet(key, loader, variant = 'html') {
  switch (variant) {
    case 'react':
      return reactTag(key)
    case 'next':
      return reactTag(key, { clientDirective: true })
    case 'vue':
      return vueTag(key)
    default:
      return htmlSnippet(key, loader)
  }
}
