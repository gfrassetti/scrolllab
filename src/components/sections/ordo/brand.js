/**
 * elStudio — la marca en código: colores y tipografías.
 *
 * Papel, tinta y un solo color: el óxido de la «tapa de mesa» de su logo.
 * El logo va en una geométrica (Jost, la más cercana a la de su isotipo); los
 * titulares, el texto y los rótulos, en Poppins (libre, Google Fonts): una geométrica redonda y abierta, la más
 * cercana a Cera Pro. Si el cliente compra la licencia web de otra, se declara el @font-face y queda primera en ordo.css.
 */

export const C = {
  paper: '#f3f1ea', // la hoja
  ink: '#161513',
  mute: '#6d675c',
  hair: 'rgba(22, 21, 19, 0.18)',
  rust: '#c4441f', // la tapa de mesa del logo
}

export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Jost:wght@400;500;600&display=swap'

export const LOGO_FONT = { fontFamily: "'Jost', 'Futura', 'Century Gothic', sans-serif" }
// Poppins (Google Fonts, libre) para todo menos el logo (Jost). Si el cliente compra una licencia web
// de otra fuente, se declara un @font-face con el archivo y se pone primero en ordo.css (--od-font-body).
/** La letra de los rótulos técnicos: angosta, en mayúsculas, con números tabulares. */
export const LABEL = { fontFamily: 'var(--od-font-label)', fontWeight: 500 }
export const DISPLAY = { fontFamily: 'var(--od-font-body)' }

/** Alto del nav y de la franja de abajo del marco (px), en el teléfono y desde 640 px (ordo.css lo repite). */
export const NAV_H = { phone: 54, desk: 64 }
export const BAND_H = { phone: 56, desk: 64 }
/** Cuándo se abre el marco después del loader (s). */
export const OPEN_DELAY = 0.4
/** La apertura (líneas, regla, textos, columnas y boceto) corre a esta fracción del tiempo original. */
export const OPEN_T = 0.55

/**
 * El hero fijo dura HERO_VH pantallas de scroll (las cuatro etapas y la vuelta a boceto, en Boceto.jsx) y
 * las etapas cambian en estos avances del hero (0 → 1 en las primeras HERO_VH pantallas).
 */
export const HERO_VH = 3.8
export const STAGE_AT = [0, 0.06, 0.52, 0.84]

export const SITE = {
  name: 'ORDO',
  tagline: 'Architecture & Interiors',
  about: 'An architecture and interiors studio in Lisbon. We design every space whole, from the first line to the last joint.',
  places: ['Lisbon', 'Est. 2014', '68 projects built'],
  instagram: { handle: '@ordo.studio', href: 'https://www.instagram.com/' },
}
