/**
 * Secciones hosteables: una función que carga cada una. Cada sección es un
 * archivo aparte del frame (import dinámico): un widget baja el núcleo del
 * frame (preact, GSAP, el puente) y solo su sección, no las ~70. El núcleo lo
 * comparten todos los widgets de una página (el navegador lo cachea).
 *
 * Antes iba todo en un solo archivo a propósito (un chunk que no carga deja el
 * widget en blanco). Con 70 secciones el frame pesaba 149 KB gzip para
 * cualquier widget; los archivos viven en la misma carpeta versionada del
 * frame (/v1/frame/assets/) y se sirven igual que el núcleo.
 *
 * Pineadas y con escenario sticky también van: el frame entra en modo PIN
 * (una pantalla pegada en el sitio que recorre su propio documento) y corren
 * sin tocarlas. Three.js también: es un archivo aparte que bajan solo los
 * widgets 3D. Lo que no va (navs, media que el cliente no puede cambiar)
 * está en HOSTABLE_SECTIONS, server/sections.js. Las fases y el porqué de
 * cada una: docs/hosted-component-plan.md.
 */
import { MODEL_WRAPPER_CLASS } from '../../src/lib/modelWrappers.js'
import { createElement } from 'react'

/**
 * Una sección que en el sitio se pinea o queda sticky no puede serlo en el
 * iframe de LAB (el widget no es dueño del scroll del visitante). Su edición
 * `flow` es la misma sección sin pin: la prop la pasa el registro, no el
 * usuario (no es un campo del editor).
 */
function flowEdition(Component) {
  return function FlowEdition(props) {
    return createElement(Component, { ...props, flow: true })
  }
}

