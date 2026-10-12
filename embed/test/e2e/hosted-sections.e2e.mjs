/**
 * E2E: cada sección de HOSTABLE_SECTIONS, embebida en un sitio ajeno.
 *
 * Para cada id de `server/sections.js#HOSTABLE_SECTIONS`:
 *  1. login dev → crear instancia → publicar con props (incluye un marcador de
 *     texto único + bg/fg).
 *  2. cargar una página anfitriona con el <script> del loader y la key real.
 *  3. verificar que el iframe cross-origin (:4179) montó, que el host NO lo puede
 *     leer, que #root renderió el marcador (⇒ son *estos* props, no un cache),
 *     que no hay scroll horizontal dentro del frame y que el puente de altura
 *     dimensionó el iframe.
 *
 * Además, un bloque responsive: FooterCTA / BigNumbers / TypeAccordion /
 * FooterAtrium a 375 / 768 / 1280 px sobre un host "plano" (sin padding hostil),
 * sin overflow horizontal y con el iframe dimensionado al contenido.
 *
 * Comparte los 3 procesos con embed.e2e.mjs (`serve()` reusa lo que ya escucha);
 * el runner los corre en serie (`--test-concurrency=1`).
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright'
import { API as E2E_API, redirectDefaultApi } from './ports.mjs'
import { HOSTABLE_SECTIONS } from '../../../server/sections.js'

const REPO = path.normalize(path.join(fileURLToPath(import.meta.url), '../../../..'))
const API = E2E_API
const HOST_URL = 'http://localhost:4178/embed/test/iframe-host.html'
const PLAIN_URL = 'http://localhost:4178/embed/test/iframe-host-plain.html'
const LAUNCH_ARGS = [
  '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
]

// Props + marcador por sección. Con `reducedMotion: 'reduce'` los componentes
// saltan SplitText y el texto queda plano → el marcador aparece literal en
// innerText. Un id nuevo en HOSTABLE_SECTIONS sin entrada acá hace fallar el test.
const CASES = {
  'chapters/FooterCTA': {
    props: { ctaWord: 'MKFTCA', email: 'e2e@t.co', legal: 'x', bg: '#101014', fg: '#f5f5f5' },
    marker: 'MKFTCA',
  },
  'nocturne/OutroCTA': {
    props: { ctaWord: 'MKOTRO', email: 'e2e@t.co', legal: 'x', bg: '#0e0e11', fg: '#ece9e2' },
    marker: 'MKOTRO',
  },
  'monolith/FooterBrutal': {
    props: { ctaWord: 'MKBRUT', email: 'e2e@t.co', legal: 'x', bg: '#2b3cff', fg: '#f2f2f2' },
    marker: 'MKBRUT',
  },
  'fizz/FooterSplash': {
    props: { ctaWord: 'MKSPLA', email: 'e2e@t.co', legal: 'x', bg: '#241352', fg: '#fff3e2' },
    marker: 'MKSPLA',
  },
  'velocity/FooterVelocity': {
    props: { line: 'MKVELO', legal: 'x', bg: '#0a1a12', fg: '#ece9e2' },
    marker: 'MKVELO',
  },
  'atelier/FooterAtelier': {
    props: { line: 'MKATEL', eyebrow: 'e', brand: 'B', legal: 'x', bg: '#0b0c10', fg: '#ffffff' },
    marker: 'MKATEL',
  },
  'atrium/FooterAtrium': {
    props: { mark: 'MKATRM', legal: 'x', bg: '#111111', fg: '#f4f1ea' },
    marker: 'MKATRM',
  },
  'chapters/BigNumbers': {
    props: { bg: '#0e1420', fg: '#eef2f7', stats: [{ value: '42', suffix: '+', label: 'MKBIGN' }] },
    marker: 'MKBIGN',
  },
  'atelier/KeyFacts': {
    props: { eyebrow: 'e', title: 'MKKEYF', bg: '#101820', fg: '#eef2f7', facts: [{ value: '9', label: 'x' }] },
    marker: 'MKKEYF',
  },
  'monolith/TypeAccordion': {
    props: {
      label: 'MKTYPA',
      unit: '01',
      total: '03',
      bg: '#0c0c0c',
      fg: '#e8e8e8',
      items: [{ title: 'MKTYPA', body: 'cuerpo' }],
    },
    marker: 'MKTYPA',
  },
  'chapters/VelocityMarquee': {
    props: { text: 'MKMARQ', bg: '#101014', fg: '#f5f5f5' },
    marker: 'MKMARQ',
  },
  'nocturne/DiagonalMarquee': {
    props: { textA: 'MKDIAG', textB: 'sub', bg: '#0e0e11', fg: '#ece9e2' },
    marker: 'MKDIAG',
  },
  'nocturne/SplitReveals': {
    props: {
      seq: '01',
      total: '03',
      label: 'x',
      bg: '#0e0e11',
      fg: '#ece9e2',
      beats: [{ kicker: 'MKSPLIT', title: 'MKSPLIT', body: 'cuerpo' }],
    },
    marker: 'MKSPLIT',
  },
  'nocturne/WorkIndex': {
    props: {
      seq: '01',
      total: '03',
      label: 'x',
      bg: '#0e0e11',
      fg: '#ece9e2',
      works: [{ index: '001', title: 'MKWORK', category: 'x', year: '2026' }],
    },
    marker: 'MKWORK',
  },
  'monolith/SkewScroller': {
    props: {
      unit: '01',
      total: '03',
      label: 'x',
      bg: '#cdcbc4',
      fg: '#101010',
      words: [{ word: 'MKSKEW' }],
    },
    marker: 'MKSKEW',
  },
  'monolith/ExhibitGrid': {
    props: {
      unit: '01',
      total: '03',
      label: 'x',
      bg: '#cdcbc4',
      fg: '#101010',
      exhibits: [{ code: 'MKEXHB', caption: 'x' }],
    },
    marker: 'MKEXHB',
  },
  'fizz/BubbleBenefits': {
    props: {
      eyebrow: 'x',
      title: 'MKBUBL',
      bg: '#241352',
      fg: '#fff3e2',
      benefits: [{ title: 'MKBUBL', body: 'x', color: '#ff3ea5' }],
    },
    marker: 'MKBUBL',
  },
  'atelier/AboutClarity': {
    props: { eyebrow: 'x', title: 'MKABTC', body: 'cuerpo', bg: '#0b0c10', fg: '#ffffff' },
    marker: 'MKABTC',
  },
  'fizz/CanCarousel': {
    props: {
      eyebrow: 'x',
      title: 'MKCANS',
      cta: 'x',
      canLabel: 'MK',
      bg: '#241352',
      fg: '#fff3e2',
      cans: [{ name: 'MKCANS', note: 'x', color: '#ff3ea5' }],
    },
    marker: 'MKCANS',
  },
  'atelier/StudioCards': {
    props: {
      note: 'MKSTUD',
      cta: 'x',
      bg: '#e8e8e6',
      fg: '#111214',
      cards: [{ title: 'MKSTUD', label: 'x' }],
    },
    marker: 'MKSTUD',
  },
  'velocity/HelmetGrid': {
    props: {
      eyebrow: 'x',
      title: 'MKHELM',
      body: 'cuerpo',
      bg: '#0a1a12',
      fg: '#ece9e2',
      items: [{ name: 'MKHELM', year: '01' }],
    },
    marker: 'MKHELM',
  },
  'atrium/ManifestoType': {
    props: {
      lineOne: 'MKMANI',
      lineTwo: 'type',
      left: 'x',
      right: 'x',
      bg: '#f4f1ea',
      fg: '#111111',
    },
    marker: 'MKMANI',
  },
  'atrium/ScopeSerif': {
    props: { body: 'MKSCOP', bg: '#f4f1ea', fg: '#111111' },
    marker: 'MKSCOP',
  },
  // Fase G — `checkFg`: además del fondo, el color de texto llega a la sección.
  'meridian/Footer': {
    props: {
      wordmark: 'MKMFOO',
      monogram: 'MK',
      socials: [{ label: 'Instagram', href: 'https://instagram.com/x' }],
      bg: '#0f2a24',
      fg: '#f3e9d2',
    },
    marker: 'MKMFOO',
    checkFg: true,
  },
  'meridian/Interior': {
    props: {
      links: [{ label: 'MKMINT', img: 'https://cdn.test/a.webp', text: 'texto' }],
      spots: [{ slide: '1', x: '30', y: '40', title: 'Punto', body: 'cuerpo' }],
      bg: '#1b1b1f',
      fg: '#efe7da',
    },
    marker: 'MKMINT',
    checkFg: true,
  },
  'meridian/Amenities': {
    props: { title: 'MKMAME', label: 'x', items: [{ title: 'Pool', text: 'x' }], bg: '#20303f', fg: '#f2efe6' },
    marker: 'MKMAME',
    checkFg: true,
  },
  'meridian/Panorama': {
    props: { title: 'MKMPAN', ctaLabel: 'x', ctaHref: '#x', bg: '#000000', fg: '#ffe9b8' },
    marker: 'MKMPAN',
    checkFg: true,
  },
  'kin/Rooms': {
    props: { heading: 'x', rooms: [{ no: '01', title: 'MKKROO', dates: 'x', href: '#x' }], bg: '#f1ece2', fg: '#1d1a16', accent: '#2b3cff' },
    marker: 'MKKROO',
    checkFg: true,
  },
  'kin/Footer': {
    props: {
      line1: 'MKKFOO',
      line2: 'x',
      columns: [{ title: 'Visit', text: 'Calle 1' }],
      links: [{ label: 'IG', href: 'https://instagram.com' }],
      topLabel: 'MKTOP',
      bg: '#16243a',
      fg: '#f5f0e6',
      accent: '#ffb000',
    },
    marker: 'MKKFOO',
    checkFg: true,
  },
  'monolith/SpecSheet': {
    props: { label: 'x', specs: [{ label: 'Dato', value: 'MKSPEC' }], bg: '#101010', fg: '#cdcbc4' },
    marker: 'MKSPEC',
    checkFg: true,
  },
  'unity/LastPortrait': {
    props: { title: 'MKLAST', name: 'x', bg: '#f4efe6', fg: '#141210' },
    marker: 'MKLAST',
    checkFg: true,
  },
  'velocity/ParallaxRise': {
    props: { eyebrow: 'x', title: 'MKRISE', ctaHref: '#x', bg: '#0b1f3a', fg: '#ffffff', accent: '#ff5a1f' },
    marker: 'MKRISE',
    checkFg: true,
  },
  'kin/Programme': {
    props: {
      line1: 'MKKPRO',
      line2: 'x',
      year: '2027',
      items: [{ no: '01', title: 'Show', dates: 'x', from: '2', to: '5', href: '#x' }],
      bg: '#f1ece2',
      fg: '#1d1a16',
      accent: '#2b3cff',
    },
    marker: 'MKKPRO',
    checkFg: true,
  },
  'kin/Press': {
    props: { quotes: [{ text: 'MKKPRE words', source: 'Diario' }], bg: '#16243a', fg: '#f5f0e6', accent: '#ffb000' },
    marker: 'MKKPRE',
    checkFg: true,
  },
  'kin/Visit': {
    props: {
      line1: 'MKKVIS',
      line2: 'x',
      rows: [{ label: 'Entrada', text: 'Libre' }],
      days: [{ label: 'Lun', open: '10', close: '18' }],
      todayLabel: 'Hoy',
      ctaLabel: 'Entradas',
      ctaHref: '#x',
      bg: '#f1ece2',
      fg: '#1d1a16',
      accent: '#2b3cff',
    },
    marker: 'MKKVIS',
    checkFg: true,
  },
  'apex/Hero': {
    props: {
      brand: 'APEX',
      line1: 'MKAPEXH',
      line2: 'x',
      links: [{ label: 'Models', href: '#models' }],
      ctaLabel: 'Reserve',
      ctaHref: '#x',
      blurb: 'x',
      chapters: [{ label: 'One' }, { label: 'Two' }],
      showGrain: 'off',
      bg: '#101820',
      fg: '#eef2f7',
      accent: '#ffb000',
      washColor: '#203060',
    },
    marker: 'MKAPEXH',
    checkFg: true,
  },
  'apex/Statement': {
    props: {
      eyebrow: 'MKAPEXS',
      statement: 'We build *quieter* cars.',
      stats: [{ value: '620', label: 'km' }, { value: '14', label: 'coats' }],
      linkLabel: 'Read',
      linkHref: '#x',
      bg: '#101820',
      fg: '#eef2f7',
      accent: '#ffb000',
    },
    marker: 'MKAPEXS',
    checkFg: true,
  },
  'apex/Story': {
    props: {
      blocks: [
        { label: 'MKAPEXY', title: 'Title one', text: 'x', image: 'https://zq.test/a.jpg', word: 'One' },
        { label: 'Two', title: 'Title two', text: 'y', image: 'https://zq.test/b.jpg', word: 'Two' },
      ],
      bg: '#101820',
      fg: '#eef2f7',
      accent: '#ffb000',
    },
    marker: 'MKAPEXY',
    checkFg: true,
  },
  'apex/Gallery': {
    props: {
      eyebrow: 'MKAPEXG',
      slides: [
        { image: 'https://zq.test/a.jpg', title: 'One', caption: 'x' },
        { image: 'https://zq.test/b.jpg', title: 'Two', caption: 'y' },
      ],
      nextLabel: 'Next',
      prevLabel: 'Back',
      bg: '#101820',
      fg: '#eef2f7',
      accent: '#ffb000',
    },
    marker: 'MKAPEXG',
    checkFg: true,
  },
  'apex/Models': {
    props: {
      eyebrow: 'MKAPEXM',
      caption: 'x',
      items: [
        { name: 'Alpha', image: 'https://zq.test/a.jpg', href: '#a' },
        { name: 'Beta', image: 'https://zq.test/b.jpg', href: '#b' },
      ],
      bg: '#101820',
      fg: '#eef2f7',
      accent: '#ffb000',
    },
    marker: 'MKAPEXM',
    checkFg: true,
  },
  'chapters/ParallaxEditorial': {
    props: { label: 'MKPEDI', figures: [{ caption: 'x' }], bg: '#1a1714', fg: '#efe8dc' },
    marker: 'MKPEDI',
    checkFg: true,
  },
  // Fase I: formularios, pineadas / sticky (modo PIN), scrub y portadas.
  'contact/ContactForm': {
    props: { eyebrow: 'MKCFCO', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKCFCO',
  },
  'meridian/Contact': {
    props: { eyebrow: 'MKCME', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKCME',
  },
  'fizz/ContactSteps': {
    props: { nameTitle: 'MKCSFI', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKCSFI',
  },
  'chapters/HeroKinetic': {
    props: { lineOne: 'MKHKCH', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKHKCH',
  },
  'chapters/ManifestoReveal': {
    props: { chapterLabel: 'MKMRCH', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKMRCH',
  },
  'chapters/StickyImageStory': {
    props: { chapterLabel: 'MKSISCH', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKSISCH',
  },
  'chapters/HorizontalPanels': {
    props: { chapterLabel: 'MKHPCH', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKHPCH',
  },
  'chapters/StackingCards': {
    props: { chapterLabel: 'MKSCCH', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKSCCH',
  },
  'chapters/QuoteBreak': {
    props: { chapterLabel: 'MKQBCH', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKQBCH',
  },
  'nocturne/HeroCinematic': {
    props: { titleTop: 'MKHCNO', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKHCNO',
  },
  'nocturne/ZoomPortal': {
    props: { seqLabel: 'MKZPNO', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKZPNO',
  },
  'nocturne/StickyWordCycle': {
    props: { seqLabel: 'MKSWCNO', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKSWCNO',
  },
  'fizz/PopManifesto': {
    props: { eyebrow: 'MKPMFI', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKPMFI',
  },
  'velocity/HeroStrike': {
    props: { lineLeft: 'MKHSVE', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKHSVE',
  },
  // En calma la galería no se muestra (queda el cruce): el marcador va en el título del cruce.
  'velocity/TrackMerge': {
    props: { mergeTitleA: 'MKTMVE', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKTMVE',
  },
  'atelier/VisionShutter': {
    props: { line1: 'MKVSAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKVSAT',
  },
  'atelier/SelectedWork': {
    props: { title: 'MKSWAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKSWAT',
  },
  // Footer con newsletter: en LAB manda por mail (labForms.js).
  'apex/Footer': {
    props: { descriptor: 'MKAPEXF', bg: '#04070d', fg: '#e8edf6' },
    marker: 'MKAPEXF',
  },
  // Three.js (Fase L): el canvas va aparte; el marcador es texto del DOM.
  'fizz/HeroBubbles': {
    props: { tagline: 'MKHBFZ', bg: '#2b4bff', fg: '#fff4e0' },
    marker: 'MKHBFZ',
  },
  'fizz/FlavorWorlds': {
    // Sin `bg`: el fondo es el color de cada sabor (startBg y los de la lista).
    props: { eyebrow: 'MKFWFZ', startBg: '#2b4bff' },
    marker: 'MKFWFZ',
  },
  'monolith/HeroThree': {
    props: { subtitle: 'MKH3MO', bg: '#d6d2c8', fg: '#111111' },
    marker: 'MKH3MO',
  },
  'atelier/HeroMeaning': {
    // El titular entra letra por letra (oculto hasta la entrada): el marcador va en la bajada.
    props: { body: 'MKHMAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKHMAT',
  },
  'atelier/ServicesStone': {
    props: { title: 'MKSSAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKSSAT',
  },
  'unity/HeroTwin': {
    props: { body: 'MKHTUN', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKHTUN',
  },
  'unity/MosaicSlider': {
    props: { eyebrow: 'MKMSUN', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKMSUN',
  },
  'unity/UniversalLang': {
    props: { eyebrow: 'MKULUN', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKULUN',
  },
  'unity/LanguageBlock': {
    props: { eyebrow: 'MKLBUN', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKLBUN',
  },
  'unity/StageLines': {
    props: { eyebrow1: 'MKSLUN', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKSLUN',
  },
  'unity/FooterTrophy': {
    props: { eyebrow: 'MKFTUN', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKFTUN',
  },
  'atrium/HeroMassing': {
    props: { lineOne: 'MKHMAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKHMAT',
  },
  'atrium/ClarityPair': {
    props: { kicker: 'MKCPAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKCPAT',
  },
  'atrium/BlueprintDraw': {
    props: { kicker: 'MKBDAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKBDAT',
  },
  'atrium/ProjectRail': {
    props: { kicker: 'MKPRAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKPRAT',
  },
  'atrium/ProcessPin': {
    props: { label: 'MKPPAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKPPAT',
  },
  'atrium/PeopleScatter': {
    props: { label: 'MKPSAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKPSAT',
  },
  'atrium/OrbitRing': {
    props: { lineOne: 'MKORAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKORAT',
  },
  'atrium/StatField': {
    props: { kicker: 'MKSFAT', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKSFAT',
  },
  'meridian/Concept': {
    props: { kicker: 'MKCME', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKCME',
  },
  // Sin texto visible editable (solo fotos): el marcador va en el nombre accesible de la galería.
  'meridian/GallerySlider': {
    props: { galleryLabel: 'MKGSME', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKGSME',
    ariaMarker: true,
  },
  'kin/Intro': {
    props: { line1: 'MKIKI', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKIKI',
  },
  'kin/Collection': {
    props: { line1: 'MKCKI', bg: '#141414', fg: '#f0f0f0' },
    marker: 'MKCKI',
  },
}

const rgb = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

// Responsive: todas las HOSTABLE_SECTIONS, no solo una muestra — "cada una debe
// verse bien" en mobile/tablet/desktop.
const RESPONSIVE_SECTIONS = HOSTABLE_SECTIONS
// `FooterAtrium`/`ManifestoType`/`ScopeSerif` usan `svh` para el aire. Antes
// se saltaban el chequeo de alto: dentro del iframe el `svh` medía el propio
// iframe y el alto se retroalimentaba (ManifestoType crecía sin fin en
// desktop). Ahora el build las reescribe al viewport del sitio
// (embed/hostViewportUnits.js) y tienen que converger como las demás.
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 780 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
]

async function isUp(url) {
  try {
    return (await fetch(url)).status < 500
  } catch {
    return false
  }
}
async function waitUp(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    if (await isUp(url)) return true
    await sleep(500)
  }
  throw new Error(`no levantó: ${url}`)
}
async function serve(args, probeUrl) {
  if (await isUp(probeUrl)) return null
  const child = spawn(process.execPath, args, { cwd: REPO, stdio: ['ignore', 'ignore', 'pipe'] })
  child.stderr.on('data', (b) => {
    const s = String(b)
    if (/EADDRINUSE|Error:/.test(s)) process.stderr.write(`[e2e srv] ${s}`)
  })
  return child
}

describe('embed e2e — todas las HOSTABLE_SECTIONS', () => {
  const procs = []
  let browser
  let headers

  before(async () => {
    for (const child of await Promise.all([
      serve(['embed/test/e2e-api.mjs'], `${API}/api/embed/loader`),
      serve(['embed/test/static-server.mjs', '4178'], 'http://localhost:4178/'),
      serve(['embed/test/static-server.mjs', '4179'], 'http://localhost:4179/'),
    ])) {
      if (child) procs.push(child)
    }
    await Promise.all([
      waitUp(`${API}/api/embed/loader`),
      waitUp('http://localhost:4178/'),
      waitUp('http://localhost:4179/'),
    ])

    const login = await fetch(`${API}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'sections-e2e@test.com' }),
    })
    assert.ok(login.ok, 'dev-login')
    const cookie = (login.headers.getSetCookie?.() || [])
      .map((c) => c.split(';')[0])
      .join('; ')
    assert.ok(cookie, 'cookie de sesión')
    headers = { 'content-type': 'application/json', cookie }

    browser = redirectDefaultApi(await chromium.launch({
      args: LAUNCH_ARGS,
      // Un Chromium del sistema (contenedores/CI sin `playwright install`).
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    }))
  })

  after(async () => {
    await browser?.close()
    for (const p of procs) p.kill('SIGTERM')
    await sleep(300)
    for (const p of procs) if (!p.killed) p.kill('SIGKILL')
  })

  async function seed(sectionId, props) {
    const created = await fetch(`${API}/api/hosted`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sectionId }),
    })
    assert.ok(created.ok, `crear ${sectionId} (${created.status})`)
    const id = (await created.json()).instance.id
    const pub = await fetch(`${API}/api/hosted/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ draftProps: props, domains: [], publish: true }),
    })
    assert.ok(pub.ok, `publicar ${sectionId} (${pub.status})`)
    const inst = (await pub.json()).instance
    assert.ok(inst.key, `key de ${sectionId}`)
    return { id, key: inst.key, published: inst.publishedProps }
  }
  async function unseed(id) {
    await fetch(`${API}/api/hosted/${id}`, { method: 'DELETE', headers }).catch(() => {})
  }

  async function openHost(
    key,
    { url = HOST_URL, viewport = { width: 1280, height: 900 }, reducedMotion = 'reduce' } = {},
  ) {
    const context = await browser.newContext({ viewport, reducedMotion })
    const page = await context.newPage()
    await page.route(url, async (route) => {
      const res = await route.fetch()
      const body = (await res.text()).replace('__E2E_KEY__', key)
      await route.fulfill({ response: res, body, contentType: 'text/html' })
    })
    await page.goto(url)
    return { context, page }
  }

  const frameOf = (page) => page.frames().find((f) => f.url().includes(':4179/'))
  async function waitFrame(page) {
    for (let i = 0; i < 40; i++) {
      const fr = frameOf(page)
      if (fr) {
        const txt = await fr
          .evaluate(() => document.getElementById('root')?.innerText || '')
          .catch(() => '')
        if (txt.trim()) return { frame: fr, text: txt }
      }
      await sleep(500)
    }
    throw new Error('el frame nunca renderió #root con texto')
  }

  // --- una por una: cada hosteable renderiza embebida con sus props ---
  for (const sectionId of HOSTABLE_SECTIONS) {
    it(`${sectionId} — se ve embebida en un sitio ajeno`, async () => {
      const c = CASES[sectionId]
      assert.ok(c, `falta un caso en CASES para '${sectionId}'`)

      const { id, key, published } = await seed(sectionId, c.props)
      // el server aceptó bg (hex) y lo persistió
      assert.equal(published.bg, c.props.bg, `${sectionId}: bg no persistió`)

      const { context, page } = await openHost(key)
      try {
        const { frame, text } = await waitFrame(page)
        const shown = c.ariaMarker
          ? await frame.evaluate((m) => !!document.querySelector(`[aria-label="${m}"]`), c.marker)
          : new RegExp(c.marker).test(text)
        assert.ok(shown, `${sectionId}: no renderizó el marcador`)

        const iframe = page.locator('iframe[data-scrolllab-frame]')
        await iframe.waitFor({ state: 'attached', timeout: 15_000 })
        assert.equal(
          await iframe.evaluate((el) => el.contentDocument === null),
          true,
          `${sectionId}: el host puede leer el iframe`,
        )

        const oflow = await frame.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        assert.ok(oflow <= 2, `${sectionId}: scroll horizontal de ${oflow}px en el frame`)

        // bg aplicado por style inline (pisa el canvas del modelo)
        const bg = await frame.evaluate(() => {
          const el = document.querySelector('#root section, #root footer')
          return el ? getComputedStyle(el).backgroundColor : ''
        })
        assert.ok(/\d/.test(bg), `${sectionId}: sección sin background computado`)
        if (c.checkFg) {
          const colors = await frame.evaluate(() => {
            const el = document.querySelector('#root section, #root footer')
            const cs = getComputedStyle(el)
            return { bg: cs.backgroundColor, fg: cs.color }
          })
          assert.equal(colors.bg, rgb(c.props.bg), `${sectionId}: el fondo editado no llegó`)
          assert.equal(colors.fg, rgb(c.props.fg), `${sectionId}: el color de texto editado no llegó`)
        }

        let h = 0
        for (let i = 0; i < 20; i++) {
          h = await iframe.evaluate((el) => el.getBoundingClientRect().height)
          if (h > 50) break
          await sleep(400)
        }
        assert.ok(h > 50, `${sectionId}: alto del iframe = ${h}`)

        if (sectionId === 'kin/Footer') {
          // «Volver arriba» sube la página del cliente (embed/src/lenis.js → loader)
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
          await sleep(200)
          assert.ok((await page.evaluate(() => window.scrollY)) > 100, 'el host no scrolleó para la prueba')
          await frame.getByText('MKTOP').click()
          let y = -1
          for (let i = 0; i < 20; i++) {
            y = await page.evaluate(() => window.scrollY)
            if (y < 2) break
            await sleep(150)
          }
          assert.ok(y < 2, `kin/Footer: «volver arriba» no subió la página del host (scrollY=${y})`)
        }
      } finally {
        await context.close()
        await unseed(id)
      }
    })
  }

  // --- con movimiento: los reveals siguen el scroll del SITIO ---
  // En FLOW el frame mide lo que la sección y no scrollea: sin el scrollerProxy
  // de embed/frame/main.jsx, ScrollTrigger tomaba el frame entero como viewport
  // y un reveal `top 70%` en el 30% de abajo no se disparaba nunca (filas de
  // SplitReveals transparentes y con la foto recortada). Los casos de arriba
  // corren con reduce (calmReveal), por eso no lo veían.
  it('nocturne/SplitReveals — con movimiento, cada fila se revela al llegar con el scroll del host', async () => {
    const beats = [1, 2, 3, 4, 5].map((n) => ({ kicker: `K${n}`, title: `MKROW${n}`, body: 'cuerpo' }))
    const { id, key } = await seed('nocturne/SplitReveals', { seq: '01', total: '05', label: 'x', beats })
    const { context, page } = await openHost(key, { url: PLAIN_URL, reducedMotion: 'no-preference' })
    try {
      const { frame } = await waitFrame(page)
      const rows = () =>
        frame.evaluate(() =>
          [...document.querySelectorAll('[data-beat-img]')].map((img) => {
            const row = img.parentElement
            const copy = row.querySelector('[data-beat-copy]')
            return {
              clipped: /inset\([^)]*100%/.test(getComputedStyle(img).clipPath),
              copyOpacity: copy ? Number(getComputedStyle(copy).opacity) : 1,
            }
          }),
        )
      await sleep(1200)
      const before = await rows()
      assert.equal(before.length, 5, 'SplitReveals: no están las 5 filas')
      assert.ok(before[4].clipped, 'la última fila se reveló antes de llegar a ella')

      // scroll del host hasta el final, de a poco (como alguien que lee)
      const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
      for (let y = 0; y <= total + 200; y += 150) {
        await page.evaluate((v) => window.scrollTo(0, v), y)
        await sleep(60)
      }
      await sleep(1600)
      const after = await rows()
      after.forEach((r, i) => {
        assert.ok(!r.clipped, `fila ${i + 1}: la foto sigue recortada`)
        assert.ok(r.copyOpacity > 0.9, `fila ${i + 1}: el texto sigue transparente (${r.copyOpacity})`)
      })
    } finally {
      await context.close()
      await unseed(id)
    }
  })

  // --- PIN: una sección pineada avanza con el scroll del sitio ---
  // El loader mete el iframe en un contenedor alto (moverlo lo recargaba: el
  // frame recargado no sabía el alto del sitio, ignoraba el progreso y la
  // sección quedaba en blanco).
  for (const [sectionId, props, marker] of [
    ['chapters/HorizontalPanels', { chapterLabel: 'MKPIN', variant: 'type' }, 'MKPIN'],
    ['chapters/StackingCards', { chapterLabel: 'MKSTACK' }, 'MKSTACK'],
  ]) {
    it(`${sectionId} — con movimiento, se pega y avanza con el scroll del sitio`, async () => {
      const { id, key } = await seed(sectionId, props)
      const { context, page } = await openHost(key, { url: PLAIN_URL, reducedMotion: 'no-preference' })
      try {
        const { frame } = await waitFrame(page)
        const wrap = page.locator('[data-scrolllab-pin]')
        await wrap.waitFor({ state: 'attached', timeout: 15_000 })
        // El sitio sigue abajo del widget (el host plano termina en el embed).
        await page.evaluate(() => {
          const rest = document.createElement('div')
          rest.style.height = '200vh'
          document.body.append(rest)
        })
        const { top, height } = await wrap.evaluate((el) => ({ top: el.getBoundingClientRect().top + scrollY, height: el.offsetHeight }))
        const vh = await page.evaluate(() => innerHeight)
        assert.ok(height > vh * 1.5, `${sectionId}: el recorrido es muy corto (${height}px)`)
        // A mitad del recorrido: el iframe pegado arriba y el frame scrolleado a la mitad.
        await page.evaluate((y) => window.scrollTo(0, y), top + (height - vh) / 2)
        let state = null
        for (let i = 0; i < 20; i++) {
          await sleep(150)
          const frameTop = await page.locator('iframe[data-scrolllab-frame]').evaluate((el) => el.getBoundingClientRect().top)
          const f = await frame.evaluate(() => ({ y: scrollY, max: document.documentElement.scrollHeight - innerHeight }))
          state = { frameTop, ...f }
          if (Math.abs(f.y - f.max / 2) < f.max * 0.1) break
        }
        assert.ok(Math.abs(state.frameTop) <= 2, `${sectionId}: el iframe no quedó pegado (top ${state.frameTop})`)
        assert.ok(Math.abs(state.y - state.max / 2) < state.max * 0.1, `${sectionId}: el frame no siguió al sitio (${state.y} de ${state.max})`)
        assert.match(await frame.evaluate(() => document.getElementById('root').innerText), new RegExp(marker))
        // Pasado el recorrido, el sitio sigue: el iframe se va con el contenedor.
        await page.evaluate((y) => window.scrollTo(0, y), top + height + 50)
        await sleep(300)
        const after = await page.locator('iframe[data-scrolllab-frame]').evaluate((el) => el.getBoundingClientRect().bottom)
        assert.ok(after <= 0, `${sectionId}: el iframe no suelta al terminar (bottom ${after})`)
      } finally {
        await context.close()
        await unseed(id)
      }
    })
  }

  // --- PIN con la barra fija del sitio: se pega debajo, no tapada ---
  it('chapters/StackingCards — en un sitio con barra fija arriba, se pega debajo de la barra', async () => {
    const { id, key } = await seed('chapters/StackingCards', { chapterLabel: 'MKHEAD' })
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    const url = 'http://localhost:4178/__header-host.html'
    await page.route(url, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><body style="margin:0">
          <header style="position:fixed;top:0;left:0;right:0;height:64px;z-index:5;background:#111"></header>
          <div style="height:100vh"></div>
          <script src="http://localhost:4178/embed-dist/v1/loader.js" data-scrolllab data-key="${key}"
            data-frame="http://localhost:4179/embed-dist/v1" data-api="${API}" async></script>
          <div style="height:200vh"></div>
        </body></html>`,
      }),
    )
    try {
      await page.goto(url)
      const { frame } = await waitFrame(page)
      const wrap = page.locator('[data-scrolllab-pin]')
      await wrap.waitFor({ state: 'attached', timeout: 15_000 })
      await sleep(800)
      const { top, height } = await wrap.evaluate((el) => ({ top: el.getBoundingClientRect().top + scrollY, height: el.offsetHeight }))
      await page.evaluate((y) => window.scrollTo(0, y), top + (height - 900) / 2)
      let state = null
      for (let i = 0; i < 20; i++) {
        await sleep(150)
        state = await page.locator('iframe[data-scrolllab-frame]').evaluate((el) => {
          const r = el.getBoundingClientRect()
          return { top: Math.round(r.top), height: Math.round(r.height) }
        })
        const f = await frame.evaluate(() => ({ y: scrollY, max: document.documentElement.scrollHeight - innerHeight, ih: innerHeight }))
        state = { ...state, ...f }
        if (state.top === 64 && f.y > 0) break
      }
      assert.equal(state.top, 64, `el iframe no se pega debajo de la barra (top ${state.top})`)
      assert.equal(state.height, 900 - 64, `el iframe no mide la pantalla menos la barra (${state.height})`)
      assert.equal(state.ih, 900 - 64, 'el frame no ve su pantalla real')
      assert.ok(Math.abs(state.y - state.max / 2) < state.max * 0.12, `el frame no sigue al sitio (${state.y} de ${state.max})`)
    } finally {
      await context.close()
      await unseed(id)
    }
  })

  // --- formulario: el visitante manda y la API lo recibe (el mail va al dueño) ---
  it('contact/ContactForm — se manda desde el sitio ajeno y muestra el éxito', async () => {
    const props = { eyebrow: 'MKFORM', successMessage: 'MKSENT', errorMessage: 'MKFAIL' }
    const { id, key } = await seed('contact/ContactForm', props)
    const { context, page } = await openHost(key, { url: PLAIN_URL })
    const posts = []
    page.on('request', (req) => req.url().includes('/form') && req.method() === 'POST' && posts.push(req.postDataJSON()))
    try {
      const { frame } = await waitFrame(page)
      await frame.locator('input[autocomplete="name"]').fill('Ana Prueba')
      await frame.locator('input[type="email"]').fill('ana@example.com')
      await frame.locator('textarea').fill('Hola, quiero un sitio para mi marca.')
      await frame.locator('form button[type="submit"]').click()
      let text = ''
      for (let i = 0; i < 20 && !/MKSENT|MKFAIL/.test(text); i++) {
        await sleep(250)
        text = await frame.evaluate(() => document.getElementById('root').innerText)
      }
      assert.match(text, /MKSENT/, 'no aparece el mensaje de éxito')
      assert.equal(posts.length, 1, 'no salió un POST al formulario de LAB')
      assert.equal(posts[0].email, 'ana@example.com')
    } finally {
      await context.close()
      await unseed(id)
    }
  })

  // El newsletter del Footer de APEX: sin endpoint muestra el éxito en modo demo
  // sin mandar nada, así que lo que prueba que llega al dueño es el POST a LAB.
  it('apex/Footer — el newsletter manda a LAB desde el sitio ajeno', async () => {
    const props = { descriptor: 'MKAPEXF', successMessage: 'MKSUBS', errorMessage: 'MKFAIL' }
    const { id, key } = await seed('apex/Footer', props)
    const { context, page } = await openHost(key, { url: PLAIN_URL })
    const posts = []
    page.on('request', (req) => req.url().includes('/form') && req.method() === 'POST' && posts.push(req.postDataJSON()))
    try {
      const { frame } = await waitFrame(page)
      await frame.locator('form input[type="email"]').fill('ana@example.com')
      await frame.locator('form button[type="submit"]').click()
      let text = ''
      for (let i = 0; i < 20 && !/MKSUBS|MKFAIL/.test(text); i++) {
        await sleep(250)
        text = await frame.evaluate(() => document.getElementById('root').innerText)
      }
      assert.match(text, /MKSUBS/, 'no aparece el mensaje de éxito')
      assert.equal(posts.length, 1, 'no salió un POST al formulario de LAB (¿quedó en modo demo?)')
      assert.equal(posts[0].formType, 'newsletter')
      assert.equal(posts[0].email, 'ana@example.com')
    } finally {
      await context.close()
      await unseed(id)
    }
  })

  // --- pack: un `<script data-pack>` monta un iframe por widget, en orden ---
  it('pack — un solo script apila los widgets publicados en el orden del pack', async () => {
    const a = await seed('chapters/FooterCTA', CASES['chapters/FooterCTA'].props)
    const b = await seed('chapters/BigNumbers', CASES['chapters/BigNumbers'].props)
    const draft = await fetch(`${API}/api/hosted`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sectionId: 'atelier/KeyFacts' }),
    }).then((r) => r.json())
    // Los packs son de los planes pagos: alta con el mock de MP.
    const sub = await fetch(`${API}/api/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ plan: 'hosted_studio', cycle: 'monthly' }),
    }).then((r) => r.json())
    await fetch(`${API}${sub.activateUrl}`, { method: 'POST', headers })
    const created = await fetch(`${API}/api/hosted-packs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'e2e', items: [b.id, draft.instance.id, a.id] }),
    })
    assert.equal(created.status, 201, 'crear pack')
    const pack = (await created.json()).pack

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const url = 'http://localhost:4178/__pack-host.html'
    await page.route(url, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><body style="margin:0">
          <p id="before">antes</p>
          <script src="http://localhost:4178/embed-dist/v1/loader.js" data-scrolllab
            data-pack="${pack.key}" data-frame="http://localhost:4179/embed-dist/v1"
            data-api="${API}" async></script>
          <p id="after">después</p>
        </body></html>`,
      }),
    )
    try {
      await page.goto(url)
      const frames = page.locator('[data-scrolllab-pack] iframe[data-scrolllab-frame]')
      await frames.nth(1).waitFor({ state: 'attached', timeout: 15_000 })
      await sleep(800)
      assert.equal(await frames.count(), 2, 'el borrador no se monta')
      const order = await frames.evaluateAll((els) => els.map((el) => el.getAttribute('data-scrolllab-frame')))
      assert.deepEqual(order, [b.key, a.key], 'los iframes siguen el orden del pack')

      // El contenedor queda donde estaba el <script>: entre los dos párrafos.
      const between = await page.evaluate(() => {
        const box = document.querySelector('[data-scrolllab-pack]')
        return (
          document.getElementById('before').compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING &&
          box.compareDocumentPosition(document.getElementById('after')) & Node.DOCUMENT_POSITION_FOLLOWING
        )
      })
      assert.ok(between, 'el pack se monta en el lugar del <script>')

      // Cada frame pinta su widget (marcador de sus props).
      for (const [key, marker] of [
        [b.key, CASES['chapters/BigNumbers'].marker],
        [a.key, CASES['chapters/FooterCTA'].marker],
      ]) {
        let text = ''
        for (let i = 0; i < 30 && !text.includes(marker); i++) {
          const fr = page.frames().find((f) => f.url().includes(encodeURIComponent(key)))
          text = fr ? await fr.evaluate(() => document.getElementById('root')?.innerText || '').catch(() => '') : ''
          if (!text.includes(marker)) await sleep(400)
        }
        assert.match(text, new RegExp(marker), `el frame de ${key} no pintó su widget`)
      }
    } finally {
      await context.close()
      await fetch(`${API}/api/hosted-packs/${pack.id}`, { method: 'DELETE', headers }).catch(() => {})
      await unseed(a.id)
      await unseed(b.id)
      await unseed(draft.instance.id)
    }
  })

  // --- responsive: mobile / tablet / desktop sobre host plano ---
  for (const sectionId of RESPONSIVE_SECTIONS) {
    for (const vp of VIEWPORTS) {
      it(`${sectionId} — ${vp.name} ${vp.width}px: sin overflow y visible`, async () => {
        const c = CASES[sectionId]
        const { id, key } = await seed(sectionId, c.props)
        const { context, page } = await openHost(key, {
          url: PLAIN_URL,
          viewport: { width: vp.width, height: vp.height },
        })
        try {
          const { frame, text } = await waitFrame(page)
          const shown = c.ariaMarker
            ? await frame.evaluate((m) => !!document.querySelector(`[aria-label="${m}"]`), c.marker)
            : new RegExp(c.marker).test(text)
          assert.ok(shown, `${sectionId} @${vp.name}: no renderizó`)

          const m = await frame.evaluate(() => ({
            sw: document.documentElement.scrollWidth,
            cw: document.documentElement.clientWidth,
            rootH: document.getElementById('root').getBoundingClientRect().height,
          }))
          assert.ok(
            m.sw - m.cw <= 2,
            `${sectionId} @${vp.name}: overflow horizontal de ${m.sw - m.cw}px (cw=${m.cw})`,
          )
          assert.ok(m.cw <= vp.width + 1, `${sectionId} @${vp.name}: frame más ancho que el viewport`)
          assert.ok(m.rootH > 40, `${sectionId} @${vp.name}: #root muy bajo (${m.rootH}px)`)

          // PIN (pineada, o con escenario sticky más alto que la pantalla): el
          // iframe es una pantalla pegada y el contenedor reserva el recorrido
          // entero del frame, como si la sección estuviera en la página.
          // El frame decide su modo después de montar (fuentes, ScrollTrigger):
          // se espera a que pase una de las dos cosas, no un tiempo fijo.
          for (let i = 0; i < 30; i++) {
            const settled = await page.evaluate(
              () =>
                !!document.querySelector('[data-scrolllab-pin]') ||
                (document.querySelector('iframe[data-scrolllab-frame]')?.getBoundingClientRect().height || 0) > 50,
            )
            if (settled) break
            await sleep(200)
          }
          if (await page.evaluate(() => !!document.querySelector('[data-scrolllab-pin]'))) {
            let p = null
            for (let i = 0; i < 15; i++) {
              p = await page.evaluate(() => {
                const w = document.querySelector('[data-scrolllab-pin]')
                return { wrapH: w.offsetHeight, frameH: w.querySelector('iframe').offsetHeight, vh: innerHeight }
              })
              const docH = await frame.evaluate(() => document.documentElement.scrollHeight)
              p.docH = docH
              if (Math.abs(p.wrapH - docH) <= 4) break
              await sleep(300)
            }
            assert.ok(Math.abs(p.frameH - p.vh) <= 2, `${sectionId} @${vp.name}: en PIN el iframe no mide la pantalla (${p.frameH} vs ${p.vh})`)
            assert.ok(Math.abs(p.wrapH - p.docH) <= 4, `${sectionId} @${vp.name}: el recorrido (${p.wrapH}px) no es el del frame (${p.docH}px)`)
            return
          }

          // el puente de altura converge en un par de frames tras el reveal
          const iframeLoc = page.locator('iframe[data-scrolllab-frame]')
          let iframeH = 0
          for (let i = 0; i < 15; i++) {
            iframeH = await iframeLoc.evaluate((el) => el.getBoundingClientRect().height)
            if (iframeH >= m.rootH - 8) break
            await sleep(300)
          }
          assert.ok(iframeH > 50, `${sectionId} @${vp.name}: iframe casi sin alto (${iframeH}px)`)
          assert.ok(
            iframeH >= m.rootH * 0.85,
            `${sectionId} @${vp.name}: iframe (${iframeH}px) no sigue al contenido (${m.rootH}px)`,
          )
          // Y se queda quieto: una sección con `svh` no puede seguir creciendo
          // (el bug sumaba ~500px cada medio segundo; unos px son la transición
          // de alto del iframe o una fuente que termina de cargar).
          await sleep(900)
          const later = await iframeLoc.evaluate((el) => el.getBoundingClientRect().height)
          assert.ok(
            Math.abs(later - iframeH) <= 16,
            `${sectionId} @${vp.name}: el alto no converge (${iframeH}px → ${later}px)`,
          )
          // Ni más alto que el contenido: el iframe medía el documento (que nunca
          // baja de su propio viewport) y quedaba una franja vacía abajo.
          await sleep(600)
          const settled = await iframeLoc.evaluate((el) => el.getBoundingClientRect().height)
          // Contenido = la sección + la tira del sello del plan gratis (los usuarios del e2e son free).
          const rootH = await frame.evaluate(
            () =>
              document.getElementById('root').getBoundingClientRect().height +
              (document.querySelector('.sl-badge-row')?.getBoundingClientRect().height || 0),
          )
          assert.ok(
            settled - rootH <= 3,
            `${sectionId} @${vp.name}: iframe (${settled}px) más alto que el contenido (${rootH}px)`,
          )
        } finally {
          await context.close()
          await unseed(id)
        }
      })
    }
  }
})
