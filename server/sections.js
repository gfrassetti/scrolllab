import { SECTION_IDS, sectionModelOf } from '../src/domain/sections.js'
import { isRetiredSku } from '../src/domain/catalog.js'

/**
 * Allowlist server-side de secciones: qué ids acepta una receta y qué
 * componentes se copian al ZIP (packaging.js). Sale de la tabla de dominio
 * (src/domain/sections.js) sin los modelos retirados (PLUM, SIGNAL). Los que
 * siguen en obra (RATIO) entran acá y los frena BUILDER_HIDDEN_SKUS en
 * validateRecipe.
 *
 * Es una frontera de seguridad: la lista resultante está aprobada a mano en
 * server/__tests__/sections.test.js, así que sumar una sección vendible
 * obliga a tocar ese test a propósito.
 */
export const ALLOWED_SECTIONS = Object.freeze(
  SECTION_IDS.filter((id) => !isRetiredSku(sectionModelOf(id))),
)

export const ALLOWED_SECTION_SET = new Set(ALLOWED_SECTIONS)

const SECTION_RE = /^[a-z]+\/[A-Za-z0-9]+$/

export function isAllowedSectionId(id) {
  return typeof id === 'string' && SECTION_RE.test(id) && ALLOWED_SECTION_SET.has(id)
}

/**
 * Secciones que se pueden servir como Hosted Component (ver
 * docs/hosted-component-plan.md). Requisito para entrar acá: tener un embed
 * verificado (embed/src/registry.js) y un schema de props en
 * ALLOWED_PROPS_BY_SECTION. Se amplía a medida que cada sección lo cumple.
 */
export const HOSTABLE_SECTIONS = Object.freeze([
  // Familia footer: misma mecánica que FooterCTA (SplitText de entrada `once`,
  // sin pin, sin scrub, alto acotado) → FLOW puro en el iframe. Todos sus textos
  // son props string editables. El frame trae los tokens/fuentes de cada modelo
  // (embed/frame/main.css + index.html).
  'chapters/FooterCTA',
  'nocturne/OutroCTA',
  'monolith/FooterBrutal',
  'fizz/FooterSplash',
  'velocity/FooterVelocity',
  'atelier/FooterAtelier',
  'atrium/FooterAtrium',
  // Fase C — bloques de contenido más allá de los footers. Mismo criterio:
  // entrada `once` (o sin ScrollTrigger), sin pin, sin scrub, padding en
  // rem/px/vw (nada de `svh`, que dentro del iframe FLOW no tiene viewport
  // estable). Modelos ya tokenizados en el frame por la familia footer.
  'chapters/BigNumbers',
  'atelier/KeyFacts',
  'monolith/TypeAccordion',
  // Fase D — segunda tanda. Ribbons continuos (loop `repeat:-1` sin pin; el
  // boost por velocidad de scroll no dispara si el host no scrollea, pero el
  // loop de fondo sigue andando — no rompe) + más bloques `once`.
  'chapters/VelocityMarquee',
  'nocturne/DiagonalMarquee',
  'nocturne/SplitReveals',
  'nocturne/WorkIndex',
  'monolith/SkewScroller',
  'monolith/ExhibitGrid',
  'fizz/BubbleBenefits',
  'atelier/AboutClarity',
  // Fase E — grillas con imagen editable por ítem (list sub-field `image`).
  // Las imágenes default (imports bundleados) se stubean a '' en el embed;
  // cada sección cae a su fallback (SVG en CanCarousel, degradé en StudioCards,
  // outline en HelmetGrid) si el ítem no trae URL.
  'fizz/CanCarousel',
  'atelier/StudioCards',
  'velocity/HelmetGrid',
  // Fase F — bloques de contenido `once`, mismo trato que FooterAtrium: usan
  // `svh` para el aire (el iframe FLOW tarda más pasadas en converger el alto,
  // no rompe — ver SKIP_HEIGHT_FOLLOW en el e2e). Atrium ya está tokenizado en
  // el frame por FooterAtrium, cero cambios en embed/frame/.
  'atrium/ManifestoType',
  'atrium/ScopeSerif',
  // NO agregar secciones scrolljack pineadas (pin + scrub, pan horizontal por
  // scroll de window, boot que bloquea scroll): dentro del iframe del embed
  // —alto acotado, sin scroll que las maneje— renderizan rotas. Ej:
  // `chapters/HorizontalPanels`. Necesitan una "embed edition" acotada primero
  // (ver docs/hosted-component-plan.md).
  // Tampoco secciones scrub sin pin (ManifestoReveal, QuoteBreak, StatField…):
  // en FLOW el frame no scrollea, el scrub queda congelado en el estado inicial.
])

export const HOSTABLE_SECTION_SET = new Set(HOSTABLE_SECTIONS)

export function isHostableSectionId(id) {
  return isAllowedSectionId(id) && HOSTABLE_SECTION_SET.has(id)
}
