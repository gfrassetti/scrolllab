import { LOGO_FONT, C, SITE } from './brand'
import { LOGO_PARTS, LOGO_VIEWBOX as VB, LOGO_WORD_X } from './logoPaths'

/**
 * El logo de elStudio en vector: «el» en itálica fina, STUDIO en geométrica y la tapa óxido
 * apoyada sobre la T, como la tapa de una mesa vista en perspectiva. Cada pieza es un grupo con
 * `data-part="<id>"` con dos capas: el relleno y el contorno (que por defecto queda sin dibujar),
 * para que el loader trace el contorno y recién después rellene. En el encabezado se ve solo el
 * relleno. El tamaño lo manda el `font-size` del padre (1000 unidades = 1 em), así el logo del
 * loader y el del encabezado son el mismo dibujo a otra escala.
 */
// El subtítulo es más chico que el logo (0.115 em): sus márgenes se miden en su propio em.
const SUB = 0.115

export default function Logo({ compact = false, className = '', style, ...rest }) {
  return (
    <span
      role="img"
      aria-label={`${SITE.name} — ${SITE.tagline}`}
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
        {LOGO_PARTS.map((part) => {
          const color = part.id === 'slab' ? C.rust : C.ink
          return (
            <g key={part.id} data-part={part.id}>
              <path data-fill d={part.fill} fill={color} />
              {part.contours.map((d, i) => (
                <path
                  key={i}
                  data-stroke
                  d={d}
                  pathLength="1"
                  fill="none"
                  stroke={color}
                  strokeWidth="11"
                  strokeLinejoin="round"
                  // Sin dibujar: la raya vale 1 (el largo normalizado) y arranca desplazada un largo entero.
                  strokeDasharray="1"
                  strokeDashoffset="1"
                />
              ))}
            </g>
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
          {SITE.tagline}
        </span>
      )}
    </span>
  )
}
