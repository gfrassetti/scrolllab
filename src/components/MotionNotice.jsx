import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useT } from '../i18n'
import {
  canRemember,
  deviceWantsLessMotion,
  markNoticeSeen,
  noticeSeen,
  setMotion,
} from '../lib/motionOverride'

// Donde se ve el movimiento: el home y las demos.
const askable = (pathname) => pathname === '/' || pathname.startsWith('/templates/')

/**
 * Pregunta UNA sola vez, en total, si quien tiene «reducir movimiento» prendido
 * en el dispositivo quiere ver las demos con animaciones. Sale en la primera
 * pantalla donde se pueda ver (el home, o una demo abierta por link directo) y
 * no vuelve: ni al navegar, ni al recargar, ni en otra pestaña. Se marca como
 * visto al mostrarse, aunque lo ignore. Cambiar de idea después: MotionToggle,
 * en el header.
 *
 * - «Dejarlo así» (o Escape) guarda la respuesta y cierra, sin recargar.
 * - «Ver con animaciones» guarda y recarga: cada sección arma su animación al
 *   montarse. No cambia ningún ajuste del dispositivo (src/lib/motionOverride.js).
 */
export default function MotionNotice() {
  const { pathname } = useLocation()
  const t = useT()
  const [state, setState] = useState('idle') // idle → open → done
  const [visible, setVisible] = useState(false)
  const shownOn = useRef(null)

  useEffect(() => {
    if (state === 'idle') {
      if (!askable(pathname)) return
      if (!deviceWantsLessMotion() || noticeSeen() || !canRemember()) return
      shownOn.current = pathname
      markNoticeSeen()
      setState('open')
    } else if (state === 'open' && pathname !== shownOn.current) {
      // Siguió de largo sin responder: se va y no vuelve.
      setState('done')
    }
  }, [pathname, state])

  useEffect(() => {
    if (state !== 'open') return undefined
    const enter = requestAnimationFrame(() => setVisible(true))
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setMotion('calm')
      setState('done')
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(enter)
      window.removeEventListener('keydown', onKey)
    }
  }, [state])

  if (state !== 'open') return null

  // En el home, en mobile, va arriba de la pastilla de compra (TemplateBuyPill).
  const bottom =
    pathname === '/'
      ? 'bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))_+_3.75rem)] sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))]'
      : 'bottom-[max(1.25rem,env(safe-area-inset-bottom))]'

  return (
    <aside
      aria-label={t('motionNotice.label')}
      className={`fixed left-5 right-5 z-[60] border border-ink/20 bg-bone p-4 text-ink shadow-[0_18px_55px_rgba(0,0,0,0.2)] transition-opacity sm:right-auto sm:w-[min(24rem,calc(100vw-2.5rem))] ${bottom} ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transitionDuration: 'var(--duration-toast)',
        transitionTimingFunction: 'var(--ease-out)',
      }}
    >
      <p className="text-sm leading-snug text-pretty">{t('motionNotice.body')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5">
        <button
          type="button"
          onClick={() => setMotion('full')}
          className="min-h-11 border border-ink bg-ink px-4 text-[11px] uppercase tracking-[0.22em] text-bone ui-press hover:border-accent hover:bg-accent"
        >
          {t('motionNotice.showFull')}
        </button>
        <button
          type="button"
          onClick={() => {
            setMotion('calm')
            setState('done')
          }}
          className="min-h-11 text-[11px] uppercase tracking-[0.22em] text-ink/70 underline decoration-ink/30 underline-offset-4 ui-press hover:text-ink hover:decoration-ink"
        >
          {t('motionNotice.keepCalm')}
        </button>
      </div>
    </aside>
  )
}
