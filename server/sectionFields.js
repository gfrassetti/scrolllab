/**
 * Allowlist server-side de props editables por sección.
 * Debe coincidir con src/lib/sectionFields.js.
 */
export const ALLOWED_PROPS_BY_SECTION = Object.freeze({
  'chapters/NavMinimal': ['brand', 'linksText'],
  // Hosteable: los `panels` (array) aún no son editables; sí los textos sueltos.
  'chapters/HorizontalPanels': [
    'variant',
    'chapter',
    'total',
    'label',
    'heading',
  ],
  'chapters/HeroKinetic': [
    'lineOne',
    'lineTwo',
    'lineThree',
    'kicker',
    'meta',
    'hint',
  ],
  'chapters/ManifestoReveal': ['chapter', 'total', 'label'],
  'chapters/BigNumbers': ['bg', 'fg', 'stats'],
  'chapters/VelocityMarquee': ['text', 'separator', 'bg', 'fg'],
  'chapters/QuoteBreak': [
    'chapter',
    'total',
    'label',
    'quote',
    'attribution',
  ],
  'chapters/FooterCTA': ['ctaWord', 'email', 'ctaHref', 'legal', 'bg', 'fg', 'links'],
  'nocturne/NavNocturne': ['brand', 'marker', 'linksText'],
  'nocturne/HeroCinematic': [
    'titleTop',
    'titleBottom',
    'kicker',
    'meta',
    'hint',
  ],
  'nocturne/DiagonalMarquee': ['textA', 'textB', 'bg', 'fg'],
  'nocturne/SplitReveals': ['seq', 'total', 'label', 'bg', 'fg', 'beats'],
  'nocturne/WorkIndex': ['seq', 'total', 'label', 'bg', 'fg', 'works'],
  'nocturne/OutroCTA': ['ctaWord', 'email', 'ctaHref', 'legal', 'bg', 'fg', 'links'],
  'monolith/NavBrutal': ['brand', 'linksText'],
  'monolith/HeroThree': ['title', 'subtitle', 'meta', 'hint', 'shape', 'modelUrl'],
  'monolith/TypeAccordion': ['unit', 'total', 'label', 'bg', 'fg', 'items'],
  'monolith/SkewScroller': ['unit', 'total', 'label', 'bg', 'fg', 'words'],
  'monolith/ExhibitGrid': ['unit', 'total', 'label', 'bg', 'fg', 'exhibits'],
  'monolith/FooterBrutal': ['ctaWord', 'email', 'ctaHref', 'legal', 'bg', 'fg', 'links'],
  'fizz/NavFizz': [
    'brand',
    'shopLabel',
    'shopItems',
    'learnLabel',
    'learnItems',
    'linkLabel',
    'cta',
  ],
  'fizz/HeroBubbles': [
    'title',
    'tagline',
    'meta',
    'hint',
    'flavor',
    'canImage',
    'canLabel',
    'modelUrl',
  ],
  'fizz/FlavorWorlds': ['eyebrow'],
  'fizz/BubbleBenefits': ['eyebrow', 'title', 'bg', 'fg', 'benefits'],
  'fizz/CanCarousel': [
    'eyebrow',
    'title',
    'cta',
    'canLabel',
    'can1Name',
    'can1Note',
    'can1Image',
    'can2Name',
    'can2Note',
    'can2Image',
    'can3Name',
    'can3Note',
    'can3Image',
    'can4Name',
    'can4Note',
    'can4Image',
    'can5Name',
    'can5Note',
    'can5Image',
  ],
  'fizz/PopManifesto': ['eyebrow', 'text'],
  'fizz/FooterSplash': ['ctaWord', 'email', 'ctaHref', 'legal', 'bg', 'fg', 'links'],
  'velocity/NavVelocity': ['brand', 'cta', 'linksText'],
  'velocity/HeroStrike': [
    'lineLeft',
    'lineLeft2',
    'lineRight',
    'lineRight2',
    'caption',
    'imgBack',
    'imgMid',
    'imgFront',
  ],
  'velocity/HelmetGrid': ['eyebrow', 'title', 'body'],
  'velocity/TrackMerge': [
    'pathLabelA',
    'pathLabelB',
    'mergeTitleA',
    'mergeTitleB',
    'mergeAccent',
  ],
  'velocity/ParallaxRise': ['eyebrow', 'title', 'body', 'cta'],
  'velocity/FooterVelocity': ['line', 'legal', 'bg', 'fg'],
  'atelier/NavAtelier': ['brand', 'cta', 'label', 'menuLabel', 'linksText'],
  'atelier/HeroMeaning': ['line1', 'line2', 'meta', 'hint'],
  'atelier/AboutClarity': ['eyebrow', 'title', 'body', 'bg', 'fg'],
  'atelier/ServicesStone': [
    'eyebrow',
    'title',
    'service1Title',
    'service1Body',
    'service2Title',
    'service2Body',
    'service3Title',
    'service3Body',
    'service4Title',
    'service4Body',
  ],
  'atelier/VisionShutter': ['line1', 'line2', 'word1', 'word2', 'word3'],
  'atelier/SelectedWork': ['title', 'cta'],
  'atelier/KeyFacts': ['eyebrow', 'title', 'bg', 'fg', 'facts'],
  'atelier/WordStripe': ['line1', 'line2', 'word1', 'word2', 'word3'],
  'atelier/StudioCards': ['note', 'cta'],
  'atelier/FooterAtelier': [
    'eyebrow',
    'line',
    'cta',
    'ctaHref',
    'brand',
    'legal',
    'email',
    'phone',
    'hint',
    'bg',
    'fg',
    'social',
  ],
  'unity/NavUnity': ['brand', 'logo', 'logoSrc', 'linksText', 'menuLabel'],
  'unity/HeroTwin': ['body', 'headline'],
  'unity/MosaicSlider': [
    'eyebrow',
    'title',
    'img1',
    'img2',
    'img3',
    'img4',
    'img5',
    'img6',
    'img7',
    'img8',
  ],
  'unity/UniversalLang': ['eyebrow', 'title', 'body', 'number', 'numberLabel'],
  'unity/LanguageBlock': [
    'eyebrow',
    'line1',
    'line2',
    'line3',
    'note',
    'bg',
    'fg',
    'img1',
    'img2',
    'img3',
    'anchor',
  ],
  'unity/LastPortrait': [
    'title',
    'name',
    'body',
    'question',
    'caption',
    'img',
    'stat1Label',
    'stat1Value',
    'stat2Label',
    'stat2Value',
    'stat3Label',
    'stat3Value',
  ],
  'unity/StageLines': [
    'eyebrow1',
    'line1',
    'img1',
    'eyebrow2',
    'line2',
    'img2',
  ],
  'unity/FooterTrophy': [
    'eyebrow',
    'title',
    'accentWord',
    'metaLeft',
    'metaRight',
    'orbSrc',
  ],
  'ratio/NavRatio': [
    'brand',
    'linksText',
    'credit',
    'menuLabel',
  ],
  'ratio/HeroTools': [
    'word1',
    'word2',
    'word3',
    'word4',
    'word5',
    'note',
    'aside',
  ],
  'ratio/FourPlates': [
    'eyebrow',
    'plate1Title',
    'plate2Title',
    'plate3Title',
    'plate4Title',
    'nextImg',
  ],
  'ratio/SplitStudy': [
    'kicker',
    'meta',
    'index',
    'specLabel',
    'specValue',
    'spec2Label',
    'spec2Value',
    'spec3Label',
    'spec3Value',
    'spec4Label',
    'spec4Value',
    'quote',
    'quoteBy',
    'quoteRole',
    'panel2Label',
    'panel2Size',
    'img',
    'img2',
    'anchor',
  ],
  'ratio/FitStack': [
    'noteLabel',
    'note1',
    'note1Mark',
    'note2',
    'note2Mark',
    'note3',
    'note3Mark',
    'phrase',
    'breakLine',
    'rulesLine',
    'worthLine',
    'closer',
    'brand',
    'studio',
    'anchor',
  ],
  'ratio/PlateStudy': [
    'index',
    'title',
    'variant',
    'specLabel',
    'specValue',
    'spec2Label',
    'spec2Value',
    'spec3Label',
    'spec3Value',
    'spec4Label',
    'spec4Value',
    'caseTitle',
    'caseMeta',
    'img',
    'img2',
    'step1Label',
    'step1Body',
    'step2Label',
    'step2Body',
    'notes',
    'anchor',
  ],
  'ratio/BreakRules': ['line1', 'line2', 'line3', 'aside', 'anchor'],
  'ratio/FooterLedger': [
    'title',
    'ghost',
    'hint',
    'brand',
    'studio',
    'row1Label',
    'row1Value',
    'row2Label',
    'row2Value',
    'row3Label',
    'row3Value',
    'row4Label',
    'row4Value',
    'spine1Title',
    'spine2Title',
    'spine3Title',
    'spine4Title',
    'spine5Title',
  ],
  'atrium/NavAtrium': ['lineOne', 'lineTwo', 'linksText', 'menuLabel'],
  'atrium/HeroMassing': ['lineOne', 'lineTwo', 'hint'],
  'atrium/ManifestoType': ['lineOne', 'lineTwo', 'left', 'right'],
  'atrium/ScopeSerif': ['body'],
  'atrium/ClarityPair': ['kicker', 'left', 'right', 'bodyLeft', 'bodyRight'],
  'atrium/BlueprintDraw': ['index', 'title', 'body', 'caption'],
  'atrium/ProjectRail': ['kicker', 'title'],
  'atrium/ProcessPin': ['label'],
  'atrium/PeopleScatter': ['label', 'title'],
  'atrium/OrbitRing': [],
  'atrium/StatField': ['kicker', 'closer'],
  'atrium/FooterAtrium': [
    'mark',
    'reserved',
    'license',
    'design',
    'development',
    'legal',
    'year',
    'bg',
    'fg',
  ],
  'contact/ContactForm': [
    'theme',
    'eyebrow',
    'title',
    'body',
    'nameLabel',
    'emailLabel',
    'messageLabel',
    'submitLabel',
    'sendingLabel',
    'successMessage',
    'errorMessage',
    'note',
    'endpoint',
  ],
  // Los `checkout*` no los usa la grilla: viajan a la ruta /checkout
  // (src/lib/shop/checkoutProps.js) y por eso se validan acá igual.
  'commerce/ProductGrid': [
    'theme',
    'eyebrow',
    'title',
    'body',
    'checkoutEyebrow',
    'checkoutTitle',
    'checkoutBody',
    'checkoutStepsText',
    'checkoutContactTitle',
    'checkoutShippingTitle',
    'checkoutCountryOptionsText',
    'checkoutDeliveryTitle',
    'checkoutStandardLabel',
    'checkoutStandardNote',
    'checkoutExpressLabel',
    'checkoutExpressNote',
    'checkoutPaymentTitle',
    'checkoutPayCardLabel',
    'checkoutPayWalletLabel',
    'checkoutPayTransferLabel',
    'checkoutSummaryTitle',
    'checkoutPromoLabel',
    'checkoutPromoCode',
    'checkoutPromoOff',
    'checkoutShippingFlat',
    'checkoutExpressPrice',
    'checkoutFreeShippingOver',
    'checkoutPayLabel',
    'checkoutTrustText',
    'checkoutSuccessTitle',
    'checkoutSuccessBody',
  ],
})

