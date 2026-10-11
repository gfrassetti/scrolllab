/**
 * Secciones hosteables. Import ESTÁTICO a propósito: todo va en el bundle del
 * frame (no chunks lazy que puedan 404 si el CDN/rewrite falla).
 *
 * v1 = la familia footer: misma mecánica que FooterCTA (SplitText de entrada
 * `once`, sin pin, sin scrub, alto acotado) → FLOW puro en el iframe. Los
 * tokens/fuentes de cada modelo los trae `embed/frame/main.css` + `index.html`.
 *
 * Pineadas y con escenario sticky también van: el frame entra en modo PIN
 * (una pantalla pegada en el sitio que recorre su propio documento) y corren
 * sin tocarlas. Lo que no va (Three.js, navs) está en HOSTABLE_SECTIONS,
 * server/sections.js. Ver docs/hosted-component-plan.md.
 */
import FooterCTA from '../../src/components/sections/chapters/FooterCTA.jsx'
import OutroCTA from '../../src/components/sections/nocturne/OutroCTA.jsx'
import FooterBrutal from '../../src/components/sections/monolith/FooterBrutal.jsx'
import FooterSplash from '../../src/components/sections/fizz/FooterSplash.jsx'
import FooterVelocity from '../../src/components/sections/velocity/FooterVelocity.jsx'
import FooterAtelier from '../../src/components/sections/atelier/FooterAtelier.jsx'
import FooterAtrium from '../../src/components/sections/atrium/FooterAtrium.jsx'
// v1.1 — bloques de contenido FLOW-safe (entrada `once`, sin pin/scrub, padding
// en rem/px). Mismos modelos que la familia footer → tokens ya en main.css.
import BigNumbers from '../../src/components/sections/chapters/BigNumbers.jsx'
import KeyFacts from '../../src/components/sections/atelier/KeyFacts.jsx'
import TypeAccordion from '../../src/components/sections/monolith/TypeAccordion.jsx'
// v1.2 — segunda tanda: ribbons continuos (sin ScrollTrigger pineado; el boost
// por velocidad de scroll simplemente no dispara si el host no scrollea, el
// loop de fondo sigue andando) + más bloques de contenido `once`.
import VelocityMarquee from '../../src/components/sections/chapters/VelocityMarquee.jsx'
import DiagonalMarquee from '../../src/components/sections/nocturne/DiagonalMarquee.jsx'
import SplitReveals from '../../src/components/sections/nocturne/SplitReveals.jsx'
import WorkIndex from '../../src/components/sections/nocturne/WorkIndex.jsx'
import SkewScroller from '../../src/components/sections/monolith/SkewScroller.jsx'
import ExhibitGrid from '../../src/components/sections/monolith/ExhibitGrid.jsx'
import BubbleBenefits from '../../src/components/sections/fizz/BubbleBenefits.jsx'
import AboutClarity from '../../src/components/sections/atelier/AboutClarity.jsx'
// v1.3 — grillas con imagen editable por ítem (list sub-field `image`). Las
// imágenes default son imports bundleados → stubeadas a '' en el embed, cada
// sección guarda su `<img>` con `src ? … : fallback`.
import CanCarousel from '../../src/components/sections/fizz/CanCarousel.jsx'
import StudioCards from '../../src/components/sections/atelier/StudioCards.jsx'
import HelmetGrid from '../../src/components/sections/velocity/HelmetGrid.jsx'
// v1.4 — mismo trato que FooterAtrium: usan `svh` para el aire (el puente de
// altura tarda más pasadas en converger, no rompe). Atrium ya tokenizado.
import ManifestoType from '../../src/components/sections/atrium/ManifestoType.jsx'
import ScopeSerif from '../../src/components/sections/atrium/ScopeSerif.jsx'
// Fase G — sin pin ni runway: reveals `once` o scrub que en FLOW queda en su
// pose final (o en el punto medio de un parallax, que no se nota). Las fotos
// demo de MERIDIAN viven en public/ del sitio: el build las pide con URL
// completa (siteAssets en embed/vite.config.js). El "volver arriba" de KIN
// sube la página del cliente (embed/src/lenis.js).
import MeridianFooter from '../../src/components/sections/meridian/Footer.jsx'
import MeridianInterior from '../../src/components/sections/meridian/Interior.jsx'
import MeridianAmenities from '../../src/components/sections/meridian/Amenities.jsx'
import MeridianPanorama from '../../src/components/sections/meridian/Panorama.jsx'
import KinRooms from '../../src/components/sections/kin/Rooms.jsx'
import KinFooter from '../../src/components/sections/kin/Footer.jsx'
// Fase H — Visit es FLOW puro; Programme y Press se pinean/stickean en el sitio
// y acá corren en su edición `flow` (flowEdition les pasa la prop).
import KinProgramme from '../../src/components/sections/kin/Programme.jsx'
import KinPress from '../../src/components/sections/kin/Press.jsx'
import KinVisit from '../../src/components/sections/kin/Visit.jsx'
import SpecSheet from '../../src/components/sections/monolith/SpecSheet.jsx'
import LastPortrait from '../../src/components/sections/unity/LastPortrait.jsx'
import ParallaxRise from '../../src/components/sections/velocity/ParallaxRise.jsx'
import ParallaxEditorial from '../../src/components/sections/chapters/ParallaxEditorial.jsx'
import ContactForm from '../../src/components/sections/contact/ContactForm.jsx'
import MeridianContact from '../../src/components/sections/meridian/Contact.jsx'
import ContactSteps from '../../src/components/sections/fizz/ContactSteps.jsx'
// Fase I — `npm run screen:lab`: scrub sin pin (siguen el scroll del sitio),
// pineadas y con escenario sticky (el frame entra en modo PIN y recorre su
// propio documento) y portadas. Ver docs/hosted-component-plan.md, Fase I.
import HeroKinetic from '../../src/components/sections/chapters/HeroKinetic.jsx'
import ManifestoReveal from '../../src/components/sections/chapters/ManifestoReveal.jsx'
import StickyImageStory from '../../src/components/sections/chapters/StickyImageStory.jsx'
import HorizontalPanels from '../../src/components/sections/chapters/HorizontalPanels.jsx'
import StackingCards from '../../src/components/sections/chapters/StackingCards.jsx'
import QuoteBreak from '../../src/components/sections/chapters/QuoteBreak.jsx'
import HeroCinematic from '../../src/components/sections/nocturne/HeroCinematic.jsx'
import ZoomPortal from '../../src/components/sections/nocturne/ZoomPortal.jsx'
import StickyWordCycle from '../../src/components/sections/nocturne/StickyWordCycle.jsx'
import PopManifesto from '../../src/components/sections/fizz/PopManifesto.jsx'
import HeroStrike from '../../src/components/sections/velocity/HeroStrike.jsx'
import TrackMerge from '../../src/components/sections/velocity/TrackMerge.jsx'
import VisionShutter from '../../src/components/sections/atelier/VisionShutter.jsx'
import SelectedWork from '../../src/components/sections/atelier/SelectedWork.jsx'
import HeroTwin from '../../src/components/sections/unity/HeroTwin.jsx'
import MosaicSlider from '../../src/components/sections/unity/MosaicSlider.jsx'
import UniversalLang from '../../src/components/sections/unity/UniversalLang.jsx'
import LanguageBlock from '../../src/components/sections/unity/LanguageBlock.jsx'
import StageLines from '../../src/components/sections/unity/StageLines.jsx'
import FooterTrophy from '../../src/components/sections/unity/FooterTrophy.jsx'
import HeroMassing from '../../src/components/sections/atrium/HeroMassing.jsx'
import ClarityPair from '../../src/components/sections/atrium/ClarityPair.jsx'
import BlueprintDraw from '../../src/components/sections/atrium/BlueprintDraw.jsx'
import ProjectRail from '../../src/components/sections/atrium/ProjectRail.jsx'
import ProcessPin from '../../src/components/sections/atrium/ProcessPin.jsx'
import PeopleScatter from '../../src/components/sections/atrium/PeopleScatter.jsx'
import OrbitRing from '../../src/components/sections/atrium/OrbitRing.jsx'
import StatField from '../../src/components/sections/atrium/StatField.jsx'
import MeridianHero from '../../src/components/sections/meridian/Hero.jsx'
import MeridianConcept from '../../src/components/sections/meridian/Concept.jsx'
import MeridianGallerySlider from '../../src/components/sections/meridian/GallerySlider.jsx'
import MeridianLocation from '../../src/components/sections/meridian/Location.jsx'
import KinIntro from '../../src/components/sections/kin/Intro.jsx'
import KinCollection from '../../src/components/sections/kin/Collection.jsx'
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
  'chapters/FooterCTA': FooterCTA,
  'nocturne/OutroCTA': OutroCTA,
  'monolith/FooterBrutal': FooterBrutal,
  'fizz/FooterSplash': FooterSplash,
  'velocity/FooterVelocity': FooterVelocity,
  'atelier/FooterAtelier': FooterAtelier,
  'atrium/FooterAtrium': FooterAtrium,
  'chapters/BigNumbers': BigNumbers,
  'atelier/KeyFacts': KeyFacts,
  'monolith/TypeAccordion': TypeAccordion,
  'chapters/VelocityMarquee': VelocityMarquee,
  'nocturne/DiagonalMarquee': DiagonalMarquee,
  'nocturne/SplitReveals': SplitReveals,
  'nocturne/WorkIndex': WorkIndex,
  'monolith/SkewScroller': SkewScroller,
  'monolith/ExhibitGrid': ExhibitGrid,
  'fizz/BubbleBenefits': BubbleBenefits,
  'atelier/AboutClarity': AboutClarity,
  'fizz/CanCarousel': CanCarousel,
  'atelier/StudioCards': StudioCards,
  'velocity/HelmetGrid': HelmetGrid,
  'atrium/ManifestoType': ManifestoType,
  'atrium/ScopeSerif': ScopeSerif,
  'meridian/Footer': MeridianFooter,
  'meridian/Interior': MeridianInterior,
  'meridian/Amenities': MeridianAmenities,
  'meridian/Panorama': MeridianPanorama,
  'kin/Rooms': KinRooms,
  'kin/Footer': KinFooter,
  'kin/Programme': flowEdition(KinProgramme),
  'kin/Press': flowEdition(KinPress),
  'kin/Visit': KinVisit,
  'monolith/SpecSheet': SpecSheet,
  'unity/LastPortrait': LastPortrait,
  'velocity/ParallaxRise': ParallaxRise,
  'chapters/ParallaxEditorial': ParallaxEditorial,
  'contact/ContactForm': ContactForm,
  'meridian/Contact': MeridianContact,
  'fizz/ContactSteps': ContactSteps,
  'chapters/HeroKinetic': HeroKinetic,
  'chapters/ManifestoReveal': ManifestoReveal,
  'chapters/StickyImageStory': StickyImageStory,
  'chapters/HorizontalPanels': HorizontalPanels,
  'chapters/StackingCards': StackingCards,
  'chapters/QuoteBreak': QuoteBreak,
  'nocturne/HeroCinematic': HeroCinematic,
  'nocturne/ZoomPortal': ZoomPortal,
  'nocturne/StickyWordCycle': StickyWordCycle,
  'fizz/PopManifesto': PopManifesto,
  'velocity/HeroStrike': HeroStrike,
  'velocity/TrackMerge': TrackMerge,
  'atelier/VisionShutter': VisionShutter,
  'atelier/SelectedWork': SelectedWork,
  'unity/HeroTwin': HeroTwin,
  'unity/MosaicSlider': MosaicSlider,
  'unity/UniversalLang': UniversalLang,
  'unity/LanguageBlock': LanguageBlock,
  'unity/StageLines': StageLines,
  'unity/FooterTrophy': FooterTrophy,
  'atrium/HeroMassing': HeroMassing,
  'atrium/ClarityPair': ClarityPair,
  'atrium/BlueprintDraw': BlueprintDraw,
  'atrium/ProjectRail': ProjectRail,
  'atrium/ProcessPin': ProcessPin,
  'atrium/PeopleScatter': PeopleScatter,
  'atrium/OrbitRing': OrbitRing,
  'atrium/StatField': StatField,
  'meridian/Hero': MeridianHero,
  'meridian/Concept': MeridianConcept,
  'meridian/GallerySlider': MeridianGallerySlider,
  'meridian/Location': MeridianLocation,
  'kin/Intro': KinIntro,
  'kin/Collection': KinCollection,
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
  return SECTIONS[sectionId] || null
}

export function canvasFor(sectionId) {
  const model = String(sectionId || '').split('/')[0]
  return MODEL_WRAPPER_CLASS[model] || ''
}
