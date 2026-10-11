import { navLinks, MENU_BUTTON } from '../helpers.js'

/** @typedef {import('../types.js').SectionField} SectionField */

/**
 * Campos editables de las secciones de ATRIUM (builder + LAB).
 * El ensamblado y la lista completa: ../fields.js.
 * @type {Record<string, SectionField[]>}
 */
export const ATRIUM_FIELDS = {
  'atrium/NavAtrium': [
    { key: 'lineOne', label: 'Line 1', type: 'text' },
    { key: 'lineTwo', label: 'Line 2', type: 'text' },
    navLinks(),
    ...MENU_BUTTON,
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'atrium/HeroMassing': [
    { key: 'lineOne', label: 'Line 1', type: 'text' },
    { key: 'lineTwo', label: 'Line 2', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
    { key: 'img', label: 'Foto de fondo', type: 'image' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'atrium/ManifestoType': [
    { key: 'lineOne', label: 'Line 1', type: 'text' },
    { key: 'lineTwo', label: 'Line 2', type: 'text' },
    { key: 'left', label: 'Left column', type: 'textarea' },
    { key: 'right', label: 'Right column', type: 'textarea' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'atrium/ScopeSerif': [
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'atrium/ClarityPair': [
    { key: 'kicker', label: 'Kicker', type: 'text' },
    { key: 'left', label: 'Left headline', type: 'text' },
    { key: 'right', label: 'Right headline', type: 'text' },
    { key: 'bodyLeft', label: 'Left body', type: 'textarea' },
    { key: 'bodyRight', label: 'Right body', type: 'textarea' },
    { key: 'bg', label: 'Color claro (el fondo del principio)', type: 'color' },
    { key: 'fg', label: 'Color oscuro (el fondo del final)', type: 'color' },
  ],
  'atrium/BlueprintDraw': [
    { key: 'kicker', label: 'Rótulo', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'caption', label: 'Caption', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'atrium/ProjectRail': [
    { key: 'kicker', label: 'Kicker', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    {
      key: 'works',
      label: 'Proyectos',
      type: 'list',
      max: 8,
      item: [
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'meta', label: 'Dato (m², año…)', type: 'text' },
        { key: 'img', label: 'Foto (vacío = la de la demo)', type: 'image' },
      ],
    },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'atrium/ProcessPin': [
    { key: 'label', label: 'Label', type: 'text' },
    {
      key: 'scenes',
      label: 'Etapas',
      type: 'list',
      max: 6,
      item: [
        { key: 'kicker', label: 'Número', type: 'text' },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'body', label: 'Texto', type: 'textarea' },
        { key: 'img', label: 'Foto (vacío = la de la demo)', type: 'image' },
      ],
    },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'atrium/PeopleScatter': [
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'title', label: 'Title', type: 'textarea' },
    {
      key: 'plates',
      label: 'Fotos dispersas (en orden)',
      type: 'list',
      max: 6,
      item: [{ key: 'src', label: 'Foto (vacío = la de la demo)', type: 'image' }],
    },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'atrium/OrbitRing': [
    { key: 'lineOne', label: 'Línea 1', type: 'text' },
    { key: 'lineTwo', label: 'Línea 2', type: 'text' },
    { key: 'left', label: 'Texto izquierdo', type: 'textarea' },
    { key: 'right', label: 'Texto derecho', type: 'textarea' },
    {
      key: 'tiles',
      label: 'Fotos del anillo (con pocas, se repiten)',
      type: 'list',
      max: 12,
      item: [{ key: 'img', label: 'Imagen (URL)', type: 'image' }],
    },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'atrium/StatField': [
    { key: 'kicker', label: 'Kicker', type: 'text' },
    {
      key: 'stats',
      label: 'Cifras',
      type: 'list',
      max: 6,
      item: [
        { key: 'value', label: 'Número (cuenta hasta él; si no es número, queda fijo)', type: 'text' },
        { key: 'suffix', label: 'Sufijo (+, K, %)', type: 'text' },
        { key: 'label', label: 'Texto', type: 'text' },
      ],
    },
    { key: 'closer', label: 'Closing statement', type: 'textarea' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'atrium/FooterAtrium': [
    { key: 'mark', label: 'Mark', type: 'text' },
    { key: 'reserved', label: 'Reserved', type: 'text' },
    { key: 'license', label: 'License', type: 'text' },
    { key: 'design', label: 'Design credit', type: 'text' },
    { key: 'development', label: 'Development credit', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'year', label: 'Year', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
}
