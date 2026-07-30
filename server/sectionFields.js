/**
 * Allowlist server-side de props editables por sección.
 * Debe coincidir con src/lib/sectionFields.js.
 */
export const ALLOWED_PROPS_BY_SECTION = Object.freeze({
  'chapters/NavMinimal': ['brand'],
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
  'nocturne/NavNocturne': ['brand', 'marker'],
  'nocturne/HeroCinematic': [
    'titleTop',
    'titleBottom',
    'kicker',
    'meta',
    'hint',
  ],
  'nocturne/OutroCTA': ['ctaWord', 'email', 'legal'],
  'monolith/NavBrutal': ['brand'],
  'monolith/HeroThree': ['title', 'subtitle', 'meta', 'hint', 'shape'],
  'monolith/FooterBrutal': ['ctaWord', 'email', 'legal'],
  'commerce/ProductGrid': ['eyebrow', 'title', 'body'],
})

const SHAPE_PRESETS = new Set([
  'icosahedron',
  'box',
  'octahedron',
  'torus',
  'sphere',
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
    cleaned[key] = trimmed
  }
  return Object.keys(cleaned).length ? cleaned : undefined
}
