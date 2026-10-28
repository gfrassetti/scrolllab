/**
 * Los tonos de la paleta de un modelo (`text-acid/60`, `bg-noir`,
 * `border-salt/10`…) son variables CSS (`--color-acid`…). Con esto una
 * sección apunta esas variables a sus campos de color: todo lo de adentro
 * sigue al color que eligió el comprador. Lo que no tiene valor queda como en
 * la paleta (la demo no cambia).
 *
 *   <section style={{ ...themeVars({ acid: accent, salt: fg }) }}>
 *
 * Viaja en el ZIP (SHARED en server/packaging.js) y en el embed de LAB.
 *
 * @param {Record<string, string | null | undefined>} map token de la paleta → color
 * @returns {Record<string, string>}
 */
export function themeVars(map) {
  /** @type {Record<string, string>} */
  const out = {}
  for (const [token, value] of Object.entries(map)) {
    if (value) out[`--color-${token}`] = value
  }
  return out
}

/**
 * Texto legible sobre un fondo elegido por el comprador: oscuro sobre fondos
 * claros, claro sobre oscuros. Entiende `#rgb`, `#rrggbb` y `rgb()/rgba()`; con
 * cualquier otro valor (o vacío) devuelve `undefined` y la sección conserva el
 * color de texto de siempre.
 * @param {string | null | undefined} bg
 * @param {{ light?: string, dark?: string }} [ink]
 * @returns {string | undefined}
 */
export function readableInk(bg, { light = '#f2efe9', dark = '#0a0a0a' } = {}) {
  const s = String(bg || '').trim().toLowerCase()
  let rgb = null
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s)
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  } else {
    const fn = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(s)
    if (fn) rgb = [fn[1], fn[2], fn[3]].map(Number)
  }
  if (!rgb) return undefined
  const lin = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
  return luminance > 0.4 ? dark : light
}

/**
 * `#rrggbb` mezclado con otro color: `t` 0 → a, 1 → b. Para los tonos
 * intermedios que antes eran hex fijos (un fondo que se aclara, una sombra
 * del mismo color). Si algún color no es hex, devuelve `a`.
 * @param {string} a
 * @param {string} b
 * @param {number} t
 */
export function mixHex(a, b, t) {
  const pa = /^#?([0-9a-f]{6})$/i.exec(String(a || '').trim())
  const pb = /^#?([0-9a-f]{6})$/i.exec(String(b || '').trim())
  if (!pa || !pb) return a
  const na = parseInt(pa[1], 16)
  const nb = parseInt(pb[1], 16)
  const ch = (shift) => {
    const x = (na >> shift) & 255
    const y = (nb >> shift) & 255
    return Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  }
  return `#${ch(16)}${ch(8)}${ch(0)}`
}
