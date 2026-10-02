import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useT } from '../i18n'
import { REDUCED_MOTION_QUERY } from '../lib/motion'
import { isMotionForced, requestMotion } from '../lib/motionOverride'

const CLOSED_KEY = 'scrolllab-motion-notice'

function readClosed() {
  try {
    return sessionStorage.getItem(CLOSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Aviso del market en el home y en las demos, solo si el dispositivo pide
 * menos movimiento: explica que ve la versión calma y ofrece verla completa
 * (o volver). Recarga para que cada sección arme su animación de cero.
 */
export default function MotionNotice() {
  const { pathname } = useLocation()
  const t = useT()
  const [deviceCalm, setDeviceCalm] = useState(
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
  )
  const [closed, setClosed] = useState(readClosed)
  const [visible, setVisible] = useState(false)
  const full = isMotionForced()

  useEffect(() => {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY)
    const onChange = () => setDeviceCalm(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const onHome = pathname === '/'
  const show = deviceCalm && (onHome || pathname.startsWith('/templates/')) && !closed

  useEffect(() => {
    if (!show) return undefined
    const enter = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(enter)
  }, [show])

  if (!show) return null

  const close = () => {
    setClosed(true)
    try {
      sessionStorage.setItem(CLOSED_KEY, '1')
    } catch {
      /* se cierra igual hasta recargar */
    }
  }

  return (
    <aside
      aria-label={t('motionNotice.label')}
      className={`fixed left-5 right-5 z-[60] border ${
        // En el home, en mobile, va arriba de la pastilla de compra (TemplateBuyPill).
        onHome
          ? 'bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))_+_3.75rem)] sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))]'
          : 'bottom-[max(1.25rem,env(safe-area-inset-bottom))]'
      } border border-ink/20 bg-bone p-3 text-ink shadow-[0_18px_55px_rgba(0,0,0,0.2)] transition-opacity sm:right-auto sm:w-[min(23rem,calc(100vw-2.5rem))] ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transitionDuration: 'var(--duration-toast)',
        transitionTimingFunction: 'var(--ease-out)',
      }}
    >
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 pt-1 text-sm leading-snug text-pretty">
          {full ? t('motionNotice.full') : t('motionNotice.calm')}
        </p>
        <button
          type="button"
          onClick={close}
          aria-label={t('common.close')}
          className="-mr-1 -mt-1 grid size-11 shrink-0 place-items-center text-ink/45 transition-colors hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        onClick={() => requestMotion(full ? 'calm' : 'full')}
        className="mt-3 block min-h-11 w-full border border-ink bg-ink px-3 py-3 text-center text-[11px] uppercase tracking-[0.22em] text-bone ui-press hover:border-accent hover:bg-accent"
      >
        {full ? t('motionNotice.showCalm') : t('motionNotice.showFull')}
      </button>
    </aside>
  )
}