const SHAPE_PRESETS = new Set([
  'icosahedron',
  'box',
  'octahedron',
  'torus',
  'sphere',
])

const FLAVOR_PRESETS = new Set(['berry', 'citrus', 'tropical', 'mint'])
const VARIANT_PRESETS = new Set(['media', 'type'])

const THEME_PRESETS = new Set([
  'auto',
  'chapters',
  'nocturne',
  'monolith',
  'velocity',
  'fizz',
  'atelier',
  'comic',
  'unity',
  'ratio',
  'atrium',
])

/**
 * Asset URLs baked into the sold ZIP must be a real path/URL:
 * https:// or a site-relative path like /my-can.png.
 * blob:/data: (builder-preview uploads) never survive the session.
 */
const ASSET_URL_RE = /^(https:\/\/|\/)\S{1,500}$/i

const ASSET_URL_KEYS = new Set([
  'modelUrl',
  'can1Image',
  'can2Image',
  'can3Image',
  'can4Image',
  'can5Image',
  'img',
  'img1',
  'img2',
  'img3',
  'img4',
  'img5',
  'img6',
  'img7',
  'img8',
  'logoSrc',
  'orbSrc',
])

/**
 * Tipos que el server no infiere de `ALLOWED_PROPS_BY_SECTION` (que es un
 * array de nombres). Espejan los `type` de src/lib/sectionFields.js.
 *  - COLOR_PROP_KEYS / isHrefKey: por convención de nombre (`bg`/`fg`/`accent`,
 *    cualquier `*Href`, o `href`/`link`).
 *  - LIST_PROPS_BY_SECTION: schema de los campos `list` (prop → { max, item }).
 */
