/**
 * SCROLLLAB Beat — public motion API for sections and the builder ZIP.
 *
 * Widgets: <BeatStage> + <Beat mag recipe>. Engine: offset-path + seek.
 * Hook fallback: data-beat + useBeatStage. Docs: docs/scrolllab-beat.md
 */
export {
  MAG_W,
  MAG_SCROLL,
  magScale,
  attachScroll,
  playLoadPath,
  placeMag,
  nestInner,
  openPinOverflow,
} from './engine.js'

export { useBeatStage } from './useBeatStage.js'
export { BeatStage, Beat } from './widgets.jsx'
export { BEAT_PRESETS, RATIO_HERO_BEAT } from './presets.js'
export {
  glyphsOf,
  packLine,
  fitScale,
  enterDx,
  magFromPx,
} from './layout.js'
