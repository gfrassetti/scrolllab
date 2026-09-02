import { useRef, useState } from 'react'
import { gsap } from '../lib/gsap'

/**
 * Un item: <details> nativo no anima su altura de forma confiable entre
 * navegadores, así que acá el panel es un div medido con GSAP
 * (`height: 'auto'`) — abre/cierra suave y respeta reduced-motion.
 */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const tweenRef = useRef(null)

  const toggle = () => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (reduced) {
      setOpen((v) => !v)
      return
    }

    tweenRef.current?.kill()

    if (!open) {
      setOpen(true)
      requestAnimationFrame(() => {
        const el = panelRef.current
        if (!el) return
        gsap.set(el, { height: 0, opacity: 0 })
        tweenRef.current = gsap.to(el, {
          height: 'auto',
          opacity: 1,
          duration: 0.35,
          ease: 'power2.out',
        })
      })
      return
    }

    const el = panelRef.current
    if (!el) {
      setOpen(false)
      return
    }
    tweenRef.current = gsap.to(el, {
      height: 0,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => setOpen(false),
    })
  }

  return (
    <div className="py-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left text-sm font-medium"
      >
        {q}
        <span
          className={`shrink-0 text-ink/40 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
        >
          +
        </span>
      </button>
      {open && (
        <div ref={panelRef} className="overflow-hidden">
          <p className="mt-2 pb-0.5 text-sm leading-relaxed text-ink/65">
            {a}
          </p>
        </div>
      )}
    </div>
  )
}

export default function FaqAccordion({ items }) {
  return (
    <div className="divide-y divide-ink/10 border-y border-ink/10">
      {items.map((item, i) => (
        <FaqItem key={i} q={item.q} a={item.a} />
      ))}
    </div>
  )
}
