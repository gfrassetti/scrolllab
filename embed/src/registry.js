/**
 * Secciones hosteables. Import ESTÁTICO a propósito: todo va en el bundle del
 * frame (no chunks lazy que puedan 404 si el CDN/rewrite falla).
 *
 * v1 = la familia footer: misma mecánica que FooterCTA (SplitText de entrada
 * `once`, sin pin, sin scrub, alto acotado) → FLOW puro en el iframe. Los
 * tokens/fuentes de cada modelo los trae `embed/frame/main.css` + `index.html`.
 *
 * NO va acá nada scrolljack pineado (`chapters/HorizontalPanels`) ni scrub sin
 * pin: dentro del iframe acotado renderizan rotas o congeladas. Ver
 * HOSTABLE_SECTIONS en server/sections.js y docs/hosted-component-plan.md.
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
}

/**
 * Canvas del modelo (fondo + color de texto). Fuera del sitio la sección no
 * hereda el `wrapperClass` de sectionRegistry, así que el frame lo aplica al
 * `#root`. Varias secciones (OutroCTA, FooterSplash) no pintan fondo propio y
 * dependen de esto para ser legibles. Strings literales para que Tailwind las
 * escanee (`@source "../src"`) y genere las clases. Coinciden con
 * `wrapperClass` en src/lib/sectionRegistry.jsx.
 */
const MODEL_CANVAS = {
  chapters: 'bg-bone text-ink',
  nocturne: 'bg-noir text-salt',
  monolith: 'bg-concrete text-carbon',
  fizz: 'bg-grape text-foam',
  velocity: 'bg-[#0a1a12] text-[#ece9e2]',
  atelier: 'bg-[#0b0c10] text-white',
  atrium: 'bg-[#f4f1ea] text-[#111111]',
}

export async function loadSection(sectionId) {
  return SECTIONS[sectionId] || null
}

export function canvasFor(sectionId) {
  const model = String(sectionId || '').split('/')[0]
  return MODEL_CANVAS[model] || ''
}
