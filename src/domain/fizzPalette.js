/**
 * Paleta de FIZZ que sigue al hero.
 *
 * En una composición, las secciones de FIZZ llevan cada una su color (el
 * azul del hero, de la entrada de Flavor Worlds, de los beneficios y del
 * footer). Cambiar el sabor o el fondo del hero dejaba las demás en azul y la
 * página cortaba de un color a otro. Acá lo que el comprador dejó vacío toma
 * el color que resolvió el hero; lo que escribió en cada sección manda.
 *
 * Puro y sin dependencias a propósito: lo importan el preview (cliente) y el
 * empaquetador (servidor) y tienen que dar exactamente lo mismo, o el ZIP no
 * se parece a lo que se vio (igual que `sectionTheme`).
 *
 * La tabla repite `FIZZ_FLAVORS` de HeroBubbles.jsx (las secciones viajan en
 * el ZIP y no pueden importar de acá). `fizzPalette.test.js` verifica que
 * sigan iguales.
 */

/** @type {Readonly<Record<string, { bg: string, ink: string, liquid: string }>>} */
export const FIZZ_FLAVOR_COLORS = Object.freeze({
  cobalt: { bg: '#2c4bff', ink: '#fff3e2', liquid: '#9db8ff' },
  berry: { bg: '#ff3ea5', ink: '#241352', liquid: '#ffc9e8' },
  citrus: { bg: '#ffb02e', ink: '#241352', liquid: '#fff1cc' },
  tropical: { bg: '#ff6b35', ink: '#241352', liquid: '#ffdccb' },
  mint: { bg: '#3ddc97', ink: '#241352', liquid: '#dcfff0' },
})

const HERO = 'fizz/HeroBubbles'
const isEmpty = (value) => value == null || value === ''

/**
 * Qué campo de cada sección toma el fondo (`bg`) o la tinta (`ink`) del hero.
 * Quedan afuera las que tienen un color propio a propósito (el formulario en
 * violeta oscuro, las latas, el manifiesto).
 */
const FOLLOWS = Object.freeze({
  'fizz/FlavorWorlds': { startBg: 'bg', startInk: 'ink', startLiquid: 'liquid' },
  'fizz/BubbleBenefits': { bg: 'bg', fg: 'ink' },
  'fizz/FooterSplash': { bg: 'bg', fg: 'ink' },
  'fizz/NavFizz': { menuInk: 'bg' },
})

/**
 * Los colores con los que termina el hero de la composición, o null si no
 * hay hero o sigue siendo el cobalto de la demo (nada que propagar).
 * @param {{ sectionId: string, props?: Record<string, any> | null }[]} entries
 */
export function fizzHeroPalette(entries) {
  const hero = (entries || []).find((entry) => entry?.sectionId === HERO)
  if (!hero) return null
  const props = hero.props || {}
  const preset = FIZZ_FLAVOR_COLORS[props.flavor] || FIZZ_FLAVOR_COLORS.cobalt
  const bg = props.bg || preset.bg
  const ink = props.fg || preset.ink
  const liquid = props.accent || preset.liquid
  const demo = FIZZ_FLAVOR_COLORS.cobalt
  if (bg === demo.bg && ink === demo.ink && liquid === demo.liquid) return null
  return { bg, ink, liquid }
}

/**
 * Los props que una sección de FIZZ toma del hero: solo los que ella dejó
 * vacíos. `{}` si no corresponde.
 * @param {string} sectionId
 * @param {Record<string, any> | null | undefined} props los de la sección
 * @param {{ sectionId: string, props?: Record<string, any> | null }[]} entries toda la composición
 * @returns {Record<string, string>}
 */
export function linkedFizzProps(sectionId, props, entries) {
  const map = FOLLOWS[sectionId]
  if (!map) return {}
  const palette = fizzHeroPalette(entries)
  if (!palette) return {}
  /** @type {Record<string, string>} */
  const out = {}
  for (const [key, source] of Object.entries(map)) {
    if (isEmpty(props?.[key])) out[key] = palette[source]
  }
  return out
}
