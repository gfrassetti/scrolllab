/**
 * ORDO — the brand in code: colours and typefaces.
 *
 * Paper, ink and a single colour: the rust of the "table slab" of its logo.
 * The logo is in a geometric face (Jost, the closest to that of its logomark); the
 * headlines, text and labels, in Poppins (free, Google Fonts): a round, open geometric, the closest to
 * Cera Pro. If the buyer licenses a web version of another one, its @font-face is declared and it goes first in ordo.css.
 */

export const C = {
  paper: 'var(--od-paper)', // the sheet
  ink: 'var(--od-ink)',
  mute: 'var(--od-mute)',
  hair: 'color-mix(in srgb, var(--od-ink) 18%, transparent)',
  rust: 'var(--od-rust)', // the logo's table slab
}

export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Jost:wght@400;500;600&display=swap'

export const LOGO_FONT = { fontFamily: "'Jost', 'Futura', 'Century Gothic', sans-serif" }
// Poppins (Google Fonts, free) for everything but the logo (Jost). If the buyer licenses a web version
// of another font, a @font-face is declared with the file and it goes first in ordo.css (--od-font-body).
/** The font of the technical labels: narrow, in capitals, with tabular figures. */
export const LABEL = { fontFamily: 'var(--od-font-label)', fontWeight: 500 }
export const DISPLAY = { fontFamily: 'var(--od-font-body)' }

/** Height of the nav and of the band under the frame (px), on the phone and from 640 px (ordo.css repeats it). */
export const NAV_H = { phone: 54, desk: 64 }
export const BAND_H = { phone: 56, desk: 64 }
/** When the frame opens after the loader (s). */
export const OPEN_DELAY = 0.4
/** The opening (lines, ruler, texts, columns and sketch) runs at this fraction of the original time. */
export const OPEN_T = 0.55

/**
 * The fixed hero lasts HERO_VH screens of scroll (the four stages and the return to a sketch, in Sketch.jsx) and
 * the stages change at these hero progress points (0 → 1 over the first HERO_VH screens).
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
