import { navLinks } from '../helpers.js'

/** @typedef {import('../types.js').SectionField} SectionField */

/**
 * Campos editables de las secciones de UNITY (builder + LAB).
 * El ensamblado y la lista completa: ../fields.js.
 * @type {Record<string, SectionField[]>}
 */
export const UNITY_FIELDS = {
  'unity/NavUnity': [
    { key: 'brand', label: 'Brand / phrase', type: 'text' },
    { key: 'logo', label: 'Logo text', type: 'text' },
    { key: 'logoSrc', label: 'Logo image', type: 'image' },
    navLinks(3),
    { key: 'menuLabel', label: 'Menu label', type: 'text' },
    { key: 'bg', label: 'Menú móvil — color de fondo', type: 'color' },
    { key: 'fg', label: 'Menú móvil — color de texto', type: 'color' },
  ],
  'unity/HeroTwin': [
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'headline', label: 'Headline', type: 'textarea' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'unity/MosaicSlider': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'textarea' },
    { key: 'img1', label: 'Image 1', type: 'image' },
    { key: 'img2', label: 'Image 2', type: 'image' },
    { key: 'img3', label: 'Image 3', type: 'image' },
    { key: 'img4', label: 'Image 4', type: 'image' },
    { key: 'img5', label: 'Image 5', type: 'image' },
    { key: 'img6', label: 'Image 6', type: 'image' },
    { key: 'img7', label: 'Image 7', type: 'image' },
    { key: 'img8', label: 'Image 8', type: 'image' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'unity/UniversalLang': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'number', label: 'Number', type: 'text' },
    { key: 'numberLabel', label: 'Number label', type: 'text' },
    {
      key: 'stats',
      label: 'Datos que pasan',
      type: 'list',
      max: 6,
      item: [
        { key: 'label', label: 'Rótulo', type: 'text' },
        { key: 'value', label: 'Valor', type: 'text' },
      ],
    },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'unity/LanguageBlock': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'line1', label: 'Line 1', type: 'text' },
    { key: 'line2', label: 'Line 2', type: 'text' },
    { key: 'line3', label: 'Line 3', type: 'text' },
    { key: 'note', label: 'Note', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    { key: 'img1', label: 'Image 1', type: 'image' },
    { key: 'img2', label: 'Image 2', type: 'image' },
    { key: 'img3', label: 'Image 3', type: 'image' },
    { key: 'anchor', label: 'Anchor id', type: 'text' },
  ],
  'unity/LastPortrait': [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'question', label: 'Question', type: 'text' },
    { key: 'caption', label: 'Caption', type: 'textarea' },
    { key: 'img', label: 'Portrait', type: 'image' },
    { key: 'stat1Label', label: 'Stat 1 label', type: 'text' },
    { key: 'stat1Value', label: 'Stat 1 value', type: 'text' },
    { key: 'stat2Label', label: 'Stat 2 label', type: 'text' },
    { key: 'stat2Value', label: 'Stat 2 value', type: 'text' },
    { key: 'stat3Label', label: 'Stat 3 label', type: 'text' },
    { key: 'stat3Value', label: 'Stat 3 value', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'unity/StageLines': [
    { key: 'eyebrow1', label: 'Eyebrow 1', type: 'text' },
    { key: 'line1', label: 'Line 1', type: 'text' },
    { key: 'img1', label: 'Image 1', type: 'image' },
    { key: 'eyebrow2', label: 'Eyebrow 2', type: 'text' },
    { key: 'line2', label: 'Line 2', type: 'text' },
    { key: 'img2', label: 'Image 2', type: 'image' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'unity/FooterTrophy': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'accentWord', label: 'Accent word', type: 'text' },
    { key: 'metaLeft', label: 'Meta left', type: 'text' },
    { key: 'metaRight', label: 'Meta right', type: 'text' },
    { key: 'orbSrc', label: 'Orb photo', type: 'image' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
}