const COLOR_RE =
  /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$|^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+))?\s*\)$/i
const HREF_RE =
  /^(?:#[\w-]*|\/[^\s"'<>]*|https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:\+?[\d\s()-]{3,})$/i

const COLOR_PROP_KEYS = new Set(['bg', 'fg', 'accent', 'bg2', 'fg2'])
const HREF_PROP_KEYS = new Set(['href', 'link'])
const isHrefKey = (k) => HREF_PROP_KEYS.has(k) || /href$/i.test(k)

export const LIST_PROPS_BY_SECTION = Object.freeze({
  'chapters/FooterCTA': {
    links: { max: 8, item: { label: 'text', href: 'href' } },
  },
  'chapters/BigNumbers': {
    stats: { max: 6, item: { value: 'text', suffix: 'text', label: 'text' } },
  },
  'atelier/KeyFacts': {
    facts: { max: 6, item: { value: 'text', label: 'text' } },
  },
  'monolith/TypeAccordion': {
    items: { max: 6, item: { title: 'text', body: 'text' } },
  },
  'nocturne/OutroCTA': {
    links: { max: 8, item: { label: 'text', href: 'href' } },
  },
  'monolith/FooterBrutal': {
    links: { max: 8, item: { label: 'text', href: 'href' } },
  },
  'fizz/FooterSplash': {
    links: { max: 8, item: { label: 'text', href: 'href' } },
  },
  'atelier/FooterAtelier': {
    social: { max: 6, item: { label: 'text', href: 'href' } },
  },
  'nocturne/SplitReveals': {
    beats: { max: 6, item: { kicker: 'text', title: 'text', body: 'text' } },
  },
  'nocturne/WorkIndex': {
    works: { max: 8, item: { index: 'text', title: 'text', category: 'text', year: 'text' } },
  },
  'monolith/SkewScroller': {
    words: { max: 8, item: { word: 'text' } },
  },
  'monolith/ExhibitGrid': {
    exhibits: { max: 8, item: { code: 'text', caption: 'text' } },
  },
  'fizz/BubbleBenefits': {
    benefits: { max: 6, item: { title: 'text', body: 'text', color: 'color' } },
  },
})

function sanitizeColor(value) {
  const s = String(value).trim().toLowerCase()
  return COLOR_RE.test(s) ? s : undefined
}

function sanitizeHref(value) {
  const s = String(value).trim()
  if (!s || s.length > 500 || /^\s*javascript:/i.test(s)) return undefined
  return HREF_RE.test(s) ? s : undefined
}

function sanitizeListValue(schema, value) {
  if (!Array.isArray(value)) return undefined
  const max = schema.max ?? 12
  const out = []
  for (const raw of value) {
    if (out.length >= max) break
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const item = {}
    for (const [k, type] of Object.entries(schema.item || {})) {
      const v = raw[k]
      if (typeof v !== 'string') continue
      const t = v.slice(0, 500)
      if (type === 'color') {
        const c = sanitizeColor(t)
        if (c) item[k] = c
      } else if (type === 'href') {
        const h = sanitizeHref(t)
        if (h) item[k] = h
      } else if (t) {
        item[k] = t
      }
    }
    // El server descarta el item sin ninguna clase (slot vacío del editor).
    if (Object.keys(item).length) out.push(item)
  }
  return out
}

export function sanitizeSectionProps(sectionId, props) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return undefined
  const allowed = ALLOWED_PROPS_BY_SECTION[sectionId]
  if (!allowed) return undefined
  const allow = new Set(allowed)
  const listSchemas = LIST_PROPS_BY_SECTION[sectionId] || {}
  const cleaned = {}
  for (const [key, value] of Object.entries(props)) {
    if (!allow.has(key)) continue

    if (listSchemas[key]) {
      const arr = sanitizeListValue(listSchemas[key], value)
      if (arr && arr.length) cleaned[key] = arr
      continue
    }
    if (typeof value !== 'string') continue
    const trimmed = value.slice(0, 2000)

    if (COLOR_PROP_KEYS.has(key)) {
      const c = sanitizeColor(trimmed)
      if (c) cleaned[key] = c
      continue
    }
    if (isHrefKey(key)) {
      const h = sanitizeHref(trimmed)
      if (h) cleaned[key] = h
      continue
    }
    if (!trimmed) continue
    if (key === 'shape' && !SHAPE_PRESETS.has(trimmed)) continue
    if (key === 'flavor' && !FLAVOR_PRESETS.has(trimmed)) continue
    if (key === 'theme' && !THEME_PRESETS.has(trimmed)) continue
    if (key === 'variant' && !VARIANT_PRESETS.has(trimmed)) continue
    if (ASSET_URL_KEYS.has(key) && !ASSET_URL_RE.test(trimmed)) continue
    if (key === 'endpoint' && !ASSET_URL_RE.test(trimmed)) continue
    cleaned[key] = trimmed
  }
  return Object.keys(cleaned).length ? cleaned : undefined
}
