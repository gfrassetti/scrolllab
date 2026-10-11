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
import { CONTACT_FIELDS } from './fields/contact.js'
import { COMMERCE_FIELDS } from './fields/commerce.js'

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
  ...CONTACT_FIELDS,
  ...COMMERCE_FIELDS,
}

/**
 * Secciones del builder SIN color editable, a propósito y con el motivo. Una
 * sola lista: la leen el test de colores y npm run check:editable.
 */
export const SECTIONS_WITHOUT_COLOR = Object.freeze({
  'atelier/VisionShutter': 'la persiana cierra hacia el color de la sección siguiente',
  'atrium/ClarityPair': 'la animación pasa de papel a tinta con colores fijos',
  'kin/Intro': 'mix-blend-difference sobre la puerta del hero',
  'contact/ContactForm': 'la paleta la define el tema (campo theme)',
  'commerce/ProductGrid': 'la paleta la define el tema (campo theme)',
})

export function getSectionFields(sectionId) {
  return SECTION_FIELDS[sectionId] || []
}
