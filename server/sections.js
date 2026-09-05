/**
 * Allowlist server-side de secciones vendibles.
 * Debe coincidir con src/lib/sectionRegistry.jsx.
 */
export const ALLOWED_SECTIONS = Object.freeze([
  'chapters/NavMinimal',
  'chapters/HeroKinetic',
  'chapters/VelocityMarquee',
  'chapters/ManifestoReveal',
  'chapters/StickyImageStory',
  'chapters/HorizontalPanels',
  'chapters/ParallaxEditorial',
  'chapters/StackingCards',
  'chapters/BigNumbers',
  'chapters/QuoteBreak',
  'chapters/FooterCTA',
  'nocturne/NavNocturne',
  'nocturne/HeroCinematic',
  'nocturne/ZoomPortal',
  'nocturne/DiagonalMarquee',
  'nocturne/SplitReveals',
  'nocturne/WorkIndex',
  'nocturne/StickyWordCycle',
  'nocturne/OutroCTA',
  'monolith/NavBrutal',
  'monolith/HeroThree',
  'monolith/SkewScroller',
  'monolith/SpecSheet',
  'monolith/ExhibitGrid',
  'monolith/TypeAccordion',
  'monolith/FooterBrutal',
  'fizz/NavFizz',
  'fizz/HeroBubbles',
  'fizz/FlavorWorlds',
  'fizz/BubbleBenefits',
  'fizz/CanCarousel',
  'fizz/PopManifesto',
  'fizz/FooterSplash',
  'velocity/NavVelocity',
  'velocity/HeroStrike',
  'velocity/TrackMerge',
  'velocity/HelmetGrid',
  'velocity/ParallaxRise',
  'velocity/FooterVelocity',
  'atelier/NavAtelier',
  'atelier/HeroMeaning',
  'atelier/AboutClarity',
  'atelier/ServicesStone',
  'atelier/VisionShutter',
  'atelier/SelectedWork',
  'atelier/KeyFacts',
  'atelier/WordStripe',
  'atelier/StudioCards',
  'atelier/FooterAtelier',
  'unity/NavUnity',
  'unity/HeroTwin',
  'unity/MosaicSlider',
  'unity/UniversalLang',
  'unity/LanguageBlock',
  'unity/LastPortrait',
  'unity/StageLines',
  'unity/FooterTrophy',
  'ratio/NavRatio',
  'ratio/HeroTools',
  'ratio/FourPlates',
  'ratio/SplitStudy',
  'ratio/FitStack',
  'ratio/PlateStudy',
  'ratio/BreakRules',
  'ratio/FooterLedger',
  'atrium/NavAtrium',
  'atrium/HeroMassing',
  'atrium/ManifestoType',
  'atrium/ScopeSerif',
  'atrium/ClarityPair',
  'atrium/BlueprintDraw',
  'atrium/ProjectRail',
  'atrium/ProcessPin',
  'atrium/PeopleScatter',
  'atrium/OrbitRing',
  'atrium/StatField',
  'atrium/FooterAtrium',
  'contact/ContactForm',
  'commerce/ProductGrid',
])

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
