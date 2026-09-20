import { useEffect, useState } from 'react'

/**
 * Rota entre palabras fundiendo una en la otra (blur + fade) conservando el
 * centro visual. Hereda la tipografía del contenedor. Inspirado en
 * componentry.dev/docs/components/text-morph.
 *
 * El ancho se reserva con la palabra más larga (todas apiladas en una grilla)
 * para que el texto de alrededor no salte al cambiar.
 */
export default function TextMorph({
  words,
  interval = 2600,
  morphDuration = 680,
  align = 'center',
  className = '',
}) {
  const [index, setIndex] = useState(0)
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduced || words.length < 2) return undefined
    const id = setInterval(
      () => setIndex((i) => (i + 1) % words.length),
      interval + morphDuration,
    )
    return () => clearInterval(id)
  }, [words.length, interval, morphDuration, reduced])

  return (
    <span
      data-morph
      contentEditable={false}
      suppressContentEditableWarning
      className={`inline-grid ${align === 'start' ? 'justify-items-start' : 'justify-items-center'} ${className}`}
    >
      <span className="sr-only">{words[index]}</span>
      {words.map((w, i) => {
        const active = i === index
        return (
          <span
            key={w}
            aria-hidden="true"
            className="col-start-1 row-start-1"
            style={{
              opacity: active ? 1 : 0,
              filter: active ? 'blur(0px)' : 'blur(8px)',
              transform: active ? 'scale(1)' : 'scale(0.96)',
              transition: `opacity ${morphDuration}ms ease, filter ${morphDuration}ms ease, transform ${morphDuration}ms ease`,
            }}
          >
            {w}
          </span>
        )
      })}
    </span>
  )
}
