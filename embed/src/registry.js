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

const SECTIONS = {
  'chapters/FooterCTA': FooterCTA,
  'nocturne/OutroCTA': OutroCTA,
  'monolith/FooterBrutal': FooterBrutal,
  'fizz/FooterSplash': FooterSplash,
  'velocity/FooterVelocity': FooterVelocity,
  'atelier/FooterAtelier': FooterAtelier,
  'atrium/FooterAtrium': FooterAtrium,
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
