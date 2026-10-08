/**
 * Secciones: fuente única de qué secciones existen y de qué tipo es cada una.
 *
 * Dominio puro (sin React): lo leen el builder (composition.js), el registry
 * JSX (que suma el componente, nombre y blurb de cada id) y el servidor, que
 * deriva de acá qué secciones acepta en una receta (server/sections.js).
 *
 * Sumar una sección nueva: agregarla acá, en src/lib/sectionRegistry.jsx con
 * su componente, y en la lista aprobada de server/__tests__/sections.test.js
 * si se va a vender. `npm run check` falla si el registry y esta tabla no
 * coinciden.
 *
 * `kind` ordena la composición: `nav` arriba, `footer` abajo, `hero` / `section`
 * en el medio. El orden de los modelos y de sus secciones es el de la paleta.
 */
/** @type {Record<string, Record<string, SectionKind>>} */
const BY_MODEL = {
  chapters: {
    NavMinimal: 'nav',
    HeroKinetic: 'hero',
    VelocityMarquee: 'section',
    ManifestoReveal: 'section',
    StickyImageStory: 'section',
    HorizontalPanels: 'section',
    ParallaxEditorial: 'section',
    StackingCards: 'section',
    BigNumbers: 'section',
    QuoteBreak: 'section',
    FooterCTA: 'footer',
  },
  nocturne: {
    NavNocturne: 'nav',
    HeroCinematic: 'hero',
    ZoomPortal: 'section',
    DiagonalMarquee: 'section',
    SplitReveals: 'section',
    WorkIndex: 'section',
    StickyWordCycle: 'section',
    OutroCTA: 'footer',
  },
  monolith: {
    NavBrutal: 'nav',
    HeroThree: 'hero',
    SkewScroller: 'section',
    SpecSheet: 'section',
    ExhibitGrid: 'section',
    TypeAccordion: 'section',
    FooterBrutal: 'footer',
  },
  fizz: {
    NavFizz: 'nav',
    HeroBubbles: 'hero',
    FlavorWorlds: 'section',
    BubbleBenefits: 'section',
    CanCarousel: 'section',
    PopManifesto: 'section',
    ContactSteps: 'section',
    FooterSplash: 'footer',
  },
  velocity: {
    NavVelocity: 'nav',
    HeroStrike: 'hero',
    TrackMerge: 'section',
    HelmetGrid: 'section',
    ParallaxRise: 'section',
    FooterVelocity: 'footer',
  },
  atelier: {
    NavAtelier: 'nav',
    HeroMeaning: 'hero',
    AboutClarity: 'section',
    ServicesStone: 'section',
    VisionShutter: 'section',
    SelectedWork: 'section',
    KeyFacts: 'section',
    StudioCards: 'section',
    FooterAtelier: 'footer',
  },
  unity: {
    NavUnity: 'nav',
    HeroTwin: 'hero',
    MosaicSlider: 'section',
    UniversalLang: 'section',
    LanguageBlock: 'section',
    LastPortrait: 'section',
    StageLines: 'section',
    FooterTrophy: 'footer',
  },
  ratio: {
    NavRatio: 'nav',
    HeroTools: 'hero',
    FourPlates: 'section',
    SplitStudy: 'section',
    FitStack: 'section',
    PlateStudy: 'section',
    BreakRules: 'section',
    FooterLedger: 'footer',
  },
  atrium: {
    NavAtrium: 'nav',
    HeroMassing: 'hero',
    ManifestoType: 'section',
    ScopeSerif: 'section',
    ClarityPair: 'section',
    BlueprintDraw: 'section',
    ProjectRail: 'section',
    ProcessPin: 'section',
    PeopleScatter: 'section',
    OrbitRing: 'section',
    StatField: 'section',
    FooterAtrium: 'footer',
  },
  plum: {
    FilmScroll: 'hero',
  },
  meridian: {
    Hero: 'hero',
    Concept: 'section',
    GallerySlider: 'section',
    Location: 'section',
    Panorama: 'section',
    Interior: 'section',
    Amenities: 'section',
    Masterplan: 'section',
    Contact: 'section',
    Footer: 'footer',
  },
  signal: {
    NavSignal: 'nav',
    HeroSignal: 'hero',
    SelectedWorkIndex: 'section',
    ManifestoMarquee: 'section',
    RecognitionStats: 'section',
    PixelRevealGrid: 'section',
    ServicesAccordion: 'section',
    FooterSignal: 'footer',
  },
  contact: {
    ContactForm: 'section',
  },
  commerce: {
    ProductGrid: 'section',
  },
}

/**
 * Para qué sirve una sección en la página: `nav` arriba, `footer` abajo.
 * @typedef {'nav' | 'hero' | 'section' | 'footer'} SectionKind
 */

/** `{ modelo: { Componente: kind } }`, en el orden de la paleta. */
export const SECTIONS_BY_MODEL = Object.freeze(
  Object.fromEntries(
    Object.entries(BY_MODEL).map(([model, sections]) => [model, Object.freeze(sections)]),
  ),
)

/** Mapa plano `'modelo/Componente' → kind`. */
/** @type {Readonly<Record<string, SectionKind>>} */
export const SECTION_KINDS = Object.freeze(
  Object.fromEntries(
    Object.entries(BY_MODEL).flatMap(([model, sections]) =>
      Object.entries(sections).map(([name, kind]) => [`${model}/${name}`, kind]),
    ),
  ),
)

/** Todos los ids, en el orden de la paleta. */
export const SECTION_IDS = Object.freeze(Object.keys(SECTION_KINDS))

/**
 * @param {string} sectionId
 * @returns {string} el modelo: `'chapters/HeroKinetic'` → `'chapters'`
 */
export function sectionModelOf(sectionId) {
  return String(sectionId).split('/')[0]
}

/**
 * @param {string} sectionId
 * @returns {SectionKind | undefined}
 */
export function sectionKindOf(sectionId) {
  return SECTION_KINDS[sectionId]
}

/**
 * @param {string} sectionId
 * @returns {boolean}
 */
export function isKnownSection(sectionId) {
  return Object.prototype.hasOwnProperty.call(SECTION_KINDS, sectionId)
}
