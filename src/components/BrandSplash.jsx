import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import Logo from './Logo'
import { useT } from '../i18n'

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

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (reduced) {
      const id = window.setTimeout(finish, 280)
      return () => window.clearTimeout(id)
    }

    // Red de seguridad: si el tab pierde foco/rAF se throttlea (o cualquier
    // otra causa detiene el timeline antes de onComplete), la página queda
    // con scroll bloqueado para siempre (ver overflow:hidden en TemplatesIndex
    // mientras !introReady). Nunca debe durar más que esto.
    const safetyId = window.setTimeout(finish, 2500)

    const bars = gsap.utils.toArray('[data-logo-bar]', el)
    const accent = el.querySelector('[data-logo-accent]')
    const mark = el.querySelector('[data-splash-mark]')

    gsap.set(bars, { y: -18, opacity: 0, transformOrigin: '50% 50%' })
    if (accent) {
      gsap.set(accent, { scale: 0, opacity: 0, transformOrigin: '50% 50%' })
    }

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: finish,
    })

    tl.to(bars, {
      y: 0,
      opacity: 1,
      duration: 0.45,
      stagger: 0.09,
    })

    if (accent) {
      tl.to(
        accent,
        { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.2)' },
        '-=0.2',
      )
    }

    tl.to({}, { duration: 0.35 }).to(mark, {
      opacity: 0,
      scale: 0.92,
      duration: 0.4,
      ease: 'power2.in',
    }).to(
      el,
      { opacity: 0, duration: 0.35, ease: 'power2.inOut' },
      '-=0.15',
    )

    return () => {
      window.clearTimeout(safetyId)
      tl.kill()
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
