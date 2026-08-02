/**
 * Campos de texto editables por sección (builder preview).
 * Solo strings simples en v1; arrays complejos quedan fuera.
 */
export const SECTION_FIELDS = {
  'chapters/NavMinimal': [
    { key: 'brand', label: 'Brand', type: 'text' },
    {
      key: 'linksText',
      label: 'Links (uno por línea, "Texto | #ancla")',
      type: 'textarea',
    },
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
    {
      key: 'linksText',
      label: 'Links (uno por línea, "Texto | #ancla")',
      type: 'textarea',
    },
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
    {
      key: 'linksText',
      label: 'Links (uno por línea, "Texto | #ancla")',
      type: 'textarea',
    },
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
    { key: 'shopLabel', label: 'Dropdown 1 — label', type: 'text' },
    {
      key: 'shopItems',
      label: 'Dropdown 1 — ítems (uno por línea)',
      type: 'textarea',
    },
    { key: 'learnLabel', label: 'Dropdown 2 — label', type: 'text' },
    {
      key: 'learnItems',
      label: 'Dropdown 2 — ítems (uno por línea)',
      type: 'textarea',
    },
    { key: 'linkLabel', label: 'Link simple', type: 'text' },
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
    {
      key: 'linksText',
      label: 'Links (uno por línea, "Texto | #ancla")',
      type: 'textarea',
    },
  ],
  'velocity/HeroStrike': [
    { key: 'lineLeft', label: 'Line left', type: 'text' },
    { key: 'lineLeft2', label: 'Line left 2', type: 'text' },
    { key: 'lineRight', label: 'Line right', type: 'text' },
    { key: 'lineRight2', label: 'Line right 2', type: 'text' },
    { key: 'caption', label: 'Caption', type: 'text' },
    { key: 'imgBack', label: 'Layer back (URL)', type: 'text' },
    { key: 'imgMid', label: 'Layer mid (URL)', type: 'text' },
    { key: 'imgFront', label: 'Layer front (URL)', type: 'text' },
  ],
  'velocity/HelmetGrid': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
  ],
  'velocity/TrackMerge': [
    { key: 'pathLabelA', label: 'Path label A', type: 'text' },
    { key: 'pathLabelB', label: 'Path label B', type: 'text' },
    { key: 'mergeTitleA', label: 'Merge title A', type: 'text' },
    { key: 'mergeTitleB', label: 'Merge title B', type: 'text' },
    { key: 'mergeAccent', label: 'Merge accent', type: 'text' },
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
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'menuLabel', label: 'Menu label', type: 'text' },
    {
      key: 'linksText',
      label: 'Links (uno por línea, "Texto | #ancla")',
      type: 'textarea',
    },
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
  'atelier/WordStripe': [
    { key: 'line1', label: 'Line 1', type: 'text' },
    { key: 'line2', label: 'Line 2', type: 'text' },
    { key: 'word1', label: 'Word 1', type: 'text' },
    { key: 'word2', label: 'Word 2', type: 'text' },
    { key: 'word3', label: 'Word 3', type: 'text' },
  ],
  'atelier/StudioCards': [
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'cta', label: 'CTA', type: 'text' },
  ],
  'atelier/FooterAtelier': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'line', label: 'Headline', type: 'text' },
    { key: 'cta', label: 'CTA', type: 'text' },
    { key: 'brand', label: 'Brand mark', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
  ],
  'unity/NavUnity': [
    { key: 'brand', label: 'Brand / phrase', type: 'text' },
    { key: 'logo', label: 'Logo text', type: 'text' },
    { key: 'logoSrc', label: 'Logo image', type: 'image' },
    { key: 'linksText', label: 'Links (3)', type: 'textarea' },
    { key: 'menuLabel', label: 'Menu label', type: 'text' },
  ],
  'unity/HeroTwin': [
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'headline', label: 'Headline', type: 'textarea' },
  ],
  'unity/MosaicSlider': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'textarea' },
    { key: 'img1', label: 'Image 1', type: 'image' },
    { key: 'img2', label: 'Image 2', type: 'image' },
    { key: 'img3', label: 'Image 3', type: 'image' },
    { key: 'img4', label: 'Image 4', type: 'image' },
    { key: 'img5', label: 'Image 5', type: 'image' },
    { key: 'img6', label: 'Image 6', type: 'image' },
    { key: 'img7', label: 'Image 7', type: 'image' },
    { key: 'img8', label: 'Image 8', type: 'image' },
  ],
  'unity/UniversalLang': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'number', label: 'Number', type: 'text' },
    { key: 'numberLabel', label: 'Number label', type: 'text' },
  ],
  'unity/LanguageBlock': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'line1', label: 'Line 1', type: 'text' },
    { key: 'line2', label: 'Line 2', type: 'text' },
    { key: 'line3', label: 'Line 3', type: 'text' },
    { key: 'note', label: 'Note', type: 'text' },
    { key: 'bg', label: 'Background', type: 'text' },
    { key: 'fg', label: 'Foreground', type: 'text' },
    { key: 'img1', label: 'Image 1', type: 'image' },
    { key: 'img2', label: 'Image 2', type: 'image' },
    { key: 'img3', label: 'Image 3', type: 'image' },
    { key: 'anchor', label: 'Anchor id', type: 'text' },
  ],
  'unity/LastPortrait': [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'question', label: 'Question', type: 'text' },
    { key: 'caption', label: 'Caption', type: 'textarea' },
    { key: 'img', label: 'Portrait', type: 'image' },
    { key: 'stat1Label', label: 'Stat 1 label', type: 'text' },
    { key: 'stat1Value', label: 'Stat 1 value', type: 'text' },
    { key: 'stat2Label', label: 'Stat 2 label', type: 'text' },
    { key: 'stat2Value', label: 'Stat 2 value', type: 'text' },
    { key: 'stat3Label', label: 'Stat 3 label', type: 'text' },
    { key: 'stat3Value', label: 'Stat 3 value', type: 'text' },
  ],
  'unity/StageLines': [
    { key: 'eyebrow1', label: 'Eyebrow 1', type: 'text' },
    { key: 'line1', label: 'Line 1', type: 'text' },
    { key: 'img1', label: 'Image 1', type: 'image' },
    { key: 'eyebrow2', label: 'Eyebrow 2', type: 'text' },
    { key: 'line2', label: 'Line 2', type: 'text' },
    { key: 'img2', label: 'Image 2', type: 'image' },
  ],
  'unity/FooterTrophy': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'accentWord', label: 'Accent word', type: 'text' },
    { key: 'metaLeft', label: 'Meta left', type: 'text' },
    { key: 'metaRight', label: 'Meta right', type: 'text' },
    { key: 'orbSrc', label: 'Orb photo', type: 'image' },
  ],
  'contact/ContactForm': [
    {
      key: 'theme',
      label: 'Theme',
      type: 'select',
      options: [
        { value: 'auto', label: 'Auto (sección de al lado)' },
        { value: 'chapters', label: 'Chapters' },
        { value: 'nocturne', label: 'Nocturne' },
        { value: 'monolith', label: 'Monolith' },
        { value: 'velocity', label: 'Velocity' },
        { value: 'fizz', label: 'Fizz' },
        { value: 'atelier', label: 'Atelier' },
        { value: 'comic', label: 'Comic' },
        { value: 'unity', label: 'Unity' },
      ],
    },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'nameLabel', label: 'Name — label', type: 'text' },
    { key: 'emailLabel', label: 'Email — label', type: 'text' },
    { key: 'messageLabel', label: 'Message — label', type: 'text' },
    { key: 'submitLabel', label: 'Submit — label', type: 'text' },
    { key: 'sendingLabel', label: 'Sending — label', type: 'text' },
    { key: 'successMessage', label: 'Success message', type: 'textarea' },
    { key: 'errorMessage', label: 'Error message', type: 'textarea' },
    { key: 'note', label: 'Note', type: 'textarea' },
    {
      key: 'endpoint',
      label: 'Endpoint — https:// or /path (empty = demo)',
      type: 'text',
    },
  ],
  'commerce/ProductGrid': [
    {
      key: 'theme',
      label: 'Color',
      type: 'select',
      options: [
        { value: 'auto', label: 'Auto (sección de al lado)' },
        { value: 'chapters', label: 'Chapters · #ff4b00' },
        { value: 'nocturne', label: 'Nocturne · #d9ff3f' },
        { value: 'monolith', label: 'Monolith · #2b3cff' },
        { value: 'velocity', label: 'Velocity · #d9ff3f' },
        { value: 'fizz', label: 'Fizz · #ff3ea5' },
        { value: 'atelier', label: 'Atelier · #c8d0dc' },
        { value: 'comic', label: 'Comic · #e85a24' },
        { value: 'unity', label: 'Unity · #f4c518' },
      ],
    },
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
