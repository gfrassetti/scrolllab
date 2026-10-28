import { CHAPTERS_FIELDS } from './fields/chapters.js'
import { MERIDIAN_FIELDS } from './fields/meridian.js'
import { NOCTURNE_FIELDS } from './fields/nocturne.js'
import { MONOLITH_FIELDS } from './fields/monolith.js'
import { FIZZ_FIELDS } from './fields/fizz.js'
import { VELOCITY_FIELDS } from './fields/velocity.js'
import { ATELIER_FIELDS } from './fields/atelier.js'
import { UNITY_FIELDS } from './fields/unity.js'
import { RATIO_FIELDS } from './fields/ratio.js'
import { ATRIUM_FIELDS } from './fields/atrium.js'
import { KIN_FIELDS } from './fields/kin.js'
import { APEX_FIELDS } from './fields/apex.js'
import { CONTACT_FIELDS } from './fields/contact.js'
import { COMMERCE_FIELDS, PRODUCT_GRID_GROUPS } from './fields/commerce.js'

/** @typedef {import('./types.js').SectionField} SectionField */

/**
 * Campos editables por sección (builder preview + LAB).
 * Tipos: text · textarea · select · image · url · color · href · list (con
 * sub-campo `price` para los productos del kit commerce).
 * `image` / `url` = una URL https:// o una ruta /archivo. Los objetos 3D
 * (formas, GLB) no son editables a propósito: se cambian en el código.
 * `list` = array de items; `item` describe sus sub-campos (text/textarea/
 * href/color). Fuente única: server/sectionFields.js deriva de esta tabla qué
 * props acepta (ALLOWED_PROPS_BY_SECTION + LIST_PROPS_BY_SECTION). El servidor
 * valida colores y links por nombre de prop: un campo `color` se llama
 * bg/fg/accent… y uno `href` termina en `Href` (`npm run check` lo exige).
 * Esta carpeta es dominio puro: la importan Node y el browser, sin React.
 * Cada modelo vive en fields/<modelo>.js; acá se juntan.
 * Recetas Beat (pasos dx/dy) aún no son un campo: el motion vive en JSX/presets.
 * Ver docs/scrolllab-beat.md.
 *
 * Listón (npm run check:editable): todo texto visible, imagen, link y color de
 * una sección es un campo — el mismo nivel que un widget de LAB.
 * @type {Record<string, SectionField[]>}
 */
export const SECTION_FIELDS = {
  ...CHAPTERS_FIELDS,
  ...MERIDIAN_FIELDS,
  ...NOCTURNE_FIELDS,
  ...MONOLITH_FIELDS,
  ...FIZZ_FIELDS,
  ...VELOCITY_FIELDS,
  ...ATELIER_FIELDS,
  ...UNITY_FIELDS,
  ...RATIO_FIELDS,
  ...ATRIUM_FIELDS,
  ...KIN_FIELDS,
  ...APEX_FIELDS,
  ...CONTACT_FIELDS,
  ...COMMERCE_FIELDS,
}

/**
 * Secciones del builder SIN color editable, a propósito y con el motivo. Una
 * sola lista: la leen el test de colores y npm run check:editable.
 */
export const SECTIONS_WITHOUT_COLOR = Object.freeze({
})

export function getSectionFields(sectionId) {
  return SECTION_FIELDS[sectionId] || []
}

/**
 * Grupos plegables del panel, para las secciones con muchos campos. Sin grupos
 * el panel muestra la lista de siempre.
 * @type {Record<string, import('./types.js').SectionFieldGroup[]>}
 */
export const SECTION_FIELD_GROUPS = {
  'commerce/ProductGrid': PRODUCT_GRID_GROUPS,
}

export function getSectionFieldGroups(sectionId) {
  return SECTION_FIELD_GROUPS[sectionId] || null
}

/** Desde cuántos campos el panel agrupa solo una sección sin grupos propios. */
export const AUTO_GROUP_MIN_FIELDS = 12

/** Los grupos automáticos, por tipo de campo: predecibles en cualquier sección. */
export const AUTO_FIELD_GROUPS = Object.freeze([
  { id: 'content', title: 'Textos', open: true },
  { id: 'media', title: 'Fotos y video' },
  { id: 'links', title: 'Links' },
  { id: 'colors', title: 'Colores' },
  { id: 'layers', title: 'Capas y efectos' },
])

/** @param {import('./types.js').SectionField} field */
export function autoGroupOf(field) {
  if (field.type === 'color' || (field.type === 'select' && field.key === 'theme')) return 'colors'
  if (field.type === 'href' || (field.type === 'url' && /endpoint/i.test(field.key))) return 'links'
  if (field.type === 'image' || field.type === 'url') return 'media'
  if (field.type === 'toggle') return 'layers'
  return 'content'
}

/**
 * Cómo se arma el panel de una sección: sus grupos propios (la tienda), grupos
 * automáticos por tipo si tiene muchos campos, o la lista de siempre.
 * `fields` es la lista ya filtrada (LAB oculta algunos campos).
 * @param {string} sectionId
 * @param {import('./types.js').SectionField[]} fields
 * @returns {{ groups: import('./types.js').SectionFieldGroup[] | null, fields: import('./types.js').SectionField[] }}
 */
export function sectionFieldLayout(sectionId, fields) {
  const own = SECTION_FIELD_GROUPS[sectionId]
  if (own) return { groups: own, fields }
  if (fields.length < AUTO_GROUP_MIN_FIELDS) return { groups: null, fields }
  const grouped = fields.map((field) => ({ ...field, group: autoGroupOf(field) }))
  const used = new Set(grouped.map((field) => field.group))
  const groups = AUTO_FIELD_GROUPS.filter((group) => used.has(group.id))
  return groups.length > 1 ? { groups, fields: grouped } : { groups: null, fields }
}
