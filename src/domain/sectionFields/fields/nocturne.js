import { navLinks, SEQ_LABEL, MENU_BUTTON, toggle } from '../helpers.js'

/** @typedef {import('../types.js').SectionField} SectionField */

/**
 * Campos editables de las secciones de NOCTURNE (builder + LAB).
 * El ensamblado y la lista completa: ../fields.js.
 * @type {Record<string, SectionField[]>}
 */
export const NOCTURNE_FIELDS = {
  'nocturne/NavNocturne': [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'marker', label: 'Marker', type: 'text' },
    navLinks(),
    ...MENU_BUTTON,
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de acento', type: 'color' },
  ],
  'nocturne/HeroCinematic': [
    { key: 'titleTop', label: 'Title top', type: 'text' },
    { key: 'titleBottom', label: 'Title bottom', type: 'text' },
    { key: 'kicker', label: 'Kicker', type: 'text' },
    { key: 'meta', label: 'Meta', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
    { key: 'img', label: 'Foto de fondo', type: 'image' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de acento', type: 'color' },
  ],
  'nocturne/DiagonalMarquee': [
    { key: 'textA', label: 'Texto — cinta 1', type: 'text' },
    { key: 'textB', label: 'Texto — cinta 2', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de la cinta', type: 'color' },
  ],
  'nocturne/SplitReveals': [
    SEQ_LABEL,
    { key: 'seq', label: 'Secuencia', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'beats',
      label: 'Escenas',
      type: 'list',
      max: 6,
      item: [
        { key: 'kicker', label: 'Kicker', type: 'text' },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'body', label: 'Texto', type: 'textarea' },
        { key: 'img', label: 'Imagen (URL)', type: 'image' },
      ],
    },
    { key: 'accent', label: 'Color de acento (rótulos)', type: 'color' },
  ],
  'nocturne/WorkIndex': [
    SEQ_LABEL,
    { key: 'seq', label: 'Secuencia', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'works',
      label: 'Trabajos',
      type: 'list',
      max: 8,
      item: [
        { key: 'index', label: 'Índice', type: 'text' },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'category', label: 'Categoría', type: 'text' },
        { key: 'year', label: 'Año', type: 'text' },
        { key: 'img', label: 'Imagen (URL)', type: 'image' },
        { key: 'href', label: 'Enlace (#sección, /ruta o https://…; vacío = #contact)', type: 'href' },
      ],
    },
    { key: 'accent', label: 'Color de acento', type: 'color' },
    toggle('showHoverImage', 'Foto que sigue al mouse (PC)'),
  ],
  'nocturne/OutroCTA': [
    { key: 'ctaWord', label: 'CTA', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'ctaHref', label: 'CTA — enlace (si no, usa el email)', type: 'href' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'note', label: 'Nota de cierre', type: 'textarea' },
    { key: 'backToTop', label: 'Volver arriba — texto', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'links',
      label: 'Enlaces',
      type: 'list',
      max: 8,
      item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'href', label: 'Enlace', type: 'href' },
      ],
    },
    { key: 'accent', label: 'Color de acento (el punto final)', type: 'color' },
  ],
  'nocturne/ZoomPortal': [
    SEQ_LABEL,
    { key: 'seq', label: 'Seq', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'ghostWord', label: 'Palabra de fondo', type: 'text' },
    { key: 'endCaption', label: 'Pie de la foto', type: 'textarea' },
    { key: 'img', label: 'Imagen (URL)', type: 'image' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de acento', type: 'color' },
    toggle('showGhost', 'Palabra gigante de fondo'),
  ],
  'nocturne/StickyWordCycle': [
    SEQ_LABEL,
    { key: 'seq', label: 'Seq', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    {
      key: 'words',
      label: 'Palabras',
      type: 'list',
      max: 8,
      item: [{ key: 'word', label: 'Palabra', type: 'text' }],
    },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de acento', type: 'color' },
  ],
}
