import { RuptureFace, RUPTURE_INK } from './RuptureOn'

/**
 * Crazy mode: celeste wash + flying doodles.
 * Cube On-figures are siblings of the Off tiles (`data-rupture-on`, hidden until On).
 * Script overlays live next to the grotesk glyphs, not here.
 */
export default function RuptureLayer() {
  return (
    <>
      <div data-rupture-wash aria-hidden="true" />
      <div data-rupture-extras aria-hidden="true">
        <div data-rupture-fly>
          <RuptureFace variant={0} />
        </div>
        <div data-rupture-fly data-rupture-fly-b>
          <RuptureFace variant={1} />
        </div>
        <div data-rupture-fly data-rupture-fly-c>
          <svg viewBox="0 0 220 72" fill="none" aria-hidden="true">
            <rect
              x="6"
              y="6"
              width="208"
              height="60"
              rx="30"
              fill="none"
              stroke={RUPTURE_INK}
              strokeWidth="5.5"
            />
          </svg>
        </div>
      </div>
    </>
  )
}
