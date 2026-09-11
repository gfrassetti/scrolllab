import { useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'

const defaultServices = [
  {
    title: 'Sound design',
    body: 'Original scores and sonic identities built to sit under motion, not on top of it.',
  },
  {
    title: 'Motion graphics',
    body: 'Title sequences, kinetic type systems, and the small transitions that make a cut feel intentional.',
  },
  {
    title: 'Brand film',
    body: 'Short-form films that carry a brand’s tone end to end — concept through final mix.',
  },
  {
    title: 'Creative technology',
    body: 'Scroll-driven and interactive builds for launches that need to feel like an event, not a page.',
  },
]

/**
 * ServicesAccordion — expand/collapse list (Dolsten's grid-template-rows
 * mechanic, ported here with the GSAP height:'auto' idiom already used by
 * components/FaqAccordion.jsx, restyled for SIGNAL).
 */
function Row({ item, isOpen, onToggle }) {
  const panelRef = useRef(null)
  const tweenRef = useRef(null)

  const toggle = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    onToggle()
    if (reduced) return

    tweenRef.current?.kill()
    requestAnimationFrame(() => {
      const el = panelRef.current
      if (!el) return
      if (!isOpen) {
        gsap.set(el, { height: 0, opacity: 0 })
        tweenRef.current = gsap.to(el, { height: 'auto', opacity: 1, duration: 0.4, ease: 'power2.out' })
      } else {
        tweenRef.current = gsap.to(el, { height: 0, opacity: 0, duration: 0.32, ease: 'power2.in' })
      }
    })
  }

  return (
    <div className="border-b border-signal-ink/15 py-6">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-6 text-left"
      >
        <span className="font-grotesk text-[clamp(1.2rem,2.4vw,1.7rem)] font-medium tracking-[-0.01em]">
          {item.title}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-2xl text-signal-ink/40 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div ref={panelRef} className="overflow-hidden">
          <p className="max-w-[55ch] pt-4 text-sm leading-relaxed text-signal-ink/65">{item.body}</p>
        </div>
      )}
    </div>
  )
}

export default function ServicesAccordion({ eyebrow = 'Services', items = defaultServices }) {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section className="bg-signal-paper px-5 py-24 text-signal-ink md:px-10 md:py-32">
      <div className="mx-auto max-w-[1000px]">
        <p className="text-[11px] tracking-[0.28em] text-signal-ink/45 uppercase">{eyebrow}</p>
        <div className="mt-10">
          {items.map((item, i) => (
            <Row
              key={item.title}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
