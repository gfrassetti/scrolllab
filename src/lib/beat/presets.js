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
      { dx: 302, dy: 0, rot: 180, acc: 'ease-in', speed: 1 },
      { dx: 0, dy: 0, rot: 360, speed: 1 },
      { delay_px: 1730, dx: 50, dy: -241, rot: 270, acc: 'ease-out', speed: 1 },
      { dx: 332, dy: -241, rot: 270, speed: 1 },
      { dx: 502, dy: 0, rot: 360, acc: 'ease-in', speed: 1 },
      { dx: 0, dy: 0, rot: 360, speed: 1 },
    ],
  },
}
