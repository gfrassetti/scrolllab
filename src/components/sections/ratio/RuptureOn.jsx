export const RUPTURE_FILL = '#5fd4ea'
export const RUPTURE_INK = '#ebe6dc'

function Eyes() {
  return (
    <>
      <ellipse cx="40" cy="64" rx="4.4" ry="11.5" fill={RUPTURE_INK} />
      <ellipse cx="60" cy="63" rx="4.4" ry="11.5" fill={RUPTURE_INK} />
    </>
  )
}

/** Doodle faces — solid fill + ink stroke. Variant cycles per cube. */
export function RuptureFace({ variant = 0, className = '', ...rest }) {
  const v = Math.abs(variant) % 4
  return (
    <svg
      viewBox="0 0 100 110"
      fill="none"
      aria-hidden="true"
      overflow="visible"
      className={className}
      {...rest}
    >
      {v === 0 ? (
        <>
          <path
            d="M28 38c-14-22 0-30 16-16 7 6 8 14 1 12 12-22 42-24 48 0 3 12-4 16-10 9"
            stroke={RUPTURE_INK}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17 54c2-18 18-28 37-26 21 2 35 16 33 36-2 22-18 38-38 36-21-2-34-18-32-46Z"
            fill={RUPTURE_FILL}
            stroke={RUPTURE_INK}
            strokeWidth="5.5"
            strokeLinejoin="round"
          />
          <Eyes />
        </>
      ) : null}
      {v === 1 ? (
        <>
          <path
            d="M18 62c-2-18 8-30 22-34-4-16 8-24 22-22 14-4 28 6 26 22 14 2 26 16 24 34-2 26-20 42-46 42s-46-16-48-42Z"
            fill={RUPTURE_FILL}
            stroke={RUPTURE_INK}
            strokeWidth="5.5"
            strokeLinejoin="round"
          />
          <Eyes />
        </>
      ) : null}
      {v === 2 ? (
        <>
          <path
            d="M14 30c3-10 16-16 32-14l34 4c12 2 20 12 18 26l-5 38c-2 14-16 20-30 18L22 98c-12-2-14-14-12-28Z"
            fill={RUPTURE_FILL}
            stroke={RUPTURE_INK}
            strokeWidth="5.5"
            strokeLinejoin="round"
          />
          <ellipse cx="40" cy="60" rx="4.4" ry="11.5" fill={RUPTURE_INK} />
          <ellipse cx="60" cy="59" rx="4.4" ry="11.5" fill={RUPTURE_INK} />
        </>
      ) : null}
      {v === 3 ? (
        <>
          <path
            d="M12 58c2-20 22-32 44-30 24 2 38 18 36 36-2 18-20 32-42 30-24-2-40-16-38-36Z"
            fill={RUPTURE_FILL}
            stroke={RUPTURE_INK}
            strokeWidth="5.5"
            strokeLinejoin="round"
          />
          <ellipse cx="40" cy="62" rx="4.4" ry="11.5" fill={RUPTURE_INK} />
          <ellipse cx="60" cy="61" rx="4.4" ry="11.5" fill={RUPTURE_INK} />
          <path
            d="M46 22c6-10 18-8 20 2"
            stroke={RUPTURE_INK}
            strokeWidth="5.5"
            strokeLinecap="round"
          />
        </>
      ) : null}
    </svg>
  )
}

/**
 * Crazy-mode figure. Sibling of the Off cube. `visibility: hidden` until On.
 * SVG so the FourPlates zoom stays sharp (bitmaps pixelate).
 */
export function RuptureOn({ index = 0, className = '' }) {
  return (
    <RuptureFace
      variant={index}
      data-rupture-on
      className={`pointer-events-none absolute inset-0 size-full overflow-visible ${className}`}
    />
  )
}

/** Rupture overlay — Mr Bedfort over the slab. Same string as the word. */
export function RuptureScript({ children, className = '' }) {
  return (
    <span data-rupture-script className={`ratio-script ${className}`} aria-hidden="true">
      {children}
    </span>
  )
}
