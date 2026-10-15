import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getLenis } from '../../hooks/useLenis'
import { useLang } from './i18nCore'
import { C, MONO } from './brand'

/**
 * cāpsula33 — easter egg: tres toques seguidos sobre las vitrinas del local en 3D y aparece una
 * viñeta de historieta con la tripulante del café (y un planeta mordido por la ventana: el
 * devorador de mundos pasó por la vitrina). Ilustración propia; el globo y el rótulo son texto.
 */
const IMG = '/studio/capsula33/egg/comic-1080.webp'

export default function ComicEgg({ open, onClose }) {
  const { t } = useLang()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    getLenis()?.stop()
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      getLenis()?.start()
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('Mientras tanto, en la vitrina C33…')}
      className="c33-egg fixed inset-0 z-[90] grid place-items-center p-5"
      onClick={onClose}
    >
      {/* La estrella de historieta detrás de la viñeta. */}
      <svg aria-hidden="true" viewBox="0 0 200 200" className="c33-egg-burst pointer-events-none absolute h-[min(150vw,860px)] w-[min(150vw,860px)]">
        <polygon
          points={Array.from({ length: 32 }, (_, i) => {
            const a = (i / 32) * Math.PI * 2
            const r = i % 2 ? 62 : 98
            return `${100 + Math.cos(a) * r},${100 + Math.sin(a) * r}`
          }).join(' ')}
          fill="#ffd23f"
          stroke="#111"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>

      <figure className="c33-egg-panel relative w-[min(88vw,440px)]" onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden" style={{ background: '#fff', padding: 7, border: '3px solid #111', boxShadow: '10px 12px 0 #111' }}>
          <img src={IMG} alt={t('Viñeta de historieta: la tripulante del café toma su café; por la ventana, un planeta con un mordiscón')} className="block aspect-[4/5] w-full object-cover" style={{ border: '2px solid #111' }} />

          {/* El rótulo de narrador, abajo a la izquierda (sobre la mesa). */}
          <p
            className="absolute bottom-[14px] left-[14px] max-w-[64%] px-2.5 py-1.5 text-[12.5px] leading-tight font-bold uppercase"
            style={{ ...MONO, background: '#ffd23f', color: '#111', border: '2px solid #111', letterSpacing: '0.02em' }}
          >
            {t('Mientras tanto, en la vitrina C33…')}
          </p>

          {/* El globo de diálogo, en el cielo de arriba, con la cola hacia ella. */}
          <div className="absolute top-[12px] right-[7%] left-[7%]">
            <p
              className="relative rounded-[50%] px-5 py-4 text-center text-[14px] leading-snug font-bold"
              style={{ background: '#fff', color: '#111', border: '2.5px solid #111', fontFamily: "'Comic Neue', 'Chakra Petch', sans-serif" }}
            >
              {t('¿El devorador de mundos? Se comió un planeta y pidió el café para llevar.')}
            </p>
            <svg aria-hidden="true" viewBox="0 0 40 40" className="absolute -bottom-[26px] left-[36%] h-[34px] w-[34px]">
              <path d="M6 0 L30 0 L2 38 Z" fill="#fff" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M7 -2 L29 -2" stroke="#fff" strokeWidth="5" />
            </svg>
          </div>
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t('Cerrar')}
          className="c33-egg-close absolute -top-4 -right-4 grid h-11 w-11 place-items-center rounded-full text-[20px] font-bold"
          style={{ background: C.orange, color: '#111', border: '3px solid #111' }}
        >
          ×
        </button>
        <figcaption className="mt-5 text-center text-[11px] tracking-[0.2em] uppercase" style={{ ...MONO, color: 'rgba(255,255,255,0.75)' }}>
          {t('Encontraste el easter egg de la vitrina')}
        </figcaption>
      </figure>

      <style>{`
        .c33-egg { background: rgba(5,6,10,0.72); backdrop-filter: blur(3px); animation: c33-egg-bg 220ms ease-out both; }
        @keyframes c33-egg-bg { from { opacity: 0; } }
        .c33-egg-burst { animation: c33-egg-burst 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both, c33-egg-spin 40s linear 520ms infinite; }
        @keyframes c33-egg-burst { from { transform: scale(0.2) rotate(-30deg); opacity: 0; } }
        @keyframes c33-egg-spin { to { transform: rotate(360deg); } }
        .c33-egg-panel { animation: c33-egg-pop 460ms cubic-bezier(0.34, 1.56, 0.64, 1) 80ms both; transform: rotate(-2deg); }
        @keyframes c33-egg-pop { from { transform: scale(0.55) rotate(-12deg); opacity: 0; } }
        .c33-egg-close { transition: transform 140ms ease-out; }
        .c33-egg-close:active { transform: scale(0.94); }
        .c33-egg-close:focus-visible { outline: 3px solid #ffd23f; outline-offset: 3px; }
      `}</style>
    </div>,
    document.body,
  )
}
