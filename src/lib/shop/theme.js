/**
 * Paletas del kit commerce, alineadas a cada template.
 *
 * El builder mezcla modelos, así que el color no se puede inferir solo del
 * ProductGrid: el usuario elige (o deja `auto` y toma el vecino). Las rutas
 * del shop (PDP, drawer, checkout) leen las mismas CSS vars.
 */

export const SHOP_THEME_IDS = [
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
  'vanta',
]

/** Acento de cada modelo — mismo hex que `models[].accent` en el registry. */
export const TEMPLATE_ACCENTS = {
  chapters: '#ff4b00',
  nocturne: '#d9ff3f',
  monolith: '#2b3cff',
  velocity: '#d9ff3f',
  fizz: '#ff3ea5',
  atelier: '#c8d0dc',
  comic: '#e85a24',
  unity: '#f4c518',
  ratio: '#e23c24',
  vanta: '#5b4cff',
}

const THEMES = {
  auto: {
    '--shop-bg': 'var(--color-bone)',
    '--shop-fg': 'var(--color-ink)',
    '--shop-muted': 'color-mix(in oklab, var(--color-ink) 55%, transparent)',
    '--shop-border': 'color-mix(in oklab, var(--color-ink) 15%, transparent)',
    '--shop-accent': 'var(--color-accent)',
    '--shop-accent-fg': 'var(--color-bone)',
    '--shop-radius': '0px',
  },
  chapters: {
    '--shop-bg': '#f2efe9',
    '--shop-fg': '#1a1a1a',
    '--shop-muted': 'rgba(26, 26, 26, 0.55)',
    '--shop-border': 'rgba(26, 26, 26, 0.15)',
    '--shop-accent': TEMPLATE_ACCENTS.chapters,
    '--shop-accent-fg': '#f2efe9',
    '--shop-radius': '0px',
  },
  nocturne: {
    '--shop-bg': '#0e0e11',
    '--shop-fg': '#ece9e2',
    '--shop-muted': 'rgba(236, 233, 226, 0.55)',
    '--shop-border': 'rgba(236, 233, 226, 0.15)',
    '--shop-accent': TEMPLATE_ACCENTS.nocturne,
    '--shop-accent-fg': '#0e0e11',
    '--shop-radius': '0px',
  },
  monolith: {
    '--shop-bg': '#cdcbc4',
    '--shop-fg': '#101010',
    '--shop-muted': 'rgba(16, 16, 16, 0.55)',
    '--shop-border': 'rgba(16, 16, 16, 0.2)',
    '--shop-accent': TEMPLATE_ACCENTS.monolith,
    '--shop-accent-fg': '#ffffff',
    '--shop-radius': '0px',
  },
  velocity: {
    '--shop-bg': '#0a1a12',
    '--shop-fg': '#ece9e2',
    '--shop-muted': 'rgba(236, 233, 226, 0.55)',
    '--shop-border': 'rgba(236, 233, 226, 0.15)',
    '--shop-accent': TEMPLATE_ACCENTS.velocity,
    '--shop-accent-fg': '#0a1a12',
    '--shop-radius': '9999px',
  },
  fizz: {
    '--shop-bg': '#241352',
    '--shop-fg': '#fff3e2',
    '--shop-muted': 'rgba(255, 243, 226, 0.55)',
    '--shop-border': 'rgba(255, 243, 226, 0.2)',
    '--shop-accent': TEMPLATE_ACCENTS.fizz,
    '--shop-accent-fg': '#241352',
    '--shop-radius': '9999px',
  },
  atelier: {
    '--shop-bg': '#0b0c10',
    '--shop-fg': '#ffffff',
    '--shop-muted': 'rgba(255, 255, 255, 0.5)',
    '--shop-border': 'rgba(255, 255, 255, 0.15)',
    '--shop-accent': TEMPLATE_ACCENTS.atelier,
    '--shop-accent-fg': '#0b0c10',
    '--shop-radius': '0px',
  },
  comic: {
    '--shop-bg': '#d8d4cc',
    '--shop-fg': '#2a2622',
    '--shop-muted': 'rgba(42, 38, 34, 0.55)',
    '--shop-border': 'rgba(42, 38, 34, 0.15)',
    '--shop-accent': TEMPLATE_ACCENTS.comic,
    '--shop-accent-fg': '#ffffff',
    '--shop-radius': '6px',
  },
  unity: {
    '--shop-bg': '#f3efe6',
    '--shop-fg': '#0a0a0a',
    '--shop-muted': 'rgba(10, 10, 10, 0.55)',
    '--shop-border': 'rgba(10, 10, 10, 0.15)',
    '--shop-accent': TEMPLATE_ACCENTS.unity,
    '--shop-accent-fg': '#0a0a0a',
    '--shop-radius': '0px',
  },
  ratio: {
    '--shop-bg': '#ebe6dc',
    '--shop-fg': '#111111',
    '--shop-muted': 'rgba(17, 17, 17, 0.55)',
    '--shop-border': 'rgba(17, 17, 17, 0.18)',
    '--shop-accent': TEMPLATE_ACCENTS.ratio,
    '--shop-accent-fg': '#ebe6dc',
    '--shop-radius': '0px',
  },
  vanta: {
    '--shop-bg': '#0e0b14',
    '--shop-fg': '#f4f1ea',
    '--shop-muted': 'rgba(244, 241, 234, 0.55)',
    '--shop-border': 'rgba(244, 241, 234, 0.18)',
    '--shop-accent': TEMPLATE_ACCENTS.vanta,
    '--shop-accent-fg': '#f4f1ea',
    '--shop-radius': '9999px',
  },
}

export function shopThemeVars(theme) {
  return THEMES[theme] || THEMES.auto
}

export function isShopThemeId(value) {
  return SHOP_THEME_IDS.includes(value)
}

/**
 * Tema del commerce en una composición del builder / receta del ZIP.
 * Lee el ProductGrid y resuelve `auto` contra los vecinos.
 */
export function commerceThemeFromItems(items, resolveTheme) {
  const list = items || []
  const index = list.findIndex(
    (item) =>
      (item.sectionId || item.id) === 'commerce/ProductGrid',
  )
  if (index < 0) return 'auto'
  const entry = list[index]
  const sectionId = entry.sectionId || entry.id
  const modelIds = list.map((item) =>
    String(item.sectionId || item.id || '').split('/')[0],
  )
  return (
    resolveTheme(sectionId, entry.props, modelIds, index) || 'auto'
  )
}
