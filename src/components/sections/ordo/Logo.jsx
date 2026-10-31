import { useId } from 'react'
import { LOGO_FONT, C, SITE } from './brand'
import { LOGO_PARTS, LOGO_VIEWBOX as VB, LOGO_WORD_X } from './logoPaths'

/**
 * The ORDO logo as a vector: the wordmark in a geometric face and a rust slab resting on the R and the D,
 * like a lintel on two columns, seen in perspective. Each piece is a group with
 * `data-part="<id>"` with two layers: the fill and the outline (which by default is left undrawn),
 * so the loader traces the outline and only then fills. In the header only the
 * fill is seen. The size is set by the parent's `font-size` (1000 units = 1 em), so the loader logo
 * and the header logo are the same drawing at a different scale.
 */
// The subtitle is smaller than the logo (0.115 em): its margins are measured in its own em.
const SUB = 0.115

// The letters that rise from a line (the loader animates them): they sit inside a clip that hides them
// below the baseline.
const RISERS = new Set(['R', 'D', 'O2'])

/** The brand the vector logo draws: any other name is set as a plain wordmark (same loader gestures, no tracing). */
export const VECTOR_BRAND = 'ORDO'

/** A brand of the buyer's own: its letters in the same geometric face, with the rust slab above them. */
function TextLogo({ brand, tagline, compact, className, style, rest }) {
  const letters = [...String(brand)]
  return (
    <span
      role="img"
      aria-label={`${brand} — ${tagline}`}
      className={`inline-flex flex-col leading-none select-none ${className}`}
      style={{ ...LOGO_FONT, color: C.ink, ...style }}
      {...rest}
    >
      <span data-part="row" aria-hidden="true" className="relative inline-flex uppercase" style={{ paddingTop: '0.12em', lineHeight: 1 }}>
        {letters.map((ch, i) => (
          <span key={i} className="inline-block overflow-hidden" style={{ lineHeight: 1.08, whiteSpace: 'pre' }}>
            <span data-part={`L${i}`} className="inline-block" style={{ fontWeight: 500, letterSpacing: '0.06em' }}>
              {ch}
            </span>
          </span>
        ))}
        <span
          data-part="slab"
          className="absolute"
          style={{ left: '22%', width: '52%', top: 0, height: '0.11em', background: C.rust, clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)' }}
        />
      </span>
      {!compact && (
        <span
          data-part="sub"
          aria-hidden="true"
          className="block whitespace-nowrap"
          style={{ marginTop: '0.3em', fontSize: `${SUB}em`, fontWeight: 500, letterSpacing: '0.34em', color: C.mute }}
        >
          {tagline}
        </span>
      )}
    </span>
  )
}

export default function Logo({ brand = SITE.name, tagline = SITE.tagline, compact = false, hairline = false, className = '', style, ...rest }) {
  const clipId = `${useId().replace(/:/g, '')}-clip`
  if (brand !== VECTOR_BRAND) return <TextLogo brand={brand} tagline={tagline} compact={compact} className={className} style={style} rest={rest} />
  return (
    <span
      role="img"
      aria-label={`${brand} — ${tagline}`}
      className={`inline-flex flex-col leading-none select-none ${className}`}
      style={{ ...LOGO_FONT, color: C.ink, ...style }}
      {...rest}
    >
      <svg
        data-part="row"
        aria-hidden="true"
        viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
        style={{ display: 'block', width: `${VB.w / 1000}em`, height: `${VB.h / 1000}em`, overflow: 'visible' }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={VB.x} y={VB.y} width={VB.w} height={VB.h} />
          </clipPath>
        </defs>
        {LOGO_PARTS.map((part) => {
          const color = part.id === 'slab' ? C.rust : C.ink
          // The tracing stroke is rust (the slab's colour); the fill, ink.
          const body = (
            <g data-part={part.id}>
              <path data-fill d={part.fill} style={{ fill: color }} />
              {part.contours.map((d, i) => (
                <path
                  key={i}
                  data-stroke
                  d={d}
                  pathLength="1"
                  fill="none"
                  style={{ stroke: C.rust }}
                  // When small (the nav) the stroke is one screen px, at any scale.
                  strokeWidth={hairline ? 1.1 : 11}
                  vectorEffect={hairline ? 'non-scaling-stroke' : undefined}
                  strokeLinejoin="round"
                  // Undrawn: the dash is 1 (the normalised length) and starts offset by one full length.
                  strokeDasharray="1"
                  strokeDashoffset="1"
                />
              ))}
            </g>
          )
          return RISERS.has(part.id) ? (
            <g key={part.id} clipPath={`url(#${clipId})`}>
              {body}
            </g>
          ) : (
            <g key={part.id}>{body}</g>
          )
        })}
      </svg>
      {!compact && (
        <span
          data-part="sub"
          aria-hidden="true"
          className="block whitespace-nowrap"
          style={{
            marginTop: `${0.3 / SUB}em`,
            marginLeft: `${(LOGO_WORD_X - VB.x) / 1000 / SUB}em`,
            fontSize: `${SUB}em`,
            fontWeight: 500,
            letterSpacing: '0.34em',
            color: C.mute,
          }}
        >
          {tagline}
        </span>
      )}
    </span>
  )
}
