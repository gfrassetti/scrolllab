import { navLinks, toggle } from '../helpers.js'

/** @typedef {import('../types.js').SectionField} SectionField */

/**
 * Campos editables de las secciones de VELOCITY (builder + LAB).
 * El ensamblado y la lista completa: ../fields.js.
 * @type {Record<string, SectionField[]>}
 */
export const VELOCITY_FIELDS = {
  'velocity/NavVelocity': [
    { key: 'brand', label: 'Marca', type: 'text' },
    { key: 'cta', label: 'Botón', type: 'text' },
    { key: 'ctaHref', label: 'Botón — enlace', type: 'href' },
    navLinks(),
    { key: 'menuLabel', label: 'Botón de menú — nombre para lectores de pantalla', type: 'text' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'bg', label: 'Menú móvil — color de fondo', type: 'color' },
    { key: 'accent', label: 'Color del botón y de los números', type: 'color' },
  ],
  'velocity/HeroStrike': [
    { key: 'lineLeft', label: 'Línea izquierda', type: 'text' },
    { key: 'lineLeft2', label: 'Línea izquierda 2', type: 'text' },
    { key: 'lineRight', label: 'Línea derecha', type: 'text' },
    { key: 'lineRight2', label: 'Línea derecha 2', type: 'text' },
    { key: 'caption', label: 'Epígrafe', type: 'text' },
    { key: 'imgBack', label: 'Capa de fondo (URL)', type: 'image' },
    { key: 'imgMid', label: 'Capa del medio (URL)', type: 'image' },
    { key: 'imgFront', label: 'Capa del frente (URL)', type: 'image' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de las líneas destacadas', type: 'color' },
  ],
  'velocity/HelmetGrid': [
    { key: 'eyebrow', label: 'Sobretítulo', type: 'text' },
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'body', label: 'Texto', type: 'textarea' },
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
    { key: 'pathLabelA', label: 'Rótulo del camino A', type: 'text' },
    { key: 'pathImgA', label: 'Path A — foto', type: 'image' },
    { key: 'pathLabelB', label: 'Rótulo del camino B', type: 'text' },
    { key: 'pathImgB', label: 'Path B — foto', type: 'image' },
    { key: 'mergeTitleA', label: 'Título del cruce A', type: 'text' },
    { key: 'mergeTitleB', label: 'Título del cruce B', type: 'text' },
    { key: 'mergeAccent', label: 'Acento del cruce', type: 'text' },
    { key: 'bg', label: 'Fondo de la galería', type: 'color' },
    { key: 'bg2', label: 'Fondo del cruce', type: 'color' },
    { key: 'endBg', label: 'Fondo al salir (el de la sección siguiente)', type: 'color' },
    { key: 'fg', label: 'Texto sobre la galería', type: 'color' },
    { key: 'fg2', label: 'Texto sobre el fondo del cruce', type: 'color' },
    { key: 'accent', label: 'Color de acento (rótulos y la letra destacada)', type: 'color' },
    toggle('showTexture', 'Textura de anillos detrás de la galería'),
  ],
  'velocity/ParallaxRise': [
    { key: 'eyebrow', label: 'Sobretítulo', type: 'text' },
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'body', label: 'Texto', type: 'textarea' },
    { key: 'cta', label: 'Botón', type: 'text' },
    { key: 'ctaHref', label: 'Botón — enlace', type: 'href' },
    { key: 'img', label: 'Imagen de fondo (URL)', type: 'image' },
    { key: 'bg', label: 'Color de fondo y del velo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de acento (eyebrow y botón)', type: 'color' },
  ],
  'velocity/FooterVelocity': [
    { key: 'line', label: 'Línea', type: 'text' },
    { key: 'email', label: 'Email de contacto (vacío: no se muestra)', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'backToTop', label: 'Volver arriba — texto', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color del link «volver arriba»', type: 'color' },
  ],
}
