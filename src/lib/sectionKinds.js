/**
 * Mapa plano id → kind. La tabla vive en src/domain/sections.js (fuente única,
 * sin React) para que composition.js, sus tests y el servidor la lean en Node
 * sin transformar JSX. Este archivo queda como punto de import del front.
 */
export {
  SECTION_KINDS,
  sectionKindOf,
  isKnownSection,
} from '../domain/sections.js'
