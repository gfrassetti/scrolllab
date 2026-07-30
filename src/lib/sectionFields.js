/**
 * Campos de texto editables por sección (builder preview).
 * Solo strings simples en v1; arrays complejos quedan fuera.
 */
export const SECTION_FIELDS = {
  'chapters/NavMinimal': [
    { key: 'brand', label: 'Brand', type: 'text' },
  ],
  'chapters/HeroKinetic': [
    { key: 'lineOne', label: 'Linea 1', type: 'text' },
    { key: 'lineTwo', label: 'Linea 2', type: 'text' },
    { key: 'lineThree', label: 'Linea 3', type: 'text' },
    { key: 'kicker', label: 'Kicker', type: 'text' },
    { key: 'meta', label: 'Meta', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
  ],
  'chapters/ManifestoReveal': [
    { key: 'chapter', label: 'Chapter', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
  ],
  'chapters/QuoteBreak': [
    { key: 'chapter', label: 'Chapter', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'quote', label: 'Quote', type: 'textarea' },
    { key: 'attribution', label: 'Attribution', type: 'text' },
  ],
  'chapters/FooterCTA': [
    { key: 'ctaWord', label: 'CTA', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
  ],
  'nocturne/NavNocturne': [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'marker', label: 'Marker', type: 'text' },
  ],
  'nocturne/HeroCinematic': [
    { key: 'titleTop', label: 'Title top', type: 'text' },
    { key: 'titleBottom', label: 'Title bottom', type: 'text' },
    { key: 'kicker', label: 'Kicker', type: 'text' },
    { key: 'meta', label: 'Meta', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
  ],
  'nocturne/OutroCTA': [
    { key: 'ctaWord', label: 'CTA', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
  ],
  'monolith/NavBrutal': [
    { key: 'brand', label: 'Brand', type: 'text' },
  ],
  'monolith/HeroThree': [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
    { key: 'meta', label: 'Meta', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
    {
      key: 'shape',
      label: '3D shape',
      type: 'select',
      options: [
        { value: 'icosahedron', label: 'Icosahedron' },
        { value: 'box', label: 'Box' },
        { value: 'octahedron', label: 'Octahedron' },
        { value: 'torus', label: 'Torus' },
        { value: 'sphere', label: 'Sphere' },
      ],
    },
  ],
  'monolith/FooterBrutal': [
    { key: 'ctaWord', label: 'CTA', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
  ],
  'commerce/ProductGrid': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
  ],
}

export function getSectionFields(sectionId) {
  return SECTION_FIELDS[sectionId] || []
}

export function sanitizeProps(sectionId, props) {
  if (!props || typeof props !== 'object') return undefined
  const fields = getSectionFields(sectionId)
  if (fields.length === 0) return undefined
  const byKey = new Map(fields.map((f) => [f.key, f]))
  const cleaned = {}
  for (const [key, value] of Object.entries(props)) {
    const field = byKey.get(key)
    if (!field || typeof value !== 'string') continue
    const trimmed = value.slice(0, 2000)
    if (!trimmed) continue
    if (field.type === 'select') {
      const ok = (field.options || []).some((o) => o.value === trimmed)
      if (!ok) continue
    }
    cleaned[key] = trimmed
  }
  return Object.keys(cleaned).length ? cleaned : undefined
}
