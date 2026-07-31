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
    { key: 'modelUrl', label: 'Modelo 3D propio (.glb)', type: 'model' },
  ],
  'monolith/FooterBrutal': [
    { key: 'ctaWord', label: 'CTA', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
  ],
  'fizz/NavFizz': [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'cta', label: 'CTA', type: 'text' },
  ],
  'fizz/HeroBubbles': [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'tagline', label: 'Tagline', type: 'textarea' },
    { key: 'meta', label: 'Meta', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
    {
      key: 'flavor',
      label: 'Flavor (can color)',
      type: 'select',
      options: [
        { value: 'berry', label: 'Berry (pink)' },
        { value: 'citrus', label: 'Citrus (orange)' },
        { value: 'tropical', label: 'Tropical (coral)' },
        { value: 'mint', label: 'Mint (green)' },
      ],
    },
    { key: 'canLabel', label: 'Texto en la lata', type: 'text' },
    { key: 'modelUrl', label: 'Modelo 3D propio (.glb)', type: 'model' },
  ],
  'fizz/FlavorWorlds': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
  ],
  'fizz/BubbleBenefits': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
  ],
  'fizz/CanCarousel': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'cta', label: 'CTA', type: 'text' },
    { key: 'canLabel', label: 'Texto en las latas (SVG)', type: 'text' },
    { key: 'can1Name', label: 'Lata 1 — nombre', type: 'text' },
    { key: 'can1Note', label: 'Lata 1 — nota', type: 'text' },
    { key: 'can1Image', label: 'Lata 1 — imagen / SVG', type: 'image' },
    { key: 'can2Name', label: 'Lata 2 — nombre', type: 'text' },
    { key: 'can2Note', label: 'Lata 2 — nota', type: 'text' },
    { key: 'can2Image', label: 'Lata 2 — imagen / SVG', type: 'image' },
    { key: 'can3Name', label: 'Lata 3 — nombre', type: 'text' },
    { key: 'can3Note', label: 'Lata 3 — nota', type: 'text' },
    { key: 'can3Image', label: 'Lata 3 — imagen / SVG', type: 'image' },
    { key: 'can4Name', label: 'Lata 4 — nombre', type: 'text' },
    { key: 'can4Note', label: 'Lata 4 — nota', type: 'text' },
    { key: 'can4Image', label: 'Lata 4 — imagen / SVG', type: 'image' },
    { key: 'can5Name', label: 'Lata 5 — nombre', type: 'text' },
    { key: 'can5Note', label: 'Lata 5 — nota', type: 'text' },
    { key: 'can5Image', label: 'Lata 5 — imagen / SVG', type: 'image' },
  ],
  'fizz/PopManifesto': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'text', label: 'Text', type: 'textarea' },
  ],
  'fizz/FooterSplash': [
    { key: 'ctaWord', label: 'CTA', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
  ],
  'velocity/NavVelocity': [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'cta', label: 'CTA', type: 'text' },
  ],
  'velocity/HeroStrike': [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'lineLeft', label: 'Line left', type: 'text' },
    { key: 'lineRight', label: 'Line right', type: 'text' },
    { key: 'caption', label: 'Caption', type: 'text' },
  ],
  'velocity/HelmetGrid': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
  ],
  'velocity/ParallaxRise': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'cta', label: 'CTA', type: 'text' },
  ],
  'velocity/FooterVelocity': [
    { key: 'line', label: 'Line', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
  ],
  'atelier/NavAtelier': [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'cta', label: 'CTA', type: 'text' },
  ],
  'atelier/HeroMeaning': [
    { key: 'line1', label: 'Line 1', type: 'text' },
    { key: 'line2', label: 'Line 2', type: 'text' },
    { key: 'meta', label: 'Meta', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
  ],
  'atelier/AboutClarity': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'textarea' },
    { key: 'body', label: 'Body', type: 'textarea' },
  ],
  'atelier/ServicesStone': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'service1Title', label: 'Service 1 — title', type: 'text' },
    { key: 'service1Body', label: 'Service 1 — body', type: 'textarea' },
    { key: 'service2Title', label: 'Service 2 — title', type: 'text' },
    { key: 'service2Body', label: 'Service 2 — body', type: 'textarea' },
    { key: 'service3Title', label: 'Service 3 — title', type: 'text' },
    { key: 'service3Body', label: 'Service 3 — body', type: 'textarea' },
    { key: 'service4Title', label: 'Service 4 — title', type: 'text' },
    { key: 'service4Body', label: 'Service 4 — body', type: 'textarea' },
  ],
  'atelier/VisionShutter': [
    { key: 'line1', label: 'Line 1', type: 'text' },
    { key: 'line2', label: 'Line 2', type: 'text' },
    { key: 'word1', label: 'Word 1', type: 'text' },
    { key: 'word2', label: 'Word 2', type: 'text' },
    { key: 'word3', label: 'Word 3', type: 'text' },
  ],
  'atelier/SelectedWork': [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'cta', label: 'CTA', type: 'text' },
  ],
  'atelier/KeyFacts': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
  ],
  'atelier/FooterAtelier': [
    { key: 'line', label: 'Line', type: 'text' },
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

/** Local preview uploads (blob:) / inline data — never ship in the ZIP. */
export function isEphemeralAssetUrl(value) {
  return typeof value === 'string' && /^(blob:|data:)/i.test(value)
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
    // Preview: allow blob:/data:. Checkout strips them via compositionToRecipe.
    if (
      (field.type === 'model' || field.type === 'image') &&
      !isEphemeralAssetUrl(trimmed) &&
      !/^(https:\/\/|\/)\S/i.test(trimmed)
    ) {
      continue
    }
    cleaned[key] = trimmed
  }
  return Object.keys(cleaned).length ? cleaned : undefined
}
