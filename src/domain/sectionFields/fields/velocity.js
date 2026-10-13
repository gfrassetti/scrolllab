import { navLinks, toggle } from '../helpers.js'

/** @typedef {import('../types.js').SectionField} SectionField */

/**
 * Campos editables de las secciones de VELOCITY (builder + LAB).
 * El ensamblado y la lista completa: ../fields.js.
 * @type {Record<string, SectionField[]>}
 */
export const VELOCITY_FIELDS = {
  'velocity/NavVelocity': [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'cta', label: 'CTA', type: 'text' },
    { key: 'ctaHref', label: 'CTA — enlace', type: 'href' },
    navLinks(),
    { key: 'menuLabel', label: 'Botón de menú — nombre para lectores de pantalla', type: 'text' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'bg', label: 'Menú móvil — color de fondo', type: 'color' },
    { key: 'accent', label: 'Color del CTA y de los números', type: 'color' },
  ],
  'velocity/HeroStrike': [
    { key: 'lineLeft', label: 'Line left', type: 'text' },
    { key: 'lineLeft2', label: 'Line left 2', type: 'text' },
    { key: 'lineRight', label: 'Line right', type: 'text' },
    { key: 'lineRight2', label: 'Line right 2', type: 'text' },
    { key: 'caption', label: 'Caption', type: 'text' },
    { key: 'imgBack', label: 'Layer back (URL)', type: 'image' },
    { key: 'imgMid', label: 'Layer mid (URL)', type: 'image' },
    { key: 'imgFront', label: 'Layer front (URL)', type: 'image' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de las líneas destacadas', type: 'color' },
  ],
  'velocity/HelmetGrid': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'items',
      label: 'Piezas',
      type: 'list',
      max: 6,
      item: [
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'year', label: 'Año / nº', type: 'text' },
        { key: 'img', label: 'Imagen (URL)', type: 'image' },
      ],
    },
    { key: 'accent', label: 'Color de acento (rótulo, años y contorno activo)', type: 'color' },
  ],
  'velocity/TrackMerge': [
    { key: 'trackLabel', label: 'Rótulo de las filas', type: 'text' },
    {
      key: 'rowA',
      label: 'Fila de arriba — fotos',
      type: 'list',
      max: 6,
      item: [
        { key: 'label', label: 'Título', type: 'text' },
        { key: 'img', label: 'Foto (vacío = la de la demo)', type: 'image' },
      ],
    },
    { key: 'quote', label: 'Fila de arriba — cita', type: 'textarea' },
    { key: 'quoteCaption', label: 'Fila de arriba — firma de la cita', type: 'text' },
    {
      key: 'rowB',
      label: 'Fila de abajo — fotos',
      type: 'list',
      max: 6,
      item: [
        { key: 'label', label: 'Título', type: 'text' },
        { key: 'img', label: 'Foto (vacío = la de la demo)', type: 'image' },
      ],
    },
    { key: 'pathLabelA', label: 'Path label A', type: 'text' },
    { key: 'pathImgA', label: 'Path A — foto', type: 'image' },
    { key: 'pathLabelB', label: 'Path label B', type: 'text' },
    { key: 'pathImgB', label: 'Path B — foto', type: 'image' },
    { key: 'mergeTitleA', label: 'Merge title A', type: 'text' },
    { key: 'mergeTitleB', label: 'Merge title B', type: 'text' },
    { key: 'mergeAccent', label: 'Merge accent', type: 'text' },
    { key: 'bg', label: 'Fondo de la galería', type: 'color' },
    { key: 'bg2', label: 'Fondo del cruce', type: 'color' },
    { key: 'endBg', label: 'Fondo al salir (el de la sección siguiente)', type: 'color' },
    { key: 'fg', label: 'Texto sobre la galería', type: 'color' },
    { key: 'fg2', label: 'Texto sobre el fondo del cruce', type: 'color' },
    { key: 'accent', label: 'Color de acento (rótulos y la letra destacada)', type: 'color' },
    toggle('showTexture', 'Textura de anillos detrás de la galería'),
  ],
  'velocity/ParallaxRise': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'cta', label: 'CTA', type: 'text' },
    { key: 'ctaHref', label: 'CTA — enlace', type: 'href' },
    { key: 'img', label: 'Imagen de fondo (URL)', type: 'image' },
    { key: 'bg', label: 'Color de fondo y del velo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de acento (eyebrow y botón)', type: 'color' },
  ],
  'velocity/FooterVelocity': [
    { key: 'line', label: 'Line', type: 'text' },
    { key: 'email', label: 'Email de contacto (vacío: no se muestra)', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'backToTop', label: 'Volver arriba — texto', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color del link «volver arriba»', type: 'color' },
  ],
}
