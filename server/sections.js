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














  'contact/ContactForm',
  'commerce/ProductGrid',
])

export const ALLOWED_SECTION_SET = new Set(ALLOWED_SECTIONS)

const SECTION_RE = /^[a-z]+\/[A-Za-z0-9]+$/

export function isAllowedSectionId(id) {
  return typeof id === 'string' && SECTION_RE.test(id) && ALLOWED_SECTION_SET.has(id)
}
