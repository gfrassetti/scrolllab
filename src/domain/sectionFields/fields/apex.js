import { toggle } from '../helpers.js'

/** @typedef {import('../types.js').SectionField} SectionField */

const FILM_HELP = {
  title: 'Cómo preparar el film',
  steps: [
    'Son cinco tomas 16:9 de al menos 4 s que se encadenan con fundidos y cierran en loop sin salto: la última funde dentro de la primera.',
    'node scripts/apex-reel.mjs arma todo desde tus clips: el film de escritorio (1080p), el vertical del teléfono (720×1280, con un recorte por toma), los pósters y el manifest.json con dónde empieza cada toma.',
    'Subí los archivos a tu sitio (o a un CDN) y pegá acá sus URL https://. Si dejás el manifest.json al lado del film, los capítulos se sincronizan solos; sin él, las tomas se toman como partes iguales.',
    'Sin una URL de teléfono, el teléfono usa el mismo film. Un film de 8–12 MB anda bien; más pesado, ofrecé un archivo aparte para el teléfono.',
  ],
}

/**
 * Campos editables de las secciones de APEX (builder + LAB).
 * El ensamblado y la lista completa: ../fields.js.
 * @type {Record<string, SectionField[]>}
 */
export const APEX_FIELDS = {
  'apex/Hero': [
    { key: 'brand', label: 'Marca', type: 'text' },
    { key: 'tagline', label: 'Frase junto a la marca', type: 'text' },
    {
      key: 'links',
      label: 'Nav — enlaces',
      type: 'list',
      max: 4,
      item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'href', label: 'Enlace', type: 'href' },
      ],
    },
    { key: 'ctaLabel', label: 'CTA', type: 'text' },
    { key: 'ctaHref', label: 'CTA — enlace', type: 'href' },
    { key: 'menuLabel', label: 'Teléfono — Menu', type: 'text' },
    { key: 'closeLabel', label: 'Teléfono — Cerrar', type: 'text' },
    { key: 'line1', label: 'Titular — línea 1', type: 'text' },
    { key: 'line2', label: 'Titular — línea 2', type: 'text' },
    { key: 'blurb', label: 'Bajada', type: 'textarea' },
    { key: 'discoverLabel', label: 'Enlace de la bajada', type: 'text' },
    { key: 'discoverHref', label: 'Enlace de la bajada — destino', type: 'href' },
    { key: 'scrollLabel', label: 'Indicador de scroll', type: 'text' },
    {
      key: 'chapters',
      label: 'Capítulos del film (uno por toma, en orden)',
      type: 'list',
      max: 8,
      item: [{ key: 'label', label: 'Nombre', type: 'text' }],
    },
    { key: 'chapterLabel', label: 'Capítulos — palabra de cada uno', type: 'text' },
    { key: 'chaptersLabel', label: 'Capítulos — nombre del grupo', type: 'text' },
    { key: 'filmSrc', label: 'Film (escritorio)', type: 'url', help: FILM_HELP },
    { key: 'filmSrcMobile', label: 'Film (teléfono, vertical)', type: 'url' },
    { key: 'poster', label: 'Póster (escritorio)', type: 'image' },
    { key: 'posterMobile', label: 'Póster (teléfono)', type: 'image' },
    toggle('showGrain', 'Grano de película'),
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de acento (capítulo activo)', type: 'color' },
    { key: 'washColor', label: 'Color del lavado sobre el film', type: 'color' },
  ],
}
