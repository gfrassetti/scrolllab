import { useId, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import Logo from './Logo'
import { useT } from '../i18n'
import { useTheme } from '../lib/theme'

// Mismo par bg/mark en los dos sentidos — nada de negro fijo si el sitio
// está en claro. Los corchetes usan el mismo degradé que "LAB": no son un
// acento de marca acá, son parte del mismo tag.
const PALETTE = {
  dark: {
    bg: 'bg-[#0a0a0a]',
    logo: 'text-[#e8e5df]',
    stops: ['#a8a49b', '#605d56'],
  },
  light: {
    bg: 'bg-[#f2efe9]',
    logo: 'text-[#161412]',
    stops: ['#4a463e', '#161412'],
  },
}

/**
 * LabSplash — pantalla de carga breve al entrar a /lab. A diferencia de
 * BrandSplash (una vez por pestaña), esta corre en cada entrada a la
 * página: es la puerta de un producto puntual, no el arranque del sitio.
 *
 * Logo grande de fondo (mismo apilado de barras que HomeContact/BrandSplash)
 * y `<LAB>` al frente, como si la página misma fuera el tag que se pega.
 * Sigue el tema del sitio (light/dark) — no es un splash fijo a oscuro.
 */
export default function LabSplash({ onDone }) {
  const root = useRef(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const t = useT()
  const theme = useTheme((s) => s.theme)
  const skin = PALETTE[theme] || PALETTE.light
  const uid = useId().replace(/:/g, '')
  const gradientId = `lab-splash-grey-${uid}`
  const [visible, setVisible] = useState(true)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return undefined

    let done = false
    const finish = () => {
      if (done) return
      done = true
      setVisible(false)
      onDoneRef.current?.()
    }

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (reduced) {
      const id = window.setTimeout(finish, 280)
      return () => window.clearTimeout(id)
    }

    // Red de seguridad: si el timeline no completa (tab sin foco, rAF
    // throttleado), el overlay fixed inset-0 no debe quedar pegado.
    const safetyId = window.setTimeout(finish, 2500)

    const bars = gsap.utils.toArray('[data-logo-bar]', el)
    const accent = el.querySelector('[data-logo-accent]')
    const tag = el.querySelector('[data-splash-tag]')

    gsap.set(bars, { y: -18, opacity: 0, transformOrigin: '50% 50%' })
    if (accent) {
      gsap.set(accent, { scale: 0, opacity: 0, transformOrigin: '50% 50%' })
    }
    gsap.set(tag, { opacity: 0, y: 10 })

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: finish,
    })

    tl.to(bars, { y: 0, opacity: 1, duration: 0.45, stagger: 0.09 })
    if (accent) {
      tl.to(
        accent,
        { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.2)' },
        '-=0.2',
      )
    }
    tl.to(tag, { opacity: 1, y: 0, duration: 0.4 }, '-=0.15')
    tl.to({}, { duration: 0.4 }).to(
      el,
      { opacity: 0, duration: 0.4, ease: 'power2.inOut' },
    )

    return () => {
      window.clearTimeout(safetyId)
      tl.kill()
    }
  }, [])

  if (!visible) return null

  return (
    <div
      ref={root}
      className={`fixed inset-0 z-10000 flex items-center justify-center ${skin.bg}`}
      role="status"
      aria-live="polite"
      aria-label={t('common.loading')}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.14] ${skin.logo}`}
      >
        <Logo className="h-[min(60vw,22rem)] w-[min(60vw,22rem)]" />
      </span>
      {/* SVG, no texto HTML: el mark no puede depender de que la
          tipografía cargue a tiempo en una pantalla que dura ~1s. */}
      <svg
        data-splash-tag
        viewBox="0 0 400 110"
        role="img"
        aria-label="LAB"
        className="relative h-14 w-auto md:h-20"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skin.stops[0]} />
            <stop offset="100%" stopColor={skin.stops[1]} />
          </linearGradient>
        </defs>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="88"
          letterSpacing="-3"
          fill={`url(#${gradientId})`}
        >
          <tspan>&lt;</tspan>
          <tspan>LAB</tspan>
          <tspan>&gt;</tspan>
        </text>
      </svg>
    </div>
  )
}
