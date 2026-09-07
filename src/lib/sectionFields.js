/**
 * Campos editables por sección (builder preview + LAB).
 * Tipos: text · textarea · select · image · model · color · href · list.
 * `list` = array de items; `item` describe sus sub-campos (text/textarea/
 * href/color). El schema server-side espeja esto en server/sectionFields.js
 * (ALLOWED_PROPS_BY_SECTION + LIST_PROPS_BY_SECTION).
 * Recetas Beat (pasos dx/dy) aún no son un campo: el motion vive en JSX/presets.
 * Ver docs/scrolllab-beat.md.
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
    { key: 'ctaHref', label: 'CTA — enlace (si no, usa el email)', type: 'href' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'links',
      label: 'Enlaces',
      type: 'list',
      max: 8,
      item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'href', label: 'Enlace', type: 'href' },
      ],
    },
  ],
  'chapters/HorizontalPanels': [
    {
      key: 'variant',
      label: 'Variante',
      type: 'select',
      options: [
        { value: 'media', label: 'Media (imágenes)' },
        { value: 'type', label: 'Type (títulos grandes)' },
      ],
    },
    { key: 'chapter', label: 'Chapter', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'heading', label: 'Heading', type: 'text' },
  ],
  'chapters/VelocityMarquee': [
    { key: 'text', label: 'Texto', type: 'text' },
    { key: 'separator', label: 'Separador', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'chapters/BigNumbers': [
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'stats',
      label: 'Métricas',
      type: 'list',
      max: 6,
      item: [
        { key: 'value', label: 'Número', type: 'text' },
        { key: 'suffix', label: 'Sufijo (+, %, …)', type: 'text' },
        { key: 'label', label: 'Etiqueta', type: 'text' },
      ],
    },
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
  'nocturne/DiagonalMarquee': [
    { key: 'textA', label: 'Texto — cinta 1', type: 'text' },
    { key: 'textB', label: 'Texto — cinta 2', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
  ],
  'nocturne/SplitReveals': [
    { key: 'seq', label: 'Secuencia', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'beats',
      label: 'Escenas',
      type: 'list',
      max: 6,
      item: [
        { key: 'kicker', label: 'Kicker', type: 'text' },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'body', label: 'Texto', type: 'textarea' },
        { key: 'img', label: 'Imagen (URL)', type: 'image' },
      ],
    },
  ],
  'nocturne/WorkIndex': [
    { key: 'seq', label: 'Secuencia', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'works',
      label: 'Trabajos',
      type: 'list',
      max: 8,
      item: [
        { key: 'index', label: 'Índice', type: 'text' },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'category', label: 'Categoría', type: 'text' },
        { key: 'year', label: 'Año', type: 'text' },
        { key: 'img', label: 'Imagen (URL)', type: 'image' },
      ],
    },
  ],
  'nocturne/OutroCTA': [
    { key: 'ctaWord', label: 'CTA', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'ctaHref', label: 'CTA — enlace (si no, usa el email)', type: 'href' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'links',
      label: 'Enlaces',
      type: 'list',
      max: 8,
      item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'href', label: 'Enlace', type: 'href' },
      ],
    },
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
  'monolith/SkewScroller': [
    { key: 'unit', label: 'Unit', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'words',
      label: 'Palabras',
      type: 'list',
      max: 8,
      item: [{ key: 'word', label: 'Palabra', type: 'text' }],
    },
  ],
  'monolith/ExhibitGrid': [
    { key: 'unit', label: 'Unit', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'exhibits',
      label: 'Piezas',
      type: 'list',
      max: 8,
      item: [
        { key: 'code', label: 'Código', type: 'text' },
        { key: 'caption', label: 'Descripción', type: 'text' },
        { key: 'img', label: 'Imagen (URL)', type: 'image' },
      ],
    },
  ],
  'monolith/TypeAccordion': [
    { key: 'unit', label: 'Unit', type: 'text' },
    { key: 'total', label: 'Total', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'items',
      label: 'Filas',
      type: 'list',
      max: 6,
      item: [
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'body', label: 'Texto', type: 'textarea' },
      ],
    },
  ],
  'monolith/FooterBrutal': [
    { key: 'ctaWord', label: 'CTA', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'ctaHref', label: 'CTA — enlace (si no, usa el email)', type: 'href' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'links',
      label: 'Enlaces',
      type: 'list',
      max: 8,
      item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'href', label: 'Enlace', type: 'href' },
      ],
    },
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
      label: 'Flavor (can + backdrop)',
      type: 'select',
      options: [
        { value: 'berry', label: 'Berry (pink)' },
        { value: 'citrus', label: 'Citrus (orange)' },
        { value: 'tropical', label: 'Tropical (coral)' },
        { value: 'mint', label: 'Mint (green)' },
      ],
    },
    { key: 'canImage', label: 'Lata PNG (override)', type: 'image' },
    { key: 'canLabel', label: 'Texto lata (legacy)', type: 'text' },
    { key: 'modelUrl', label: 'Modelo 3D propio (.glb)', type: 'model' },
  ],
  'fizz/FlavorWorlds': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
  ],
  'fizz/BubbleBenefits': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'benefits',
      label: 'Beneficios',
      type: 'list',
      max: 6,
      item: [
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'body', label: 'Texto', type: 'textarea' },
        { key: 'color', label: 'Color del punto', type: 'color' },
      ],
    },
  ],
  'fizz/CanCarousel': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'cta', label: 'CTA', type: 'text' },
    { key: 'canLabel', label: 'Texto en latas (fallback SVG)', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'cans',
      label: 'Latas',
      type: 'list',
      max: 6,
      item: [
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'note', label: 'Nota', type: 'text' },
        { key: 'color', label: 'Color del sabor', type: 'color' },
        { key: 'image', label: 'Imagen (URL)', type: 'image' },
      ],
    },
  ],
  'fizz/PopManifesto': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'text', label: 'Text', type: 'textarea' },
  ],
  'fizz/FooterSplash': [
    { key: 'ctaWord', label: 'CTA', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'ctaHref', label: 'CTA — enlace (si no, usa el email)', type: 'href' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'links',
      label: 'Enlaces',
      type: 'list',
      max: 8,
      item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'href', label: 'Enlace', type: 'href' },
      ],
    },
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
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'items',
      label: 'Piezas',
      type: 'list',
      max: 6,
      item: [
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'year', label: 'Año / nº', type: 'text' },
        { key: 'img', label: 'Imagen (URL)', type: 'image' },
      ],
    },
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
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
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
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
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
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'facts',
      label: 'Datos',
      type: 'list',
      max: 6,
      item: [
        { key: 'value', label: 'Cifra', type: 'text' },
        { key: 'label', label: 'Etiqueta', type: 'text' },
      ],
    },
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
    { key: 'ctaHref', label: 'CTA — enlace', type: 'href' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'cards',
      label: 'Tarjetas',
      type: 'list',
      max: 6,
      item: [
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'label', label: 'Etiqueta', type: 'text' },
        { key: 'img', label: 'Imagen (URL)', type: 'image' },
      ],
    },
  ],
  'atelier/FooterAtelier': [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'line', label: 'Headline', type: 'text' },
    { key: 'cta', label: 'CTA', type: 'text' },
    { key: 'ctaHref', label: 'CTA — enlace', type: 'href' },
    { key: 'brand', label: 'Brand mark', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
    {
      key: 'social',
      label: 'Redes',
      type: 'list',
      max: 6,
      item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'href', label: 'Enlace', type: 'href' },
      ],
    },
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
  'ratio/NavRatio': [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'linksText', label: 'Links (uno por línea)', type: 'textarea' },
    { key: 'credit', label: 'Credit', type: 'text' },
    { key: 'menuLabel', label: 'Menu label', type: 'text' },
  ],
  'ratio/HeroTools': [
    { key: 'word1', label: 'Word 1 (4–5 letras)', type: 'text' },
    { key: 'word2', label: 'Word 2 (corta, una pieza)', type: 'text' },
    { key: 'word3', label: 'Word 3 (4 letras)', type: 'text' },
    { key: 'word4', label: 'Word 4 (4–6 letras, una pieza)', type: 'text' },
    { key: 'word5', label: 'Word 5 (8–12 letras)', type: 'text' },
    { key: 'note', label: 'Top note', type: 'textarea' },
    { key: 'aside', label: 'Aside', type: 'textarea' },
  ],
  'ratio/FourPlates': [
    { key: 'eyebrow', label: 'Title', type: 'text' },
    { key: 'plate1Title', label: 'Plate 1', type: 'text' },
    { key: 'plate2Title', label: 'Plate 2', type: 'text' },
    { key: 'plate3Title', label: 'Plate 3', type: 'text' },
    { key: 'plate4Title', label: 'Plate 4', type: 'text' },
    { key: 'nextImg', label: 'Next chapter image', type: 'image' },
  ],
  'ratio/SplitStudy': [
    { key: 'kicker', label: 'Kicker', type: 'text' },
    { key: 'meta', label: 'Meta', type: 'text' },
    { key: 'index', label: 'Index', type: 'text' },
    { key: 'specLabel', label: 'Spec 1 label', type: 'text' },
    { key: 'specValue', label: 'Spec 1 value', type: 'text' },
    { key: 'spec2Label', label: 'Spec 2 label', type: 'text' },
    { key: 'spec2Value', label: 'Spec 2 value', type: 'text' },
    { key: 'spec3Label', label: 'Spec 3 label', type: 'text' },
    { key: 'spec3Value', label: 'Spec 3 value', type: 'text' },
    { key: 'spec4Label', label: 'Spec 4 label', type: 'text' },
    { key: 'spec4Value', label: 'Spec 4 value', type: 'text' },
    { key: 'quote', label: 'Quote', type: 'textarea' },
    { key: 'quoteBy', label: 'Quote name', type: 'text' },
    { key: 'quoteRole', label: 'Quote role', type: 'text' },
    { key: 'panel2Label', label: 'Panel 2 label', type: 'text' },
    { key: 'panel2Size', label: 'Panel 2 size', type: 'text' },
    { key: 'img', label: 'Panel 1 image', type: 'image' },
    { key: 'img2', label: 'Panel 2 image', type: 'image' },
    { key: 'anchor', label: 'Anchor id', type: 'text' },
  ],
  'ratio/FitStack': [
    { key: 'noteLabel', label: 'Notes label', type: 'text' },
    { key: 'note1', label: 'Note 1', type: 'text' },
    { key: 'note1Mark', label: 'Note 1 underline', type: 'text' },
    { key: 'note2', label: 'Note 2', type: 'text' },
    { key: 'note2Mark', label: 'Note 2 underline', type: 'text' },
    { key: 'note3', label: 'Note 3', type: 'text' },
    { key: 'note3Mark', label: 'Note 3 underline', type: 'text' },
    { key: 'phrase', label: 'Headline', type: 'text' },
    { key: 'breakLine', label: 'Title two', type: 'text' },
    { key: 'rulesLine', label: 'Title three', type: 'text' },
    { key: 'worthLine', label: 'Title four', type: 'text' },
    { key: 'closer', label: 'Closer line', type: 'text' },
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'studio', label: 'Studio', type: 'text' },
    { key: 'anchor', label: 'Anchor id', type: 'text' },
  ],
  'ratio/PlateStudy': [
    { key: 'index', label: 'Index', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'variant', label: 'Plate variant', type: 'text' },
    { key: 'specLabel', label: 'Spec 1 label', type: 'text' },
    { key: 'specValue', label: 'Spec 1 value', type: 'text' },
    { key: 'spec2Label', label: 'Spec 2 label', type: 'text' },
    { key: 'spec2Value', label: 'Spec 2 value', type: 'text' },
    { key: 'spec3Label', label: 'Spec 3 label', type: 'text' },
    { key: 'spec3Value', label: 'Spec 3 value', type: 'text' },
    { key: 'spec4Label', label: 'Spec 4 label', type: 'text' },
    { key: 'spec4Value', label: 'Spec 4 value', type: 'text' },
    { key: 'caseTitle', label: 'Case title', type: 'text' },
    { key: 'caseMeta', label: 'Case meta', type: 'text' },
    { key: 'img', label: 'Case image', type: 'image' },
    { key: 'img2', label: 'Case image 2', type: 'image' },
    { key: 'step1Label', label: 'Step 1 label', type: 'text' },
    { key: 'step1Body', label: 'Step 1 body', type: 'text' },
    { key: 'step2Label', label: 'Step 2 label', type: 'text' },
    { key: 'step2Body', label: 'Step 2 body', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'anchor', label: 'Anchor id', type: 'text' },
  ],
  'ratio/BreakRules': [
    { key: 'line1', label: 'Line 1', type: 'text' },
    { key: 'line2', label: 'Line 2', type: 'text' },
    { key: 'line3', label: 'Line 3', type: 'text' },
    { key: 'aside', label: 'Aside', type: 'text' },
    { key: 'anchor', label: 'Anchor id', type: 'text' },
  ],
  'ratio/FooterLedger': [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'ghost', label: 'Brand word (outlined)', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'studio', label: 'Studio', type: 'text' },
    { key: 'row1Label', label: 'Row 1 label', type: 'text' },
    { key: 'row1Value', label: 'Row 1 value', type: 'text' },
    { key: 'row2Label', label: 'Row 2 label', type: 'text' },
    { key: 'row2Value', label: 'Row 2 value', type: 'text' },
    { key: 'row3Label', label: 'Row 3 label', type: 'text' },
    { key: 'row3Value', label: 'Row 3 value', type: 'text' },
    { key: 'row4Label', label: 'Row 4 label', type: 'text' },
    { key: 'row4Value', label: 'Row 4 value', type: 'text' },
    { key: 'spine1Title', label: 'Spine 1 title', type: 'text' },
    { key: 'spine2Title', label: 'Spine 2 title', type: 'text' },
    { key: 'spine3Title', label: 'Spine 3 title', type: 'text' },
    { key: 'spine4Title', label: 'Spine 4 title', type: 'text' },
    { key: 'spine5Title', label: 'Spine 5 title', type: 'text' },
  ],
  'atrium/NavAtrium': [
    { key: 'lineOne', label: 'Line 1', type: 'text' },
    { key: 'lineTwo', label: 'Line 2', type: 'text' },
    {
      key: 'linksText',
      label: 'Links (uno por línea, "Texto | #ancla")',
      type: 'textarea',
    },
    { key: 'menuLabel', label: 'Menu label', type: 'text' },
  ],
  'atrium/HeroMassing': [
    { key: 'lineOne', label: 'Line 1', type: 'text' },
    { key: 'lineTwo', label: 'Line 2', type: 'text' },
    { key: 'hint', label: 'Hint', type: 'text' },
  ],
  'atrium/ManifestoType': [
    { key: 'lineOne', label: 'Line 1', type: 'text' },
    { key: 'lineTwo', label: 'Line 2', type: 'text' },
    { key: 'left', label: 'Left column', type: 'textarea' },
    { key: 'right', label: 'Right column', type: 'textarea' },
  ],
  'atrium/ScopeSerif': [{ key: 'body', label: 'Body', type: 'textarea' }],
  'atrium/ClarityPair': [
    { key: 'kicker', label: 'Kicker', type: 'text' },
    { key: 'left', label: 'Left headline', type: 'text' },
    { key: 'right', label: 'Right headline', type: 'text' },
    { key: 'bodyLeft', label: 'Left body', type: 'textarea' },
    { key: 'bodyRight', label: 'Right body', type: 'textarea' },
  ],
  'atrium/BlueprintDraw': [
    { key: 'index', label: 'Index', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'caption', label: 'Caption', type: 'text' },
  ],
  'atrium/ProjectRail': [
    { key: 'kicker', label: 'Kicker', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
  ],
  'atrium/ProcessPin': [{ key: 'label', label: 'Label', type: 'text' }],
  'atrium/PeopleScatter': [
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'title', label: 'Title', type: 'textarea' },
  ],
  'atrium/OrbitRing': [],
  'atrium/StatField': [
    { key: 'kicker', label: 'Kicker', type: 'text' },
    { key: 'closer', label: 'Closing statement', type: 'textarea' },
  ],
  'atrium/FooterAtrium': [
    { key: 'mark', label: 'Mark', type: 'text' },
    { key: 'reserved', label: 'Reserved', type: 'text' },
    { key: 'license', label: 'License', type: 'text' },
    { key: 'design', label: 'Design credit', type: 'text' },
    { key: 'development', label: 'Development credit', type: 'text' },
    { key: 'legal', label: 'Legal', type: 'text' },
    { key: 'year', label: 'Year', type: 'text' },
    { key: 'bg', label: 'Color de fondo', type: 'color' },
    { key: 'fg', label: 'Color de texto', type: 'color' },
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
        { value: 'ratio', label: 'Ratio' },
        { value: 'atrium', label: 'Atrium' },
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
        { value: 'ratio', label: 'Ratio · #e23c24' },
        { value: 'atrium', label: 'Atrium · #111111' },
      ],
    },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    // El checkout es una ruta (/checkout), no una sección seleccionable:
    // sus textos se editan desde acá y viajan como props `checkout*`.
    { key: 'checkoutEyebrow', label: 'Checkout · Eyebrow', type: 'text' },
    { key: 'checkoutTitle', label: 'Checkout · Title', type: 'text' },
    { key: 'checkoutBody', label: 'Checkout · Body', type: 'textarea' },
    {
      key: 'checkoutStepsText',
      label: 'Checkout · Pasos (uno por línea)',
      type: 'textarea',
    },
    { key: 'checkoutContactTitle', label: 'Checkout · Contacto', type: 'text' },
    { key: 'checkoutShippingTitle', label: 'Checkout · Envío', type: 'text' },
    {
      key: 'checkoutCountryOptionsText',
      label: 'Checkout · Países (uno por línea)',
      type: 'textarea',
    },
    { key: 'checkoutDeliveryTitle', label: 'Checkout · Entrega', type: 'text' },
    { key: 'checkoutStandardLabel', label: 'Checkout · Envío estándar', type: 'text' },
    { key: 'checkoutStandardNote', label: 'Checkout · Estándar — nota', type: 'text' },
    { key: 'checkoutExpressLabel', label: 'Checkout · Envío express', type: 'text' },
    { key: 'checkoutExpressNote', label: 'Checkout · Express — nota', type: 'text' },
    { key: 'checkoutPaymentTitle', label: 'Checkout · Pago', type: 'text' },
    { key: 'checkoutPayCardLabel', label: 'Checkout · Pago tarjeta', type: 'text' },
    { key: 'checkoutPayWalletLabel', label: 'Checkout · Pago billetera', type: 'text' },
    {
      key: 'checkoutPayTransferLabel',
      label: 'Checkout · Pago transferencia',
      type: 'text',
    },
    { key: 'checkoutSummaryTitle', label: 'Checkout · Resumen', type: 'text' },
    { key: 'checkoutPromoLabel', label: 'Checkout · Cupón — label', type: 'text' },
    { key: 'checkoutPromoCode', label: 'Checkout · Cupón válido', type: 'text' },
    { key: 'checkoutPromoOff', label: 'Checkout · Cupón — % off', type: 'text' },
    { key: 'checkoutShippingFlat', label: 'Checkout · Costo envío', type: 'text' },
    { key: 'checkoutExpressPrice', label: 'Checkout · Costo express', type: 'text' },
    {
      key: 'checkoutFreeShippingOver',
      label: 'Checkout · Envío gratis desde (0 = nunca)',
      type: 'text',
    },
    { key: 'checkoutPayLabel', label: 'Checkout · Botón pagar', type: 'text' },
    {
      key: 'checkoutTrustText',
      label: 'Checkout · Garantías (una por línea)',
      type: 'textarea',
    },
    { key: 'checkoutSuccessTitle', label: 'Checkout · Éxito — título', type: 'text' },
    { key: 'checkoutSuccessBody', label: 'Checkout · Éxito — texto', type: 'textarea' },
  ],
}

export function getSectionFields(sectionId) {
  return SECTION_FIELDS[sectionId] || []
}

/** Local preview uploads (blob:) / inline data — never ship in the ZIP. */
export function isEphemeralAssetUrl(value) {
  return typeof value === 'string' && /^(blob:|data:)/i.test(value)
}

