/**
 * Allowlist server-side de props editables por sección.
 * Debe coincidir con src/lib/sectionFields.js.
 */
export const ALLOWED_PROPS_BY_SECTION = Object.freeze({
  'chapters/NavMinimal': ['brand', 'linksText'],
  'chapters/HeroKinetic': [
    'lineOne',
    'lineTwo',
    'lineThree',
    'kicker',
    'meta',
    'hint',
  ],
  'chapters/ManifestoReveal': ['chapter', 'total', 'label'],
  'chapters/QuoteBreak': [
    'chapter',
    'total',
    'label',
    'quote',
    'attribution',
  ],
  'chapters/FooterCTA': ['ctaWord', 'email', 'legal'],
  'nocturne/NavNocturne': ['brand', 'marker', 'linksText'],
  'nocturne/HeroCinematic': [
    'titleTop',
    'titleBottom',
    'kicker',
    'meta',
    'hint',
  ],
  'nocturne/OutroCTA': ['ctaWord', 'email', 'legal'],
  'monolith/NavBrutal': ['brand', 'linksText'],
  'monolith/HeroThree': ['title', 'subtitle', 'meta', 'hint', 'shape', 'modelUrl'],
  'monolith/FooterBrutal': ['ctaWord', 'email', 'legal'],
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
    'canLabel',
    'modelUrl',
  ],
  'fizz/FlavorWorlds': ['eyebrow'],
  'fizz/BubbleBenefits': ['eyebrow', 'title'],
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
  'fizz/FooterSplash': ['ctaWord', 'email', 'legal'],
  'velocity/NavVelocity': ['brand', 'cta', 'linksText'],
  'velocity/HeroStrike': ['lineLeft', 'lineRight', 'caption'],
  'velocity/HelmetGrid': ['eyebrow', 'title', 'body'],
  'velocity/ParallaxRise': ['eyebrow', 'title', 'body', 'cta'],
  'velocity/FooterVelocity': ['line', 'legal'],
  'atelier/NavAtelier': ['brand', 'cta', 'label', 'linksText'],
  'atelier/HeroMeaning': ['line1', 'line2', 'meta', 'hint'],
  'atelier/AboutClarity': ['eyebrow', 'title', 'body'],
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
  'atelier/KeyFacts': ['eyebrow', 'title'],
  'atelier/FooterAtelier': ['line', 'legal'],
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
  'commerce/ProductGrid': ['eyebrow', 'title', 'body'],
})

const SHAPE_PRESETS = new Set([
  'icosahedron',
  'box',
  'octahedron',
  'torus',
  'sphere',
])

const FLAVOR_PRESETS = new Set(['berry', 'citrus', 'tropical', 'mint'])

const THEME_PRESETS = new Set([
  'auto',
  'chapters',
  'nocturne',
  'monolith',
  'velocity',
  'fizz',
  'atelier',
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
])

export function sanitizeSectionProps(sectionId, props) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return undefined
  const allowed = ALLOWED_PROPS_BY_SECTION[sectionId]
  if (!allowed) return undefined
  const allow = new Set(allowed)
  const cleaned = {}
  for (const [key, value] of Object.entries(props)) {
    if (!allow.has(key)) continue
    if (typeof value !== 'string') continue
    const trimmed = value.slice(0, 2000)
    if (!trimmed) continue
    if (key === 'shape' && !SHAPE_PRESETS.has(trimmed)) continue
    if (key === 'flavor' && !FLAVOR_PRESETS.has(trimmed)) continue
    if (key === 'theme' && !THEME_PRESETS.has(trimmed)) continue
    if (ASSET_URL_KEYS.has(key) && !ASSET_URL_RE.test(trimmed)) continue
    if (key === 'endpoint' && !ASSET_URL_RE.test(trimmed)) continue
    cleaned[key] = trimmed
  }
  return Object.keys(cleaned).length ? cleaned : undefined
}
