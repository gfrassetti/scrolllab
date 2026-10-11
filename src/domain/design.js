/**
 * Diseño global de una composición del builder: hoy, una sola tipografía para
 * toda la página. Dominio puro (lo importan el front y el servidor).
 *
 * Dónde vive: **dentro de la receta**, como `font` de cada entrada
 * (`{ id, props?, font? }`). Así el carrito, el checkout, la orden, los
 * proyectos guardados y el ZIP lo reciben sin cambiar de forma: es lo mismo que
 * ya viajaba. Todas las entradas llevan el mismo valor; la fuente de la
 * composición es la de la primera que la trae (`fontFromRecipe`). Sin `font`,
 * cada sección conserva la suya.
 *
 * La lista es corta a propósito y sale de las familias que el market y el ZIP
 * ya cargan: elegir una no suma peso ni una petición nueva (salvo Geist y
 * Fraunces, que el ZIP agrega a su <link>, ver `fontLinkParam`).
 */

/**
 * @typedef {Object} FontChoice
 * @property {string} id         clave estable (viaja en la receta)
 * @property {string} label      nombre de la familia (no se traduce)
 * @property {'sans' | 'serif' | 'mono'} kind
 * @property {string} stack      valor de `font-family`
 * @property {string} google     parámetro `family=` de Google Fonts
 */

/** @type {readonly FontChoice[]} */
export const FONT_CHOICES = Object.freeze([
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    kind: 'sans',
    stack: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    google: 'Space+Grotesk:wght@300..700',
  },
  {
    id: 'inter-tight',
    label: 'Inter Tight',
    kind: 'sans',
    stack: "'Inter Tight', ui-sans-serif, system-ui, sans-serif",
    google: 'Inter+Tight:wght@400;500;600',
  },
  {
    id: 'geist',
    label: 'Geist',
    kind: 'sans',
    stack: "'Geist', ui-sans-serif, system-ui, sans-serif",
    google: 'Geist:wght@100..900',
  },
  {
    id: 'archivo',
    label: 'Archivo',
    kind: 'sans',
    stack: "'Archivo', ui-sans-serif, system-ui, sans-serif",
    google: 'Archivo:wdth,wght@62..125,400..800',
  },
  {
    id: 'bricolage',
    label: 'Bricolage Grotesque',
    kind: 'sans',
    stack: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
    google: 'Bricolage+Grotesque:opsz,wght@12..96,200..800',
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    kind: 'serif',
    stack: "'Playfair Display', Georgia, 'Times New Roman', serif",
    google: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600',
  },
  {
    id: 'fraunces',
    label: 'Fraunces',
    kind: 'serif',
    stack: "'Fraunces', Georgia, 'Times New Roman', serif",
    google: 'Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700',
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    kind: 'mono',
    stack: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    google: 'JetBrains+Mono:wght@400;500;700',
  },
])

const BY_ID = new Map(FONT_CHOICES.map((f) => [f.id, f]))

/**
 * @param {unknown} id
 * @returns {FontChoice | null}
 */
export function fontChoiceById(id) {
  return typeof id === 'string' ? BY_ID.get(id) || null : null
}

/**
 * El id si es una fuente de la lista; si no, null (nada de nombres libres: el
 * valor termina en un `font-family` y en un <link> del ZIP).
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeFontId(raw) {
  return fontChoiceById(raw) ? /** @type {string} */ (raw) : null
}

/**
 * La fuente global de una receta: la primera entrada que trae una válida.
 * @param {Array<string | { font?: unknown } | null | undefined> | null | undefined} recipe
 * @returns {string | null}
 */
export function fontFromRecipe(recipe) {
  for (const entry of Array.isArray(recipe) ? recipe : []) {
    if (entry && typeof entry === 'object') {
      const id = normalizeFontId(entry.font)
      if (id) return id
    }
  }
  return null
}

/**
 * Parámetro `family=…` que el ZIP tiene que sumar a su <link> de Google Fonts,
 * o '' si la familia ya viene en el que trae (`baseLink`).
 * @param {string | null | undefined} fontId
 * @param {string} baseLink el href de fuentes que el ZIP ya incluye
 * @returns {string}
 */
export function fontLinkParam(fontId, baseLink) {
  const font = fontChoiceById(fontId)
  if (!font) return ''
  const family = font.google.split(':')[0]
  return baseLink.includes(`family=${family}`) ? '' : `&family=${font.google}`
}