const SECTIONS = {
  'chapters/FooterCTA': () => import('../../src/components/sections/chapters/FooterCTA.jsx'),
  'nocturne/OutroCTA': () => import('../../src/components/sections/nocturne/OutroCTA.jsx'),
  'monolith/FooterBrutal': () => import('../../src/components/sections/monolith/FooterBrutal.jsx'),
  'fizz/FooterSplash': () => import('../../src/components/sections/fizz/FooterSplash.jsx'),
  'velocity/FooterVelocity': () => import('../../src/components/sections/velocity/FooterVelocity.jsx'),
  'atelier/FooterAtelier': () => import('../../src/components/sections/atelier/FooterAtelier.jsx'),
  'atrium/FooterAtrium': () => import('../../src/components/sections/atrium/FooterAtrium.jsx'),
  'chapters/BigNumbers': () => import('../../src/components/sections/chapters/BigNumbers.jsx'),
  'atelier/KeyFacts': () => import('../../src/components/sections/atelier/KeyFacts.jsx'),
  'monolith/TypeAccordion': () => import('../../src/components/sections/monolith/TypeAccordion.jsx'),
  'chapters/VelocityMarquee': () => import('../../src/components/sections/chapters/VelocityMarquee.jsx'),
  'nocturne/DiagonalMarquee': () => import('../../src/components/sections/nocturne/DiagonalMarquee.jsx'),
  'nocturne/SplitReveals': () => import('../../src/components/sections/nocturne/SplitReveals.jsx'),
  'nocturne/WorkIndex': () => import('../../src/components/sections/nocturne/WorkIndex.jsx'),
  'monolith/SkewScroller': () => import('../../src/components/sections/monolith/SkewScroller.jsx'),
  'monolith/ExhibitGrid': () => import('../../src/components/sections/monolith/ExhibitGrid.jsx'),
  'fizz/BubbleBenefits': () => import('../../src/components/sections/fizz/BubbleBenefits.jsx'),
  'atelier/AboutClarity': () => import('../../src/components/sections/atelier/AboutClarity.jsx'),
  'fizz/CanCarousel': () => import('../../src/components/sections/fizz/CanCarousel.jsx'),
  'atelier/StudioCards': () => import('../../src/components/sections/atelier/StudioCards.jsx'),
  'velocity/HelmetGrid': () => import('../../src/components/sections/velocity/HelmetGrid.jsx'),
  'atrium/ManifestoType': () => import('../../src/components/sections/atrium/ManifestoType.jsx'),
  'atrium/ScopeSerif': () => import('../../src/components/sections/atrium/ScopeSerif.jsx'),
  'meridian/Footer': () => import('../../src/components/sections/meridian/Footer.jsx'),
  'meridian/Interior': () => import('../../src/components/sections/meridian/Interior.jsx'),
  'meridian/Amenities': () => import('../../src/components/sections/meridian/Amenities.jsx'),
  'meridian/Panorama': () => import('../../src/components/sections/meridian/Panorama.jsx'),
  'kin/Rooms': () => import('../../src/components/sections/kin/Rooms.jsx'),
  'kin/Footer': () => import('../../src/components/sections/kin/Footer.jsx'),
  'kin/Programme': () => import('../../src/components/sections/kin/Programme.jsx').then((m) => flowEdition(m.default)),
  'kin/Press': () => import('../../src/components/sections/kin/Press.jsx').then((m) => flowEdition(m.default)),
  'kin/Visit': () => import('../../src/components/sections/kin/Visit.jsx'),
  'monolith/SpecSheet': () => import('../../src/components/sections/monolith/SpecSheet.jsx'),
  'unity/LastPortrait': () => import('../../src/components/sections/unity/LastPortrait.jsx'),
  'velocity/ParallaxRise': () => import('../../src/components/sections/velocity/ParallaxRise.jsx'),
  'chapters/ParallaxEditorial': () => import('../../src/components/sections/chapters/ParallaxEditorial.jsx'),
  'contact/ContactForm': () => import('../../src/components/sections/contact/ContactForm.jsx'),
  'meridian/Contact': () => import('../../src/components/sections/meridian/Contact.jsx'),
  'fizz/ContactSteps': () => import('../../src/components/sections/fizz/ContactSteps.jsx'),
  'chapters/HeroKinetic': () => import('../../src/components/sections/chapters/HeroKinetic.jsx'),
  'chapters/ManifestoReveal': () => import('../../src/components/sections/chapters/ManifestoReveal.jsx'),
  'chapters/StickyImageStory': () => import('../../src/components/sections/chapters/StickyImageStory.jsx'),
  'chapters/HorizontalPanels': () => import('../../src/components/sections/chapters/HorizontalPanels.jsx'),
  'chapters/StackingCards': () => import('../../src/components/sections/chapters/StackingCards.jsx'),
  'chapters/QuoteBreak': () => import('../../src/components/sections/chapters/QuoteBreak.jsx'),
  'nocturne/HeroCinematic': () => import('../../src/components/sections/nocturne/HeroCinematic.jsx'),
  'nocturne/ZoomPortal': () => import('../../src/components/sections/nocturne/ZoomPortal.jsx'),
  'nocturne/StickyWordCycle': () => import('../../src/components/sections/nocturne/StickyWordCycle.jsx'),
  'fizz/PopManifesto': () => import('../../src/components/sections/fizz/PopManifesto.jsx'),
  'velocity/HeroStrike': () => import('../../src/components/sections/velocity/HeroStrike.jsx'),
  'velocity/TrackMerge': () => import('../../src/components/sections/velocity/TrackMerge.jsx'),
  'atelier/VisionShutter': () => import('../../src/components/sections/atelier/VisionShutter.jsx'),
  'atelier/SelectedWork': () => import('../../src/components/sections/atelier/SelectedWork.jsx'),
  'unity/HeroTwin': () => import('../../src/components/sections/unity/HeroTwin.jsx'),
  'unity/MosaicSlider': () => import('../../src/components/sections/unity/MosaicSlider.jsx'),
  'unity/UniversalLang': () => import('../../src/components/sections/unity/UniversalLang.jsx'),
  'unity/LanguageBlock': () => import('../../src/components/sections/unity/LanguageBlock.jsx'),
  'unity/StageLines': () => import('../../src/components/sections/unity/StageLines.jsx'),
  'unity/FooterTrophy': () => import('../../src/components/sections/unity/FooterTrophy.jsx'),
  'atrium/HeroMassing': () => import('../../src/components/sections/atrium/HeroMassing.jsx'),
  'atrium/ClarityPair': () => import('../../src/components/sections/atrium/ClarityPair.jsx'),
  'atrium/BlueprintDraw': () => import('../../src/components/sections/atrium/BlueprintDraw.jsx'),
  'atrium/ProjectRail': () => import('../../src/components/sections/atrium/ProjectRail.jsx'),
  'atrium/ProcessPin': () => import('../../src/components/sections/atrium/ProcessPin.jsx'),
  'atrium/PeopleScatter': () => import('../../src/components/sections/atrium/PeopleScatter.jsx'),
  'atrium/OrbitRing': () => import('../../src/components/sections/atrium/OrbitRing.jsx'),
  'atrium/StatField': () => import('../../src/components/sections/atrium/StatField.jsx'),
  'meridian/Concept': () => import('../../src/components/sections/meridian/Concept.jsx'),
  'meridian/GallerySlider': () => import('../../src/components/sections/meridian/GallerySlider.jsx'),
  'kin/Intro': () => import('../../src/components/sections/kin/Intro.jsx'),
  'kin/Collection': () => import('../../src/components/sections/kin/Collection.jsx'),
  'apex/Hero': () => import('../../src/components/sections/apex/Hero.jsx').then((m) => flowEdition(m.default)),
  'apex/Statement': () => import('../../src/components/sections/apex/Statement.jsx').then((m) => flowEdition(m.default)),
  'apex/Story': () => import('../../src/components/sections/apex/Story.jsx').then((m) => flowEdition(m.default)),
  'apex/Gallery': () => import('../../src/components/sections/apex/Gallery.jsx').then((m) => flowEdition(m.default)),
  'apex/Models': () => import('../../src/components/sections/apex/Models.jsx').then((m) => flowEdition(m.default)),
  // Three.js: un archivo aparte como cualquier sección; three viaja en su propio
  // chunk compartido y lo bajan solo estos widgets.
  'fizz/HeroBubbles': () => import('../../src/components/sections/fizz/HeroBubbles.jsx'),
  'fizz/FlavorWorlds': () => import('../../src/components/sections/fizz/FlavorWorlds.jsx'),
  'monolith/HeroThree': () => import('../../src/components/sections/monolith/HeroThree.jsx'),
  'atelier/HeroMeaning': () => import('../../src/components/sections/atelier/HeroMeaning.jsx'),
  'atelier/ServicesStone': () => import('../../src/components/sections/atelier/ServicesStone.jsx'),
}

/**
 * Canvas del modelo (fondo + color de texto). Fuera del sitio la sección no
 * hereda el `wrapperClass` de sectionRegistry, así que el frame lo aplica al
 * `#root`. Varias secciones (OutroCTA, FooterSplash) no pintan fondo propio y
 * dependen de esto para ser legibles. Misma tabla que el builder, el ZIP y el
 * preview del editor de LAB (src/lib/modelWrappers.js): eran copias y se
 * podían despegar. main.css la escanea con `@source` para generar las clases.
 */
export async function loadSection(sectionId) {
  const load = SECTIONS[sectionId]
  if (!load) return null
  const mod = await load()
  return typeof mod === 'function' ? mod : mod.default
}

export function canvasFor(sectionId) {
  const model = String(sectionId || '').split('/')[0]
  return MODEL_WRAPPER_CLASS[model] || ''
}
