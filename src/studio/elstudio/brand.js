/**
 * elStudio — la marca en código: colores y tipografías.
 *
 * Papel, tinta y un solo color: el óxido de la «tapa de mesa» de su logo.
 * El logo va en una geométrica (Jost, la más cercana a la de su isotipo); los
 * titulares y el texto, en Helvetica del sistema; los rótulos técnicos (nav, lámina, coordenadas),
 * en una grotesca angosta (Archivo Narrow) en mayúsculas. Si el dueño compra una tipografía, se
 * cambia acá y en elstudio.css.
 */

export const C = {
  paper: '#f3f1ea', // la hoja
  ink: '#161513',
  mute: '#6d675c',
  hair: 'rgba(22, 21, 19, 0.18)',
  rust: '#c4441f', // la tapa de mesa del logo
}

export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@400;500;600&family=Jost:ital,wght@0,400;0,500;0,600;1,200;1,300&display=swap'

export const LOGO_FONT = { fontFamily: "'Jost', 'Futura', 'Century Gothic', sans-serif" }
// Helvetica del sistema (la usan los estudios de referencia): en Mac e iOS es Helvetica de verdad,
// en Windows y Android cae a Arial, que es casi idéntica. Si el cliente compra la licencia web, se
// declara un @font-face con el archivo y se pone primero acá y en elstudio.css.
/** La letra de los rótulos técnicos: angosta, en mayúsculas, con números tabulares. */
export const LABEL = { fontFamily: "'Archivo Narrow', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif", fontWeight: 500 }
export const DISPLAY = { fontFamily: "'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif" }

/** Alto del nav y de la franja de abajo del marco (px), en el teléfono y desde 640 px (elstudio.css lo repite). */
export const NAV_H = { phone: 60, desk: 72 }
export const BAND_H = { phone: 56, desk: 64 }
/** Cuándo se abre el marco después del loader (s): el boceto ya va bastante pintado. */
export const OPEN_DELAY = 1.7

export const SITE = {
  name: 'elStudio',
  tagline: 'Diseño e Interiorismo',
  about: 'Estudio multidisciplinario de diseño e interiorismo, enfocado en la experiencia de usuario.',
  places: ['Patagonia Argentina', 'Buenos Aires', 'Worldwide'],
  instagram: { handle: '@elstudio.di', href: 'https://www.instagram.com/elstudio.di/' },
}
