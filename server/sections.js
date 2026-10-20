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

/**
 * @param {unknown} id
 * @returns {id is string}
 */
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
  'atelier/Testimonial',
  'monolith/TypeAccordion',
  'monolith/ProcessSteps',
  'monolith/AssemblyStack',
  'monolith/LoadNumbers',
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
  // Fase G — screening de 15 candidatas en el iframe real a 375/768/1280
  // (docs/hosted-component-plan.md). Todo texto, link, foto y color editable.
  'meridian/Footer',
  'meridian/Interior',
  'meridian/Amenities',
  'meridian/Panorama',
  'kin/Rooms',
  'kin/Footer',
  'monolith/SpecSheet',
  'unity/LastPortrait',
  'velocity/ParallaxRise',
  'chapters/ParallaxEditorial',
  // Fase H — KIN: Visit es FLOW puro (entrada `once`, sin pin ni scrub).
  // Programme y Press SON pineada/sticky en el sitio; acá entran en su "flow
  // edition" (el registro del embed les pasa `flow`): la barra roja recorre
  // la regla mientras la sección cruza la pantalla, y las citas se apilan y
  // suben al llegar. Ver docs/hosted-component-plan.md, Fase H.
  'kin/Programme',
  'kin/Press',
  'kin/Visit',
  // Formularios (src/domain/labForms.js): en LAB el frame los apunta a
  // /api/embed/:key/form y el mensaje le llega por mail al dueño del widget.
  'contact/ContactForm',
  'meridian/Contact',
  'fizz/ContactSteps',
  // Fase I — `npm run screen:lab` sobre las que quedaban (docs/hosted-component-plan.md).
  // Scrub sin pin: siguen el scroll del sitio (scrollerProxy del frame).
  // Pineadas y con escenario sticky: el frame entra en modo PIN (una pantalla
  // pegada que recorre su propio documento), así que pin, sticky y scrub corren
  // como en una página común. Portadas incluidas: un widget puede ir arriba de todo.
  'chapters/HeroKinetic',
  'chapters/ManifestoReveal',
  'chapters/StickyImageStory',
  'chapters/HorizontalPanels',
  'chapters/StackingCards',
  'chapters/QuoteBreak',
  'nocturne/HeroCinematic',
  'nocturne/ZoomPortal',
  'nocturne/StickyWordCycle',
  'fizz/PopManifesto',
  'velocity/HeroStrike',
  'velocity/TrackMerge',
  'atelier/VisionShutter',
  'atelier/SelectedWork',
  'unity/HeroTwin',
  'unity/MosaicSlider',
  'unity/UniversalLang',
  'unity/MatchBoard',
  'unity/LanguageBlock',
  'unity/StageLines',
  'unity/FooterTrophy',
  'atrium/HeroMassing',
  'atrium/ClarityPair',
  'atrium/BlueprintDraw',
  'atrium/ProjectRail',
  'atrium/ProcessPin',
  'atrium/PeopleScatter',
  'atrium/OrbitRing',
  'atrium/StatField',
  'atrium/AwardsPress',
  'atrium/ClientVoice',
  'atrium/JournalList',
  'meridian/Concept',
  'meridian/GallerySlider',
  'kin/Intro',
  'kin/Collection',
  // Fase K — APEX: la portada con un film de cinco tomas. El film y los pósters son
  // campos (URL https del cliente); `flow` (lo pone el registro del embed) quita el
  // apagado hacia el negro al scrollear: un widget no va a abrir ni cerrar la página.
  'apex/Hero',
  // APEX Statement (palabras que se encienden con el scroll + cifras) y Gallery
  // (carrusel de pantalla completa; el puntero lleva la miniatura de la siguiente).
  'apex/Statement',
  'apex/Story',
  'apex/Gallery',
  // APEX Models: la gama como lista con foto al lado (hover / tramo central en el teléfono).
  'apex/Models',
  // APEX Footer: cierre a pantalla completa con newsletter. En LAB el newsletter
  // manda por mail al dueño del widget, como los otros formularios (labForms.js).
  'apex/Footer',
  // Three.js (Fase L): con el frame partido por sección, three es un archivo
  // aparte que bajan solo estos widgets (antes lo pagaba cada embed).
  'fizz/HeroBubbles',
  'fizz/FlavorWorlds',
  'monolith/HeroThree',
  'atelier/HeroMeaning',
  'atelier/ServicesStone',
  // Fuera, por diseño: los `Nav*` (un header fijo suelto no tiene sentido),
  // `kin/Hero` (abre la página: su entrada toma el scroll y la barra de navegación
  // fija se transforma; en un iframe solo quedan las barras),
  // lo que trae media que el cliente no puede cambiar desde LAB (sin código no se
  // reemplaza: sería la foto o el video de otro): `meridian/Hero` (el vuelo aéreo
  // es una secuencia de cuadros), `meridian/Location` y `meridian/Masterplan`
  // (puntos fijos sobre un mapa / una foto aérea), y FOLD entero (película al
  // scroll: ni en LAB ni en el builder, ver sections.test.js),
  // `commerce/ProductGrid` (router, carrito y checkout del sitio),
  // `apex/Showroom` (decisión del dueño: «Builder sí, LAB no»; ~8–9 MB de 3D y
  // ~9 pantallas pegadas en el sitio del cliente).
])

export const HOSTABLE_SECTION_SET = new Set(HOSTABLE_SECTIONS)

export function isHostableSectionId(id) {
  return isAllowedSectionId(id) && HOSTABLE_SECTION_SET.has(id)
}
