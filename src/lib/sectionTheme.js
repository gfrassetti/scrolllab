/**
 * Resolución de tema para secciones que no pertenecen a ningún modelo.
 *
 * El builder deja mezclar secciones de modelos distintos, así que una sección
 * neutra como el formulario de contacto no tiene un tema propio del cual
 * heredar: su wrapper está vacío y el App generado no pinta un canvas raíz.
 * Sin resolver, `auto` termina siendo un bloque transparente sobre el fondo
 * del body — un rectángulo claro entre dos secciones oscuras.
 *
 * Por eso `auto` adopta la paleta de la sección vecina: la de arriba manda, y
 * si la sección neutra abre la página, manda la de abajo.
 *
 * Sin dependencias a propósito: lo importan el preview (cliente) y el packer
 * (servidor), y tienen que resolver exactamente igual o el ZIP no se parece a
 * lo que el usuario vio.
 */

export const AUTO_THEME = 'auto'

/** Modelos con paleta propia. Debe coincidir con THEMES en ContactForm.jsx. */
export const THEMED_MODELS = [
  'chapters',
  'nocturne',
  'monolith',
  'velocity',
  'fizz',
  'atelier',
  'comic',
  'unity',
  'ratio',
]

/** Secciones neutras cuyo prop `theme` se resuelve según el contexto. */
export const THEME_ADAPTIVE_SECTIONS = [
  'contact/ContactForm',
  'commerce/ProductGrid',
]

const THEMED = new Set(THEMED_MODELS)

/**
 * @param {string[]} modelIds modelo de cada ítem de la composición, en orden
 * @param {number} index posición de la sección neutra
 * @returns {string} modelo a usar, o `auto` si no hay ninguna sección temada
 */
export function autoThemeFor(modelIds, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (THEMED.has(modelIds[i])) return modelIds[i]
  }
  for (let i = index + 1; i < modelIds.length; i += 1) {
    if (THEMED.has(modelIds[i])) return modelIds[i]
  }
  return AUTO_THEME
}

export function isThemeAdaptive(sectionId) {
  return THEME_ADAPTIVE_SECTIONS.includes(sectionId)
}

/**
 * Tema final de una sección neutra. Una elección explícita del usuario gana;
 * `auto` (o vacío) se resuelve contra los vecinos.
 */
export function resolveSectionTheme(sectionId, props, modelIds, index) {
  if (!isThemeAdaptive(sectionId)) return undefined
  const chosen = props?.theme
  if (chosen && chosen !== AUTO_THEME) return chosen
  return autoThemeFor(modelIds, index)
}
