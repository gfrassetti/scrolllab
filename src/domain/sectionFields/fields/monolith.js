import { model3dHelp, navLinks, MENU_BUTTON, toggle } from '../helpers.js'

/** @typedef {import('../types.js').SectionField} SectionField */

/**
 * Campos editables de las secciones de MONOLITH (builder + LAB).
 * El ensamblado y la lista completa: ../fields.js.
 * @type {Record<string, SectionField[]>}
 */
export const MONOLITH_FIELDS = {
  'monolith/NavBrutal': [
    { key: 'brand', label: 'Brand', type: 'text' },
    navLinks(),
    ...MENU_BUTTON,
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de acento', type: 'color' },
  ],
  'monolith/HeroThree': [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
    { key: 'meta', label: 'Meta', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
    {
      key: 'shape',
      label: 'Objeto 3D — forma (si no ponés un modelo propio)',
      type: 'select',
      options: [
        { value: 'icosahedron', label: 'Icosaedro (la de la demo)' },
        { value: 'box', label: 'Cubo' },
        { value: 'octahedron', label: 'Octaedro' },
        { value: 'torus', label: 'Toroide' },
        { value: 'sphere', label: 'Esfera' },
      ],
    },
    {
      key: 'modelUrl',
      label: 'Objeto 3D — modelo propio (.glb)',
      type: 'url',
      help: model3dHelp([
        'Este hero lo redibuja como líneas negras (wireframe): materiales y texturas no se ven, importa la forma. Mejor algo simple, hasta unos 20.000 triángulos; con más, las líneas se empastan en una mancha.',
        'Sin compresión Draco: este hero no la lee (al exportar, dejá «Compression» apagado).',
      ]),
    },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'accent', label: 'Color de acento', type: 'color' },
  ],
  'monolith/SkewScroller': [
    { key: 'unitLabel', label: 'Numeración — rótulo', type: 'text' },
    { key: 'unit', label: 'Unit', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'words',
      label: 'Palabras',
      type: 'list',
      max: 8,
      item: [{ key: 'word', label: 'Palabra', type: 'text' }],
    },
    { key: 'accent', label: 'Color de acento (palabras resaltadas)', type: 'color' },
  ],
  'monolith/SpecSheet': [
    { key: 'unitLabel', label: 'Etiqueta de unidad', type: 'text' },
    { key: 'unit', label: 'Unidad', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    {
      key: 'specs',
      label: 'Filas',
      type: 'list',
      max: 10,
      item: [
        { key: 'label', label: 'Dato', type: 'text' },
        { key: 'value', label: 'Valor', type: 'text' },
      ],
    },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto y líneas', type: 'color' },
  ],
  'monolith/ExhibitGrid': [
    { key: 'unitLabel', label: 'Numeración — rótulo', type: 'text' },
    { key: 'unit', label: 'Unit', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'exhibits',
      label: 'Piezas',
      type: 'list',
      max: 8,
      item: [
        { key: 'code', label: 'Código', type: 'text' },
        { key: 'caption', label: 'Descripción', type: 'text' },
        { key: 'img', label: 'Imagen (URL)', type: 'image' },
      ],
    },
    { key: 'accent', label: 'Color de acento (códigos)', type: 'color' },
  ],
  'monolith/TypeAccordion': [
    { key: 'unitLabel', label: 'Numeración — rótulo', type: 'text' },
    { key: 'unit', label: 'Unit', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'items',
      label: 'Filas',
      type: 'list',
      max: 6,
      item: [
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'body', label: 'Texto', type: 'textarea' },
        { key: 'img', label: 'Foto (vacío = la de la demo)', type: 'image' },
      ],
    },
    { key: 'accent', label: 'Color de acento (títulos)', type: 'color' },
    toggle('showImages', 'Fotos de los cajones'),
  ],
  'monolith/ProcessSteps': [
    { key: 'unitLabel', label: 'Numeración — rótulo', type: 'text' },
    { key: 'unit', label: 'Unit', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'title', label: 'Titular', type: 'text' },
    { key: 'cureLabel', label: 'Molde — rótulo', type: 'text' },
    {
      key: 'steps',
      label: 'Pasos',
      type: 'list',
      max: 8,
      item: [
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'time', label: 'Cuándo (plazo)', type: 'text' },
        { key: 'body', label: 'Texto', type: 'textarea' },
      ],
    },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto, líneas y molde', type: 'color' },
    { key: 'accent', label: 'Color de acento (paso activo y borde del hormigón)', type: 'color' },
    toggle('showMould', 'Molde que se llena de hormigón'),
  ],
  'monolith/FooterBrutal': [
    { key: 'ctaWord', label: 'CTA', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'ctaHref', label: 'CTA — enlace (si no, usa el email)', type: 'href' },
    { key: 'legal', label: 'Legal', type: 'text' },
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
    { key: 'accent', label: 'Color de las líneas', type: 'color' },
  ],
}
