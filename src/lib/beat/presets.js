/**
 * Named recipes. A recipe is not CSS: it is “from rest, go to these points
 * while the page scrolls”. dx/dy are in mag pixels (canvas width 1024).
 *
 * Add presets here when a beat is reused across sections. Section-specific
 * choreography stays next to the JSX (see HeroTools).
 */
export const BEAT_PRESETS = {
  /** Letter starts above rest on load, then falls away on scroll (RATIO FORM). */
  'letter-hop-leave': {
    load: { dx: 0, dy: -72, from: -7, rot: 0, acc: 'ease-out', delay: 0.1, dur: 0.45 },
    scroll: [
      { delay_px: 10, dx: -40, dy: 300, rot: -7, from: 0, acc: 'ease-in', speed: 1 },
    ],
  },
  /** Word slides in from the right and exits left. */
  'slide-across': {
    scroll: [{ dx: -2000, dy: 0, speed: 1 }],
  },
  /** Cube: two hops with 90° tumble (RATIO). */
  'tumble-cube': {
    scroll: [
      { delay_px: 1174, dx: 70, dy: -241, rot: 90, from: 0, acc: 'ease-out', speed: 1 },
      { dx: 202, dy: -241, rot: 90, speed: 1 },
      { dx: 255, dy: 0, rot: 180, acc: 'ease-in', speed: 1 },
      { dx: 0, dy: 0, rot: 360, speed: 1 },
      { delay_px: 1730, dx: 50, dy: -241, rot: 270, acc: 'ease-out', speed: 1 },
      { dx: 332, dy: -241, rot: 270, speed: 1 },
      { dx: 502, dy: 0, rot: 360, acc: 'ease-in', speed: 1 },
      { dx: 0, dy: 0, rot: 360, speed: 1 },
    ],
  },
}

/**
 * RATIO HeroTools — reusable package for another template.
 * Riel: `tumble-cube` + letter hops. Slab grow is GSAP `width` on the fill
 * (not Beat dx; scaleX + rotate = diagonal slab). Cap 24px before the word.
 *
 * Rest windows: after tumble 1 (PLATE ~2.15) and after tumble 2 (word5).
 * Word 5 copies POWERFUL: 8+ glyphs, slide then tumble (dx2/dy2/rot).
 * Last slab grows when glyph 3 arrives, not at a fixed 5.0.
 * Ref: `src/components/sections/ratio/HeroTools.jsx`.
 */
export const RATIO_HERO_BEAT = {
  magScroll: 6901,
  cubeMag: { x: -385, y: 20, w: 197, h: 197, z: 200 },
  typeBox: { w: 797, h: 433 },
  cubeRecipe: 'tumble-cube',
  slabGap: 24,
  slab: {
    plate: { growAt: 2.15, growDur: 1.2, shrinkAt: 3.35, shrinkDur: 0.5 },
    scale: { growFromGlyph: 3, gutter: 0.08, holdViewports: 0.4 },
  },
}
