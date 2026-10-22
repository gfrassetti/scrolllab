import { LOGO_FONT, C, SITE } from './brand'

/**
 * El logo de elStudio en código (no es una imagen): «el» en itálica fina,
 * STUDIO en geométrica y la tapa óxido apoyada sobre la T, como la tapa de una
 * mesa vista en perspectiva. Cada pieza lleva `data-part` para que el loader
 * las arme una por una. El tamaño lo manda el `font-size` del padre.
 */
const LETTERS = ['S', 'T', 'U', 'D', 'I', 'O']

export default function Logo({ compact = false, className = '', style, ...rest }) {
  return (
    <span
      role="img"
      aria-label={`${SITE.name} — ${SITE.tagline}`}
      className={`inline-flex flex-col leading-none select-none ${className}`}
      style={{ ...LOGO_FONT, color: C.ink, ...style }}
      {...rest}
    >
      <span data-part="row" aria-hidden="true" className="inline-flex items-baseline">
        <span
          data-part="el"
          className="inline-block italic"
          style={{ fontWeight: 300, letterSpacing: '-0.02em', marginRight: '0.03em' }}
        >
          el
        </span>
        <span data-part="word" className="inline-flex" style={{ fontWeight: 500, letterSpacing: '-0.015em' }}>
          {LETTERS.map((ch) => (
            // La máscara deja asomar la letra desde abajo; el hueco extra evita que se corte el trazo.
            <span key={ch} className="relative inline-block overflow-hidden" style={{ padding: '0.04em 0.1em 0.06em 0.04em', margin: '-0.04em -0.1em -0.06em -0.04em' }}>
              <span data-part="ch" className="relative inline-block">
                {ch}
                {ch === 'T' && (
                  <span
                    data-part="slab"
                    className="absolute block"
                    style={{
                      left: '-0.04em',
                      right: '-0.1em',
                      top: '0.075em',
                      height: '0.085em',
                      background: C.rust,
                      clipPath: 'polygon(14% 0, 100% 0, 84% 100%, 0 100%)',
                    }}
                  />
                )}
              </span>
            </span>
          ))}
        </span>
      </span>
      {!compact && (
        <span
          data-part="sub"
          aria-hidden="true"
          className="block whitespace-nowrap"
          style={{
            marginTop: '0.34em',
            marginLeft: '1.05em',
            fontSize: '0.115em',
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
