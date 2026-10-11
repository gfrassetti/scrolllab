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
