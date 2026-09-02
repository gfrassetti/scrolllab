/**
 * Secciones hosteables. Import ESTÁTICO a propósito: con una sola sección el
 * code-splitting no gana nada y agrega un chunk lazy que puede fallar (404 si
 * el CDN/rewrite no lo sirve bien). Todo va en el bundle del frame.
 * `chapters/HorizontalPanels` NO va: scrolljack pineada, se rompe dentro del
 * iframe acotado. Ver HOSTABLE_SECTIONS en server/sections.js.
 */
import FooterCTA from '../../src/components/sections/chapters/FooterCTA.jsx'

const SECTIONS = {
  'chapters/FooterCTA': FooterCTA,
}

export async function loadSection(sectionId) {
  return SECTIONS[sectionId] || null
}
