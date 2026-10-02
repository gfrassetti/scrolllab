import { useLayoutEffect, useRef, useState } from 'react'
import Logo from './Logo'
import { useT } from '../i18n'
import { prefersReducedMotion } from '../lib/motion'

const SESSION_KEY = 'scrolllab-splash-seen'

/**
 * El splash se muestra una vez por pestaña: sin limpiar el flag, volver al home
 * (logout) no lo vuelve a mostrar. Única fuente de verdad de la key.
 */
export function resetBrandSplash() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Splash mínimo: solo el logo centrado, barras que se apilan, fade out.
 * Una vez por sesión de pestaña; respeta prefers-reduced-motion.
 */
export default function BrandSplash({ onDone }) {
  const root = useRef(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const t = useT()
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) !== '1'
    } catch {
      return true
    }
  })

  useLayoutEffect(() => {
    if (!visible) {
      onDoneRef.current?.()
      return undefined
    }

    const el = root.current
    if (!el) return undefined

    let done = false
    const finish = () => {
      if (done) return
      done = true
      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* ignore */
      }
      setVisible(false)
      onDoneRef.current?.()
    }

    const reduced = prefersReducedMotion()

    if (reduced) {
      const id = window.setTimeout(finish, 280)
      return () => window.clearTimeout(id)
    }

    // Red de seguridad: si el tab pierde foco/rAF se throttlea (o cualquier
    // otra causa detiene el timeline antes de onComplete), la página queda
    // con scroll bloqueado para siempre (ver overflow:hidden en TemplatesIndex
    // mientras !introReady). Nunca debe durar más que esto.
    const safetyId = window.setTimeout(finish, 2500)

    const bars = Array.from(el.querySelectorAll('[data-logo-bar]'))
    const accent = el.querySelector('[data-logo-accent]')
    const mark = el.querySelector('[data-splash-mark]')

    // Web Animations en vez de GSAP: gsap.set/to leen getComputedStyle y, con
    // todo el home ya montado debajo, eso fuerza el primer layout completo
    // dentro de este efecto (era lo más caro del arranque). animate() no lee
    // estilos, así que el layout queda para el render normal del navegador.
    const out = 'cubic-bezier(0.22, 1, 0.36, 1)'
    const anims = []
    const run = (node, keyframes, options) => {
      if (!node?.animate) return null
      const a = node.animate(keyframes, { fill: 'both', ...options })
      anims.push(a)
      return a
    }

    bars.forEach((bar, i) => {
      run(
        bar,
        [
          { transform: 'translateY(-18px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration: 380, delay: i * 70, easing: out },
      )
    })
    if (accent) {
      accent.style.transformBox = 'fill-box'
      accent.style.transformOrigin = 'center'
      run(
        accent,
        [
          { transform: 'scale(0)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        { duration: 300, delay: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      )
    }
    run(
      mark,
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.92)' },
      ],
      { duration: 300, delay: 700, easing: 'cubic-bezier(0.4, 0, 1, 1)' },
    )
    const overlay = run(el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 280,
      delay: 780,
      easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    })
    if (overlay) overlay.onfinish = finish
    else window.setTimeout(finish, 0)

    return () => {
      window.clearTimeout(safetyId)
      anims.forEach((a) => a.cancel())
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      ref={root}
      className="fixed inset-0 z-10000 flex items-center justify-center bg-[#0a0a0a]"
      role="status"
      aria-live="polite"
      aria-label={t('common.loading')}
    >
      <span
        data-splash-mark
        className="inline-block size-10 text-[#e8e5df] md:size-12"
      >
        <Logo className="size-full" />
      </span>
    </div>
  )
}
