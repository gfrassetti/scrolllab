import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import Logo from './Logo'
import { SITE_NAME } from '../lib/site'
import { useT } from '../i18n'

const SESSION_KEY = 'scrolllab-splash-seen'

/**
 * Intro mínima de marca: fondo ink, logo que se apila, wordmark y tagline.
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

    const finish = () => {
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
      const id = window.setTimeout(finish, 350)
      return () => window.clearTimeout(id)
    }

    const bars = gsap.utils.toArray('[data-logo-bar]', el)
    const accent = el.querySelector('[data-logo-accent]')
    const word = el.querySelector('[data-splash-word]')
    const tag = el.querySelector('[data-splash-tag]')
    const panel = el.querySelector('[data-splash-panel]')

    gsap.set(bars, { y: -40, opacity: 0, transformOrigin: '50% 50%' })
    if (accent) {
      gsap.set(accent, { scale: 0, opacity: 0, transformOrigin: '50% 50%' })
    }
    gsap.set([word, tag], { opacity: 0, y: 18 })

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: finish,
    })

    tl.to(bars, {
      y: 0,
      opacity: 1,
      duration: 0.55,
      stagger: 0.1,
    })

    if (accent) {
      tl.to(
        accent,
        { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.2)' },
        '-=0.25',
      )
    }

    tl.to(word, { opacity: 1, y: 0, duration: 0.55 }, '-=0.15')
      .to(tag, { opacity: 1, y: 0, duration: 0.45 }, '-=0.3')
      .to({}, { duration: 0.4 })
      .to(panel, {
        yPercent: -110,
        duration: 0.85,
        ease: 'power4.inOut',
      })

    return () => {
      tl.kill()
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[10000] overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={t('common.loading')}
    >
      <div
        data-splash-panel
        className="flex h-full w-full flex-col justify-between bg-[#0a0a0a] px-5 py-8 text-[#e8e5df] md:px-10 md:py-10"
      >
        <p
          data-splash-tag
          className="text-[11px] uppercase tracking-[0.3em] text-[#e8e5df]/55"
        >
          {t('meta.tagline')}
        </p>

        <div className="flex flex-col items-start gap-6 md:gap-8">
          <span className="inline-block size-14 text-[#e8e5df] md:size-20">
            <Logo className="size-full" />
          </span>
          <h1
            data-splash-word
            className="font-brico text-[clamp(2.8rem,12vw,7.5rem)] leading-[0.85] font-semibold tracking-[-0.04em] uppercase"
          >
            {SITE_NAME}
          </h1>
        </div>

        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e8e5df]/35">
          {t('common.loading')}
        </p>
      </div>
    </div>
  )
}