// #rgb / #rgba / #rrggbb / #rrggbbaa · rgb()/rgba(). Nada de nombres ni CSS
// arbitrario: el color entra crudo en un `style` inline de la sección.
const COLOR_RE =
  /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$|^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+))?\s*\)$/i
// #ancla · /ruta · http(s):// · mailto: · tel:. Sin `javascript:` ni otros esquemas.
const HREF_RE =
  /^(?:#[\w-]*|\/[^\s"'<>]*|https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:\+?[\d\s()-]{3,})$/i

export function sanitizeColor(value) {
  if (typeof value !== 'string') return undefined
  const s = value.trim().toLowerCase()
  return COLOR_RE.test(s) ? s : undefined
}

export function sanitizeHref(value) {
  if (typeof value !== 'string') return undefined
  const s = value.trim()
  if (!s || s.length > 500 || /^\s*javascript:/i.test(s)) return undefined
  return HREF_RE.test(s) ? s : undefined
}

// `image` en una lista = URL: https:// · /ruta · blob:/data: (preview). Misma
// regla que el campo `image` suelto.
export function sanitizeImageUrl(value) {
  if (typeof value !== 'string') return undefined
  const s = value.trim().slice(0, 500)
  if (!s) return undefined
  if (isEphemeralAssetUrl(s) || /^(https:\/\/|\/)\S/i.test(s)) return s
  return undefined
}

// Item de un campo `list`: objeto con sub-campos text/textarea/href/color/image.
// Se conservan los slots vacíos ({}) para que agregar una fila no la borre en
// el acto; el server descarta los items sin ninguna clase al persistir.
function sanitizeListItem(subFields, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const sub = new Map(subFields.map((f) => [f.key, f]))
  const item = {}
  for (const [k, v] of Object.entries(raw)) {
    const f = sub.get(k)
    if (!f || typeof v !== 'string') continue
    const t = v.slice(0, 500)
    if (f.type === 'color') {
      const c = sanitizeColor(t)
      if (c) item[k] = c
    } else if (f.type === 'href') {
      const h = sanitizeHref(t)
      if (h) item[k] = h
    } else if (f.type === 'image') {
      const u = sanitizeImageUrl(t)
      if (u) item[k] = u
    } else if (t) {
      item[k] = t
    }
  }
  return item
}

function sanitizeList(field, value) {
  if (!Array.isArray(value)) return undefined
  const subFields = field.item || []
  const max = field.max ?? 12
  const out = []
  for (const raw of value.slice(0, max)) {
    const item = sanitizeListItem(subFields, raw)
    if (item) out.push(item)
  }
  return out
}

export function sanitizeProps(sectionId, props) {
  if (!props || typeof props !== 'object') return undefined
  const fields = getSectionFields(sectionId)
  if (fields.length === 0) return undefined
  const byKey = new Map(fields.map((f) => [f.key, f]))
  const cleaned = {}
  for (const [key, value] of Object.entries(props)) {
    const field = byKey.get(key)
    if (!field) continue

    if (field.type === 'list') {
      const arr = sanitizeList(field, value)
      if (arr && arr.length) cleaned[key] = arr
      continue
    }
    if (typeof value !== 'string') continue
    const trimmed = value.slice(0, 2000)

    if (field.type === 'color') {
      const c = sanitizeColor(trimmed)
      if (c) cleaned[key] = c
      continue
    }
    if (field.type === 'href') {
      const h = sanitizeHref(trimmed)
      if (h) cleaned[key] = h
      continue
    }
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
