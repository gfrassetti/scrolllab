/**
 * PLUM — the mark library.
 *
 * The little line-drawn marks that sit over the film (pear.no's sparkles,
 * crosses, corner brackets, rings…). A story.json overlay picks one by NAME:
 *
 *   { "mark": "sparkle", "x": "12%", "y": "24%", "w": "24px", "color": "#6f5bff", "at": [0, 0.5] }
 *
 * No raw SVG in the JSON — the builder shows this list as a dropdown and the
 * user only sets name + position + size + colour + scroll range. `svg()` below
 * turns a chosen name into markup, tinted with `color`. Raw `svg`/`src`
 * overlays still work as a dev / upload escape hatch.
 */

// Each entry is the INNER markup of a 0 0 24 24 viewBox, using `CURRENT` as a
// placeholder that gets replaced with the chosen stroke colour.
const PATHS = {
  plus: "<path d='M12 3v18M3 12h18' stroke='CURRENT' stroke-width='1' fill='none'/>",
  cross: "<path d='M5 5l14 14M19 5L5 19' stroke='CURRENT' stroke-width='1' fill='none'/>",
  sparkle:
    "<path d='M12 2c.6 4.2 3.8 7.4 8 8-4.2.6-7.4 3.8-8 8-.6-4.2-3.8-7.4-8-8 4.2-.6 7.4-3.8 8-8z' stroke='CURRENT' stroke-width='1' fill='none' stroke-linejoin='round'/>",
  ring: "<circle cx='12' cy='12' r='9' stroke='CURRENT' stroke-width='1' fill='none'/>",
  dot: "<circle cx='12' cy='12' r='3' fill='CURRENT'/>",
  diamond: "<path d='M12 2l10 10-10 10L2 12z' stroke='CURRENT' stroke-width='1' fill='none'/>",
  target:
    "<circle cx='12' cy='12' r='9' stroke='CURRENT' stroke-width='1' fill='none'/><path d='M12 1v22M1 12h22' stroke='CURRENT' stroke-width='1'/>",
  corner:
    "<path d='M3 9V3h6M21 15v6h-6' stroke='CURRENT' stroke-width='1' fill='none'/>",
  brackets:
    "<path d='M2 2h6M2 2v6M22 2h-6M22 2v6M2 22h6M2 22v-6M22 22h-6M22 22v-6' stroke='CURRENT' stroke-width='1' fill='none'/>",
  arrow:
    "<path d='M12 3v18M6 15l6 6 6-6' stroke='CURRENT' stroke-width='1' fill='none' stroke-linejoin='round'/>",
  chevron:
    "<path d='M6 9l6 6 6-6' stroke='CURRENT' stroke-width='1' fill='none' stroke-linejoin='round'/>",
  tick: "<path d='M4 12l5 5L20 6' stroke='CURRENT' stroke-width='1' fill='none' stroke-linejoin='round'/>",
  slash: "<path d='M17 4L7 20' stroke='CURRENT' stroke-width='1' fill='none'/>",
  // a halftone dot cloud (pear.no style) — dots clipped to a cloud silhouette
  cloud:
    "<defs><pattern id='PID' width='1.7' height='1.7' patternUnits='userSpaceOnUse'><circle cx='0.85' cy='0.85' r='0.42' fill='CURRENT'/></pattern><clipPath id='CID'><path d='M6 17a4 4 0 0 1-.4-7.98A5 5 0 0 1 15 7.2 3.8 3.8 0 0 1 20.5 11 3.5 3.5 0 0 1 20 17z'/></clipPath></defs><rect x='0' y='0' width='24' height='24' clip-path='url(#CID)' fill='url(#PID)'/>",
}

/** Names the builder offers in its mark dropdown. */
export const MARK_NAMES = Object.keys(PATHS)

let uid = 0

/** Build an <svg> string for a named mark, tinted with `color`. */
export function markSvg(name, color = '#f3f1ec') {
  const inner = PATHS[name]
  if (!inner) return ''
  // Scope any internal ids (pattern/clip) so multiple marks never collide.
  const u = `p${++uid}`
  const body = inner
    .replaceAll('CURRENT', color)
    .replaceAll('PID', `${u}a`)
    .replaceAll('CID', `${u}b`)
  return `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
}
